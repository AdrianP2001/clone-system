require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const cors = require('cors');
const soap = require('soap');
const forge = require('node-forge');
const SignedXml = require('xml-crypto').SignedXml;
const { DOMParser } = require('xmldom');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const bcrypt = require('bcryptjs');
const path = require('path');
const {
  validateXmlStructure,
  retryWithBackoff,
  saveAuthorizedXml,
  getBackupInfo,
  checkCertificateExpiration,
  parseSriResponse
} = require('./sriHelpers');

const app = express();
const PORT = process.env.PORT || 3001;
const verifyToken = require('./auth/jwt.middleware');
const authController = require('./auth/auth.controller'); // Importamos controlador para ruta manual

// Middleware de seguridad
app.use(helmet());
app.use(morgan('combined'));

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de requests
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.'
});
app.use('/api/sri/', limiter);

// Ruta manual para Login de Clientes (Portal)
// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================
app.post('/api/login', authController.login);
app.post('/api/register', authController.register); // Ruta pública de registro
app.post('/api/forgot-password', authController.forgotPassword);
app.post('/api/reset-password', authController.resetPassword);
app.post('/api/auth/client/login', authController.clientLogin);
app.post('/api/auth/client/forgot-password', authController.clientForgotPassword);
app.post('/api/auth/client/change-password', authController.changeClientPassword);
app.post('/api/client/change-password', authController.changeClientPassword);

// Rutas de Perfil de Usuario (Self-Service)
app.put('/api/user/profile', verifyToken, authController.updateUserProfile);
app.put('/api/user/password', verifyToken, authController.changeUserPassword);

// Middleware de autenticación (opcional para producción)
const authenticate = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado - API Key inválida'
      });
    }
  }
  next();
};

// Middleware para verificar roles (RBAC)
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Acceso denegado. No tienes permisos suficientes.'
      });
    }
    next();
  };
};

// Endpoints del SRI
const SRI_ENDPOINTS = {
  TEST: {
    RECEPCION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  },
  PROD: {
    RECEPCION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    AUTORIZACION: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
  }
};

// ============================================
// ENDPOINT: Firmar XML con certificado .p12
// ============================================
app.post('/api/sri/sign-xml', authenticate, async (req, res) => {
  try {
    const { xml, p12Base64, password, isProduction } = req.body;

    if (!xml || !p12Base64 || !password) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: xml, p12Base64, password'
      });
    }

    console.log('📝 Firmando XML con certificado digital...');

    // ============================================
    // VALIDACIÓN PREVIA DEL XML
    // ============================================
    console.log('🔍 Validando estructura del XML...');
    const validation = validateXmlStructure(xml);

    if (!validation.valid) {
      console.error('❌ Errores de validación:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'XML inválido',
        validationErrors: validation.errors
      });
    }

    console.log('✅ XML validado correctamente');

    // Decodificar certificado .p12
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer certificado y clave privada
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    if (!certBags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
      throw new Error('No se pudo extraer el certificado o clave privada del archivo .p12');
    }

    const certificate = certBags[forge.pki.oids.certBag][0].cert;
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    if (!certificate || !privateKey) {
      throw new Error('Certificado o clave privada inválidos');
    }

    // ============================================
    // VALIDACIÓN DE VIGENCIA DEL CERTIFICADO
    // ============================================
    const certStatus = checkCertificateExpiration(certificate);
    console.log(certStatus.message);

    if (certStatus.isExpired) {
      // LÓGICA DE MODO: Producción vs Demo
      if (isProduction) {
        return res.status(400).json({
          success: false,
          error: `⛔ ERROR PRODUCCIÓN: ${certStatus.message}. Debe usar un certificado vigente para facturar legalmente.`,
          certificateInfo: certStatus
        });
      } else {
        console.warn('⚠️ [SIMULACIÓN] Permitiendo certificado expirado en modo DEMO para pruebas.');
      }
    }

    // Alerta si está por vencer
    if (certStatus.shouldAlert) {
      console.warn(`⚠️ ${certStatus.message}`);
    }

    // ============================================
    // CANONICALIZACIÓN C14N (XML Canonical 1.0)
    // ============================================
    // Parsear el XML para trabajar con el DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    // Verificar errores de parseo
    const parserErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      throw new Error('XML mal formado: ' + parserErrors[0].textContent);
    }

    // Obtener el elemento raíz (factura o notaCredito)
    const rootElement = xmlDoc.documentElement;
    if (!rootElement || (rootElement.nodeName !== 'factura' && rootElement.nodeName !== 'notaCredito')) {
      throw new Error('No se encontró elemento factura o notaCredito en el XML');
    }

    // CRÍTICO: Asegurar que el elemento raíz tenga id="comprobante"
    if (!rootElement.getAttribute('id')) {
      rootElement.setAttribute('id', 'comprobante');
      console.log('✓ Atributo id="comprobante" agregado al elemento raíz');
    }

    // Configuración de canonicalización C14N
    const c14nAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    // Crear instancia de SignedXml con canonicalizationAlgorithm
    const sig = new SignedXml();
    sig.canonicalizationAlgorithm = c14nAlgorithm;

    // Canonicalizar el elemento raíz usando xml-crypto
    const elementToSign = sig.getCanonXml([c14nAlgorithm], rootElement);

    // Calcular digest SHA1 del elemento canonicalizado
    const md = forge.md.sha1.create();
    md.update(elementToSign, 'utf8');
    const digestValue = forge.util.encode64(md.digest().getBytes());

    console.log('🔐 Digest calculado:', digestValue.substring(0, 20) + '...');

    // ============================================
    // CALCULAR DIGEST DEL CERTIFICADO (XAdES-BES)
    // ============================================
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    const mdCert = forge.md.sha1.create();
    mdCert.update(certDer, 'raw');
    const certDigestValue = forge.util.encode64(mdCert.digest().getBytes());

    console.log('📜 Certificado digest:', certDigestValue.substring(0, 20) + '...');

    // ============================================
    // CONSTRUIR XAdES-BES COMPLETO
    // ============================================
    const signingTime = new Date().toISOString();

    // Formato correcto del IssuerName según RFC 2253
    // El SRI requiere que los atributos estén invertidos según RFC 2253
    // Log de debug para atributos
    console.log('📜 Atributos del Emisor (Raw):', JSON.stringify(certificate.issuer.attributes.map(a => ({
      name: a.name,
      type: a.type,
      value: a.value
    })), null, 2));

    // Función auxiliar para escapar caracteres especiales según RFC 2253
    const escapeAttributeValue = (value) => {
      // Caracteres que deben escaparse: , + " \ < > ; (y espacio al inicio/final)
      if (!value) return '';
      return value.replace(/([,+"\\<>;])/g, '\\$1')
        .replace(/^ /, '\\ ')
        .replace(/ $/, '\\ ');
    };

    // CORRECCIÓN: Usar .reverse() para cumplir con RFC 2253 que exige el SRI
    // Mapa de OIDs a nombres cortos estándar
    const oidMap = {
      '2.5.4.3': 'CN',
      '2.5.4.6': 'C',
      '2.5.4.7': 'L',
      '2.5.4.8': 'ST',
      '2.5.4.10': 'O',
      '2.5.4.11': 'OU',
      '2.5.4.97': 'organizationIdentifier', // Usar nombre completo para este OID si el SRI lo soporta
      '2.5.4.5': 'serialNumber',
      '2.5.4.4': 'SN',
      '2.5.4.42': 'GN'
    };

    // CRÍTICO: RFC 4514 format (no spaces after commas, specific OID format)
    const issuerName = certificate.issuer.attributes
      .slice() // Crear copia
      .reverse() // Invertir para RFC 4514
      .map(a => {
        // Para OID 2.5.4.97, usar formato "OID.2.5.4.97" según estándar
        let name;
        if (a.type === '2.5.4.97') {
          name = 'OID.2.5.4.97';
        } else {
          name = oidMap[a.type] || a.shortName || a.name || a.type;
        }
        const value = escapeAttributeValue(a.value);
        return `${name}=${value}`;
      })
      .join(','); // SIN espacios después de comas (RFC 4514)

    console.log('🔑 IssuerName generado (RFC 4514):', issuerName);

    // CORRECCIÓN CRÍTICA: Convertir el serial number de hexadecimal a decimal
    // El SRI exige formato decimal, pero node-forge lo devuelve en hexadecimal
    const serialNumberDecimal = BigInt('0x' + certificate.serialNumber).toString();
    console.log('🔢 Serial Number (decimal):', serialNumberDecimal);

    // SignedProperties (XAdES-BES)
    const signedPropertiesId = 'SignatureID-SignedProperties';
    const signedPropertiesXml = `<etsi:SignedProperties xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signedPropertiesId}"><etsi:SignedSignatureProperties><etsi:SigningTime>${signingTime}</etsi:SigningTime><etsi:SigningCertificate><etsi:Cert><etsi:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${certDigestValue}</ds:DigestValue></etsi:CertDigest><etsi:IssuerSerial><ds:X509IssuerName>${issuerName}</ds:X509IssuerName><ds:X509SerialNumber>${serialNumberDecimal}</ds:X509SerialNumber></etsi:IssuerSerial></etsi:Cert></etsi:SigningCertificate></etsi:SignedSignatureProperties></etsi:SignedProperties>`;

    // Parsear SignedProperties y canonicalizarlo
    const signedPropsDoc = parser.parseFromString(signedPropertiesXml, 'text/xml');
    const signedPropsElement = signedPropsDoc.documentElement;
    const canonicalSignedProps = sig.getCanonXml([c14nAlgorithm], signedPropsElement);

    // Calcular digest de SignedProperties canonicalizado
    const mdProps = forge.md.sha1.create();
    mdProps.update(canonicalSignedProps, 'utf8');
    const signedPropsDigest = forge.util.encode64(mdProps.digest().getBytes());

    console.log('📋 SignedProperties digest:', signedPropsDigest.substring(0, 20) + '...');

    // SignedInfo con DOS referencias: comprobante + SignedProperties
    const signedInfoXml = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><ds:Reference URI="#comprobante"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${digestValue}</ds:DigestValue></ds:Reference><ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropertiesId}"><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>${signedPropsDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;

    // Parsear SignedInfo y canonicalizarlo para firmar
    const signedInfoDoc = parser.parseFromString(signedInfoXml, 'text/xml');
    const signedInfoElement = signedInfoDoc.documentElement;
    const canonicalSignedInfo = sig.getCanonXml([c14nAlgorithm], signedInfoElement);

    // Firmar SignedInfo canonicalizado con RSA-SHA1
    const mdSigned = forge.md.sha1.create();
    mdSigned.update(canonicalSignedInfo, 'utf8');
    const signature = privateKey.sign(mdSigned);
    const signatureValue = forge.util.encode64(signature);

    console.log('✍️ Firma generada:', signatureValue.substring(0, 20) + '...');

    // ============================================
    // ESTRUCTURA XAdES-BES COMPLETA
    // ============================================
    // IMPORTANTE: Usar las versiones ORIGINALES en el XML final
    // (Ya firmamos las versiones canonicalizadas, pero el SRI espera el formato original)
    const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="Signature">
${signedInfoXml}
<ds:SignatureValue Id="SignatureValue">
${signatureValue}
</ds:SignatureValue>
<ds:KeyInfo Id="Certificate">
<ds:X509Data>
<ds:X509Certificate>
${certBase64}
</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>
<ds:Object Id="Signature-Object"><etsi:QualifyingProperties Target="#Signature">${signedPropertiesXml}</etsi:QualifyingProperties></ds:Object>
</ds:Signature>`;

    // Serializar el DOM actualizado (con id="comprobante" agregado)
    const { XMLSerializer } = require('xmldom');
    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(xmlDoc);

    // Asegurar declaración XML
    if (!xmlString.startsWith('<?xml')) {
      xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
    }

    // Insertar firma en el XML actualizado
    const signedXml = xmlString.replace(/<\/(factura|notaCredito)>/, `${signatureBlock}</$1>`);

    console.log('✅ XML firmado correctamente');

    res.json({
      success: true,
      signedXml,
      certificateInfo: {
        subject: certificate.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        issuer: certificate.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
        validFrom: certificate.validity.notBefore.toLocaleDateString(),
        validTo: certificate.validity.notAfter.toLocaleDateString(),
        serialNumber: certificate.serialNumber,
        daysUntilExpiration: certStatus.daysUntilExpiration,
        status: certStatus.severity
      }
    });

  } catch (error) {
    console.error('❌ Error al firmar XML:', error.message);
    res.status(500).json({
      success: false,
      error: error.message.includes('Invalid password')
        ? 'Contraseña del certificado incorrecta'
        : `Error al firmar XML: ${error.message}`
    });
  }
});

// ============================================
// ENDPOINT: Enviar comprobante a Recepción SRI
// ============================================
app.post('/api/sri/recepcion', authenticate, async (req, res) => {
  try {
    const { xmlSigned, isProduction } = req.body;

    if (!xmlSigned) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: xmlSigned'
      });
    }

    const endpoint = isProduction
      ? SRI_ENDPOINTS.PROD.RECEPCION
      : SRI_ENDPOINTS.TEST.RECEPCION;

    console.log(`📡 Conectando a Recepción SRI (${isProduction ? 'PRODUCCIÓN REAL' : 'SIMULACIÓN/PRUEBAS'})...`);
    console.log(` Endpoint: ${endpoint}`);

    // ============================================
    // USAR RETRY LOGIC CON BACKOFF EXPONENCIAL
    // ============================================
    const result = await retryWithBackoff(async () => {
      // Crear cliente SOAP
      const client = await soap.createClientAsync(endpoint, {
        wsdl_options: {
          timeout: 30000,
          rejectUnauthorized: false
        }
      });

      // Codificar XML a Base64
      const xmlBase64 = Buffer.from(xmlSigned, 'utf-8').toString('base64');

      console.log('📤 Enviando comprobante al SRI...');

      // Llamar método validarComprobante
      const soapResult = await client.validarComprobanteAsync({
        xml: xmlBase64
      });

      return soapResult;
    }, 3, 2000); // 3 reintentos, delay inicial 2 segundos

    const respuesta = result[0]?.RespuestaRecepcionComprobante;

    if (!respuesta) {
      throw new Error('Respuesta vacía del servicio de Recepción del SRI');
    }

    console.log('📦 Respuesta del SRI:', JSON.stringify(respuesta, null, 2));

    // Parsear respuesta usando helper
    const parsed = parseSriResponse(respuesta, 'recepcion');

    console.log(`📋 Estado: ${parsed.estado}`);

    if (parsed.success) {
      console.log('✅ Comprobante RECIBIDO por el SRI');
      res.json({
        success: true,
        estado: parsed.estado,
        claveAcceso: parsed.data.claveAcceso,
        mensaje: 'Comprobante recibido correctamente por el SRI',
        comprobantes: parsed.data.comprobantes
      });
    } else {
      console.log('⚠️ Comprobante rechazado:', parsed.mensajes);

      res.status(400).json({
        success: false,
        estado: parsed.estado,
        errores: parsed.mensajes,
        mensaje: parsed.mensajes[0]?.mensaje || 'El comprobante fue rechazado por el SRI'
      });
    }

  } catch (error) {
    console.error('❌ Error en Recepción:', error.message);
    res.status(500).json({
      success: false,
      error: `Error al enviar a Recepción: ${error.message}`
    });
  }
});

// ============================================
// ENDPOINT: Consultar autorización en el SRI
// ============================================
app.post('/api/sri/autorizacion', authenticate, async (req, res) => {
  try {
    const { claveAcceso, isProduction } = req.body;

    if (!claveAcceso) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro requerido: claveAcceso'
      });
    }

    const endpoint = isProduction
      ? SRI_ENDPOINTS.PROD.AUTORIZACION
      : SRI_ENDPOINTS.TEST.AUTORIZACION;

    console.log(`🔍 Consultando autorización: ${claveAcceso.substring(0, 15)}... (${isProduction ? 'PRODUCCIÓN REAL' : 'SIMULACIÓN/PRUEBAS'})`);
    console.log(`🔗 Endpoint: ${endpoint}`);

    // ============================================
    // USAR RETRY LOGIC PARA CONSULTAR AUTORIZACIÓN
    // ============================================
    const result = await retryWithBackoff(async () => {
      // Crear cliente SOAP
      const client = await soap.createClientAsync(endpoint, {
        wsdl_options: {
          timeout: 30000,
          rejectUnauthorized: false
        }
      });

      // Esperar un momento (el SRI necesita procesar)
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📋 Consultando estado de autorización...');

      // Llamar método autorizacionComprobante
      const soapResult = await client.autorizacionComprobanteAsync({
        claveAccesoComprobante: claveAcceso
      });

      return soapResult;
    }, 5, 3000); // 5 reintentos, delay inicial 3 segundos

    console.log('📦 Respuesta Autorización:', JSON.stringify(result, null, 2));

    const respuesta = result[0]?.RespuestaAutorizacionComprobante;

    if (!respuesta) {
      console.log('⚠️ Sin respuesta de autorización');
      return res.json({
        success: false,
        estado: 'EN_PROCESAMIENTO',
        mensaje: 'El comprobante está siendo procesado por el SRI. Intente nuevamente en unos segundos.'
      });
    }

    // Parsear respuesta usando helper
    const parsed = parseSriResponse(respuesta, 'autorizacion');

    console.log(`📋 Estado: ${parsed.estado}`);

    if (parsed.success) {
      console.log('✅ Comprobante AUTORIZADO por el SRI');

      // ============================================
      // GUARDAR BACKUP DEL XML AUTORIZADO
      // ============================================
      if (parsed.data.comprobante && parsed.data.numeroAutorizacion) {
        const backupPath = saveAuthorizedXml(
          claveAcceso,
          parsed.data.comprobante,
          parsed.data.numeroAutorizacion
        );

        if (backupPath) {
          console.log(`💾 Backup guardado en: ${backupPath}`);
        }
      }

      res.json({
        success: true,
        estado: parsed.estado,
        numeroAutorizacion: parsed.data.numeroAutorizacion,
        fechaAutorizacion: parsed.data.fechaAutorizacion,
        ambiente: parsed.data.ambiente,
        comprobante: parsed.data.comprobante,
        mensaje: 'Comprobante autorizado exitosamente por el SRI'
      });

    } else if (parsed.estado === 'NO AUTORIZADO') {
      console.log('❌ Comprobante NO AUTORIZADO:', parsed.mensajes);

      res.status(400).json({
        success: false,
        estado: parsed.estado,
        errores: parsed.mensajes,
        mensaje: 'El comprobante NO fue autorizado por el SRI'
      });

    } else if (parsed.estado === 'EN_PROCESAMIENTO') {
      res.json({
        success: false,
        estado: parsed.estado,
        mensaje: parsed.data.mensaje
      });

    } else {
      res.json({
        success: false,
        estado: parsed.estado,
        mensajes: parsed.mensajes,
        mensaje: 'Estado desconocido del comprobante'
      });
    }

  } catch (error) {
    console.error('❌ Error en Autorización:', error.message);
    res.status(500).json({
      success: false,
      error: `Error al consultar autorización: ${error.message}`
    });
  }
});

// ============================================
// ENDPOINT: Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Proxy SRI funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================
// ENDPOINT: Información de backups
// ============================================
app.get('/api/backups/info', authenticate, (req, res) => {
  try {
    const backupInfo = getBackupInfo();

    res.json({
      success: true,
      backups: backupInfo,
      message: `${backupInfo.totalFiles} XMLs guardados (${backupInfo.totalSizeMB} MB)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ENDPOINT: Información del servidor
// ============================================
app.get('/api/info', (req, res) => {
  res.json({
    name: 'SRI Proxy Server - Ecuafact Pro',
    version: '2.0.0',
    description: 'Backend proxy para conectar con el SRI de Ecuador',
    features: [
      '✅ Firma digital XAdES-BES completa',
      '✅ Validación de XML antes de firmar',
      '✅ Canonicalización C14N mejorada',
      '✅ Retry logic con backoff exponencial',
      '✅ Sistema de backup de XMLs autorizados',
      '✅ Monitoreo de expiración de certificados',
      '✅ Rate limiting y seguridad'
    ],
    endpoints: {
      signXml: 'POST /api/sri/sign-xml',
      recepcion: 'POST /api/sri/recepcion',
      autorizacion: 'POST /api/sri/autorizacion',
      backupInfo: 'GET /api/backups/info',
      health: 'GET /health',
      info: 'GET /api/info'
    },
    sriEndpoints: SRI_ENDPOINTS,
    compliance: {
      xadesbes: 'Implementado',
      validation: 'Implementado',
      backup: 'Implementado (7 años)',
      retry: 'Implementado (5 reintentos)',
      monitoring: 'Implementado'
    }
  });
});

// ============================================
// ENDPOINTS: NOTIFICACIONES (DEBEN ESTAR ANTES DE app.listen)
// ============================================

// Enviar Email con RIDE
app.post('/api/notifications/send-email', authenticate, async (req, res) => {
  try {
    const { to, subject, message, html, rideBase64, documentNumber, settings, attachments } = req.body;

    if (!to || !settings) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: to, settings'
      });
    }

    console.log(`📧 Enviando email a ${to}...`);
    console.log(`📦 Attachments recibidos: ${attachments ? attachments.length : 0}`);
    if (attachments && attachments.length > 0) {
      attachments.forEach((att, idx) => {
        const contentLength = att.content ? att.content.length : 0;
        console.log(`   Attachment ${idx + 1}: ${att.filename} - ${contentLength} caracteres base64 (~${Math.round(contentLength / 1024)} KB)`);
      });
    }

    const emailHtml = html || `<p>${message || 'Adjunto encontrará su comprobante electrónico'}</p>`;
    const emailText = message || 'Adjunto encontrará su comprobante electrónico';

    // Verificar qué provider usar
    if (settings.emailProvider === 'sendgrid' && settings.sendgridApiKey) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(settings.sendgridApiKey);

      const mailData = {
        to,
        from: settings.senderEmail || 'noreply@ecuafact.com',
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };

      if (rideBase64 && documentNumber) {
        mailData.attachments = [{
          content: rideBase64,
          filename: `RIDE_${documentNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }];
      }

      if (attachments && Array.isArray(attachments)) {
        if (!mailData.attachments) mailData.attachments = [];
        attachments.forEach(att => {
          // SendGrid necesita el contenido en base64 puro (sin prefijos)
          const cleanBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
          mailData.attachments.push({
            content: cleanBase64,
            filename: att.filename,
            type: att.type || 'application/octet-stream',
            disposition: 'attachment'
          });
          console.log(`   ✅ Adjuntado ${att.filename} (${cleanBase64.length} chars)`);
        });
      }

      await sgMail.send(mailData);
      console.log('✅ Email enviado con SendGrid');

      return res.json({
        success: true,
        message: 'Email enviado exitosamente',
        provider: 'sendgrid'
      });

    } else if (settings.emailProvider === 'mailgun' && settings.mailgunApiKey && settings.mailgunDomain) {
      const formData = require('form-data');
      const Mailgun = require('mailgun.js');
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: 'api', key: settings.mailgunApiKey });

      const mailData = {
        from: settings.senderEmail || 'noreply@ecuafact.com',
        to,
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };

      if (rideBase64 && documentNumber) {
        mailData.attachment = [{
          data: Buffer.from(rideBase64, 'base64'),
          filename: `RIDE_${documentNumber}.pdf`
        }];
      }

      if (attachments && Array.isArray(attachments)) {
        if (!mailData.attachment) mailData.attachment = [];
        attachments.forEach(att => {
          // Limpiar el base64 de cualquier prefijo
          const cleanBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          mailData.attachment.push({
            data: buffer,
            filename: att.filename
          });
          console.log(`   ✅ Adjuntado ${att.filename} (${buffer.length} bytes)`);
        });
      }

      await mg.messages.create(settings.mailgunDomain, mailData);
      console.log('✅ Email enviado con Mailgun');

      return res.json({
        success: true,
        message: 'Email enviado exitosamente',
        provider: 'mailgun'
      });

    } else {
      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransport({
        host: settings.smtpHost || 'smtp.gmail.com',
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPassword
        }
      });

      const mailOptions = {
        from: settings.senderEmail || settings.smtpUser,
        to,
        subject: subject || 'Comprobante Electrónico Autorizado',
        text: emailText,
        html: emailHtml,
      };

      if (rideBase64 && documentNumber) {
        mailOptions.attachments = [{
          filename: `RIDE_${documentNumber}.pdf`,
          content: rideBase64,
          encoding: 'base64'
        }];
      }

      if (attachments && Array.isArray(attachments)) {
        if (!mailOptions.attachments) mailOptions.attachments = [];
        attachments.forEach(att => {
          // Limpiar el base64 de cualquier prefijo
          const cleanBase64 = att.content.replace(/^data:[^;]+;base64,/, '');
          mailOptions.attachments.push({
            filename: att.filename,
            content: cleanBase64,
            encoding: 'base64'
          });
          console.log(`   ✅ Adjuntado ${att.filename} (${cleanBase64.length} chars base64)`);
        });
      }

      await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado con SMTP');

      return res.json({
        success: true,
        message: 'Email enviado exitosamente',
        provider: 'smtp'
      });
    }

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar email'
    });
  }
});

// backend/server.js

// ============================================
// RUTAS DE ADMINISTRACIÓN (SUPERADMIN)
// ============================================

// 1. Crear Nueva Empresa (Tenant)
app.post('/api/admin/businesses', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { name, ruc, email, address, phone, plan, features, subscriptionEnd, password } = req.body;

    // Validaciones previas
    const existing = await prisma.business.findUnique({ where: { ruc } });
    if (existing) return res.status(400).json({ message: 'La empresa ya existe con este RUC' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'El correo electrónico ya está registrado por un usuario.' });

    // Transacción: Empresa + Secuenciales + Usuario Admin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Empresa
      const newBusiness = await tx.business.create({
        data: {
          name,
          ruc,
          email,
          address,
          phone,
          plan: plan || 'BASIC',
          features: features || { inventory: true, accounting: false, billing: true }, // Permisos por defecto
          subscriptionStart: new Date(),
          subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 mes por defecto
          subscriptionStatus: 'ACTIVE',
          isActive: true,
          establishmentCode: '001',
          emissionPointCode: '001',
          isAccountingObliged: false
        }
      });

      // 2. Crear Secuenciales
      await tx.sequence.create({
        data: {
          type: '01', // Factura
          establishmentCode: '001',
          emissionPointCode: '001',
          currentValue: 1,
          businessId: newBusiness.id
        }
      });

      // 3. Crear Usuario Admin
      const hashedPassword = await bcrypt.hash(password || ruc, 10); // Si no hay pass, usa el RUC
      await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN',
          businessId: String(newBusiness.id)
        }
      });

      return newBusiness;
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 1.2 Obtener empresas con suscripciones por vencer (Superadmin)
app.get('/api/admin/subscriptions/expiring', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30; // Default 30 días
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const expiringBusinesses = await prisma.business.findMany({
      where: {
        subscriptionEnd: {
          gte: today,
          lte: futureDate
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        ruc: true,
        email: true,
        plan: true,
        subscriptionEnd: true,
        subscriptionStatus: true
      },
      orderBy: { subscriptionEnd: 'asc' }
    });

    res.json(expiringBusinesses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 1.3 Listar todas las empresas (Para dropdown de creación de usuarios)
app.get('/api/admin/businesses', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      select: { id: true, name: true, ruc: true },
      orderBy: { name: 'asc' }
    });
    res.json(businesses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 1.1 Actualizar Empresa y Permisos (Superadmin)
app.put('/api/admin/businesses/:id', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { features, isActive, plan, subscriptionEnd, subscriptionStatus, ...data } = req.body;

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        ...data,
        features, // Actualizar objeto de permisos/features
        isActive,
        plan,
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : undefined,
        subscriptionStatus
      }
    });
    res.json(updatedBusiness);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Crear Usuario Administrador para una Empresa
app.post('/api/admin/users', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { email, password, businessId, role } = req.body;

    // 1. Validación básica
    if (!email || !password) {
      return res.status(400).json({ message: 'El correo y la contraseña son obligatorios.' });
    }

    console.log(`👤 Creando usuario: ${email} | Rol: ${role} | BusinessID: ${businessId}`);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe con este correo.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Validación de lógica de negocio
    let finalBusinessId = businessId;
    if (role === 'SUPERADMIN') {
      // Los nuevos Superadmins heredan la empresa del creador (o null si es legacy)
      finalBusinessId = req.user.businessId;
    } else if (!businessId) {
      return res.status(400).json({ message: 'Se requiere asignar una empresa para usuarios ADMIN.' });
    }

    // Asegurar que sea String o Null (Prisma espera String para User.businessId)
    const businessIdValue = finalBusinessId ? String(finalBusinessId) : null;

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'ADMIN', // Por defecto ADMIN de empresa
        businessId: businessIdValue // Vinculación a la empresa creada
      }
    });

    console.log(`✅ Usuario creado exitosamente: ID ${newUser.id}`);

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, businessId: newUser.businessId } });
  } catch (e) {
    console.error('❌ Error al crear usuario:', e);
    // Devolver 'message' para que el frontend lo muestre correctamente
    res.status(500).json({ message: e.message || 'Error interno del servidor', error: e.message });
  }
});

// 3. Listar todos los usuarios del sistema (Superadmin)
app.get('/api/admin/users', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ruc: true,
            subscriptionEnd: true,
            subscriptionStatus: true
          }
        }
      },
      orderBy: { email: 'asc' }
    });

    // Sanitizar passwords antes de enviar
    const safeUsers = users.map(u => {
      const { password, ...userWithoutPass } = u;
      return userWithoutPass;
    });

    res.json(safeUsers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 7. Eliminar Usuario (Superadmin)
app.delete('/api/admin/users/:id', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(id);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Protección para el Superadmin principal
    if (user.email === 'superadmin@admin.com') {
      return res.status(403).json({ message: 'No se puede eliminar al Superadmin principal.' });
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'Usuario eliminada correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reset Password (Superadmin)
app.post('/api/admin/users/:id/reset-password', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    if (!temporaryPassword) return res.status(400).json({ message: 'Se requiere una contraseña temporal.' });

    // Guardar como texto plano para activar requirePasswordChange
    await prisma.user.update({ where: { id }, data: { password: temporaryPassword } });

    res.json({ success: true, message: 'Contraseña restablecida.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 8. Eliminar Empresa (Superadmin)
app.delete('/api/admin/businesses/:id', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const business = await prisma.business.findUnique({ where: { id: String(id) } });

    if (!business) return res.status(404).json({ message: 'Empresa no encontrada' });

    if (business.ruc === '9999999999999') {
      return res.status(403).json({ message: 'No se puede eliminar la Empresa SaaS Global.' });
    }

    // Eliminar usuarios asociados primero para mantener integridad (si no hay cascade)
    // También eliminamos otros registros dependientes para evitar errores de FK
    await prisma.sequence.deleteMany({ where: { businessId: String(id) } });
    await prisma.client.deleteMany({ where: { businessId: String(id) } });
    await prisma.product.deleteMany({ where: { businessId: String(id) } });
    // Finalmente usuarios y la empresa
    await prisma.user.deleteMany({ where: { businessId: String(id) } });
    await prisma.business.delete({ where: { id: String(id) } });

    res.json({ success: true, message: 'Empresa y sus usuarios eliminados correctamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Modificar tiempo de suscripción (Superadmin)
// Permite sumar o restar días enviando { days: 30 } o { days: -7 }
app.post('/api/admin/businesses/:id/subscription', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body; // Días a sumar (positivo) o restar (negativo)

    if (days === undefined || typeof days !== 'number') {
      return res.status(400).json({ message: 'Se requiere el campo "days" como número.' });
    }

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) return res.status(404).json({ message: 'Empresa no encontrada' });

    // Calcular nueva fecha
    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : new Date();

    // Lógica inteligente: Si la suscripción ya venció y estamos agregando tiempo, 
    // reiniciamos el conteo desde HOY para no cobrar tiempo muerto.
    if (days > 0 && currentEnd < new Date()) {
      currentEnd = new Date();
    }

    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: {
        subscriptionEnd: newEnd,
        subscriptionStatus: newEnd > new Date() ? 'ACTIVE' : 'EXPIRED'
      }
    });

    res.json({
      success: true,
      message: `Suscripción actualizada. Nueva fecha: ${newEnd.toLocaleDateString()}`,
      business: updatedBusiness
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// NUEVAS RUTAS PARA EL MÓDULO DE GESTIÓN (Usuarios y Suscripciones)
// ============================================

// 5. Obtener lista completa de usuarios con estado de empresa
app.get('/api/users', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
            ruc: true,
            email: true,
            plan: true,
            isActive: true,
            subscriptionEnd: true
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error interno al obtener usuarios' });
  }
});

// 6. Agregar tiempo a la suscripción de una empresa
app.post('/api/subscriptions/add-time', verifyToken, checkRole(['SUPERADMIN']), async (req, res) => {
  try {
    const { businessId, months } = req.body;
    console.log(`⏳ Actualizando suscripción: Empresa ${businessId}, Meses: ${months}`);

    if (!businessId || months === undefined || months === null) {
      return res.status(400).json({ message: 'Se requiere el ID de la empresa y la cantidad de meses (puede ser 0 o negativo).' });
    }

    const business = await prisma.business.findUnique({
      where: { id: String(businessId) }
    });

    if (!business) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    // Calcular la nueva fecha de vencimiento
    const now = new Date();
    let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : now;
    const monthsInt = parseInt(months);

    // Lógica inteligente:
    // Si agregamos tiempo (+), y estaba vencida, reiniciamos desde HOY.
    // Si quitamos tiempo (-), respetamos la fecha actual para recortarla.
    if (monthsInt > 0 && currentEnd < now) {
      currentEnd = now;
    }

    // Sumar los meses
    const newEndDate = new Date(currentEnd);
    newEndDate.setMonth(newEndDate.getMonth() + monthsInt);

    // Determinar estado activo automáticamente
    const isActive = newEndDate > now;

    const updatedBusiness = await prisma.business.update({
      where: { id: String(businessId) },
      data: {
        subscriptionEnd: newEndDate,
        isActive: isActive
      }
    });

    res.json({
      success: true,
      message: 'Suscripción actualizada correctamente.',
      subscriptionEnd: updatedBusiness.subscriptionEnd,
      isActive: updatedBusiness.isActive
    });

  } catch (error) {
    console.error('Error al agregar suscripción:', error);
    res.status(500).json({ message: 'Error interno al actualizar la suscripción' });
  }
});

// ============================================
// GESTIÓN DE USUARIOS DE LA EMPRESA (TENANT)
// ============================================

// Listar usuarios de la empresa actual
app.get('/api/business/users', verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { businessId: req.user.businessId },
      select: { id: true, email: true, role: true, name: true, isActive: true }
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Crear usuario para la empresa actual
app.post('/api/business/users', verifyToken, async (req, res) => {
  try {
    const { email, password, role, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'USER', // Default role
        businessId: req.user.businessId,
        name: name || undefined,
        isActive: true // Por defecto activo
      }
    });

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, isActive: true } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Eliminar usuario de la empresa
app.delete('/api/business/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario pertenezca a la misma empresa
    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (!userToDelete || userToDelete.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (userToDelete.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reset Password (Company Admin)
app.post('/api/business/users/:id/reset-password', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    if (!temporaryPassword) return res.status(400).json({ message: 'Se requiere una contraseña temporal.' });

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate || userToUpdate.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Guardar como texto plano para activar requirePasswordChange en el próximo login
    await prisma.user.update({ where: { id }, data: { password: temporaryPassword } });

    res.json({ success: true, message: 'Contraseña restablecida. El usuario deberá cambiarla al ingresar.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle estado de usuario (Activar/Desactivar)
app.put('/api/business/users/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Verificar que el usuario pertenezca a la misma empresa
    const userToUpdate = await prisma.user.findUnique({ where: { id } });

    if (!userToUpdate || userToUpdate.businessId !== req.user.businessId) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (userToUpdate.id === req.user.id) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive }
    });

    res.json({ success: true, user: updatedUser });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- RUTAS DE NEGOCIO (PERFIL EMPRESA) ---
app.get('/api/business', verifyToken, async (req, res) => {
  try {
    // 1. Manejo de compatibilidad: SUPERADMIN sin empresa asignada
    if (req.user.role === 'SUPERADMIN' && !req.user.businessId) {
      return res.json({
        id: 0,
        name: 'PANEL DE ADMINISTRACIÓN',
        ruc: '9999999999999',
        email: req.user.email,
        address: 'Nube - Servidor Central',
        phone: '0999999999',
        isActive: true,
        isProduction: false, // Por defecto en modo pruebas para evitar exigir firma
        themeColor: '#1e293b'
      });
    }

    // 2. Validación normal para usuarios mortales
    if (!req.user.businessId) {
      return res.status(400).json({ message: 'Error crítico: Usuario sin empresa asignada' });
    }

    // 3. Búsqueda normal en la Base de Datos
    console.log(`🔍 Buscando empresa ID: ${req.user.businessId}`);
    const business = await prisma.business.findUnique({
      where: { id: String(req.user.businessId) }
    });

    if (!business) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    res.json(business);
  } catch (e) {
    console.error('Error en /api/business:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/business', verifyToken, async (req, res) => {
  try {
    // SAAS: Actualizamos SOLO la empresa del usuario logueado
    const result = await prisma.business.update({
      where: { id: String(req.user.businessId) },
      data: req.body
    });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- RUTAS DE CLIENTES ---
app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    let filtro = {}; // Por defecto: Traer TODO (Para Superadmin)
    if (req.user.role !== 'SUPERADMIN') {
      filtro = { businessId: req.user.businessId };
    }
    const clients = await prisma.client.findMany({
      where: filtro //Usamos la variable dinámica
    });
    res.json(clients);
  } catch (e) {
    console.error("Error en GET /api/clients:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/clients', verifyToken, async (req, res) => {
  try {
    // INYECCIÓN AUTOMÁTICA DE ID DE EMPRESA
    const clientData = { ...req.body, businessId: req.user.businessId };
    const client = await prisma.client.create({ data: clientData });
    res.json(client);
  } catch (e) {
    console.error("Error creating client:", e);
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    // SEGURIDAD: Solo actualiza si el ID coincide Y pertenece a la empresa
    const client = await prisma.client.update({
      where: { id: id, businessId: req.user.businessId }, // COMPROBACIÓN DOBLE
      data: req.body
    });
    res.json(client);
  } catch (e) {
    console.error("Error updating client:", e);
    res.status(400).json({ error: 'No se pudo actualizar o no tienes permiso' });
  }
});

app.delete('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    // SEGURIDAD: Solo borra si pertenece a la empresa
    await prisma.client.delete({
      where: { id: id, businessId: req.user.businessId }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'No se pudo eliminar o no tienes permiso' });
  }
});

// --- RUTAS DE PRODUCTOS ---

// --- RUTAS DE PRODUCTOS (SaaS) ---
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    let filtro = {}; // Por defecto: Traer TODO (Para Superadmin)
    if (req.user.role !== 'SUPERADMIN') {
      filtro = { businessId: req.user.businessId };
    }

    const products = await prisma.product.findMany({
      where: filtro //Usamos la variable dinámica
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', verifyToken, async (req, res) => {
  try {
    const productData = { ...req.body, businessId: req.user.businessId };
    const product = await prisma.product.create({ data: productData });
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: _, ...data } = req.body;
    const product = await prisma.product.update({
      where: { id: id, businessId: req.user.businessId },
      data: data
    });
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({
      where: { id: id, businessId: req.user.businessId }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- RUTAS DE DOCUMENTOS (FACTURAS) ---
app.get('/api/documents', verifyToken, async (req, res) => {
  try {
    let filtro = {}; // Por defecto: Traer TODO (Para Superadmin)

    // Lógica de roles
    if (req.user.role === 'CLIENT') {
      // Si es CLIENTE, solo ve SUS documentos de ESA empresa
      filtro = { businessId: req.user.businessId, entityRuc: req.user.ruc }; 
    } else if (req.user.role === 'USER') {
      // VENDEDOR: Solo ve sus propios documentos
      filtro = { businessId: req.user.businessId, userId: req.user.id };
    } else if (req.user.role !== 'SUPERADMIN') {
      // Si es EMPRESA, ve todo lo de su empresa
      filtro = { businessId: req.user.businessId };
    }
    const docs = await prisma.document.findMany({
      where: filtro, //Usamos la variable dinámica
      include: { 
        items: true,
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(docs);
  } catch (e) {
    console.error("Error en GET /api/documents:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/documents', verifyToken, async (req, res) => {
  try {
    const { items, id, retentionTaxes, ...docData } = req.body;
    const businessId = req.user.businessId; // ID de la empresa actual

    // Función para obtener secuencial (ÚNICO POR EMPRESA)
    async function getNextSequence(prisma, type, establishmentCode, emissionPointCode, businessId) {
      const sequence = await prisma.sequence.upsert({
        where: {
          type_establishmentCode_emissionPointCode_businessId: { // Clave compuesta
            type,
            establishmentCode,
            emissionPointCode,
            businessId
          }
        },
        update: { currentValue: { increment: 1 } },
        create: {
          type,
          establishmentCode,
          emissionPointCode,
          businessId,
          currentValue: 1
        }
      });
      return sequence.currentValue;
    }

    // Transacción atómica para crear documento, actualizar stock y registrar movimientos
    const result = await prisma.$transaction(async (tx) => {
      // Obtener secuencial si es factura, nota de crédito, etc.
      let number = docData.number;
      if (!number && ['01', '03', '04', '05', '06', '07'].includes(docData.type)) { // 01: Factura, 03: Liquidación, 04: Nota de crédito, 05: Retención, 06: Guía, 07: Retención
        number = await getNextSequence(
          tx,
          docData.type,
          docData.establishmentCode || '001',
          docData.emissionPointCode || '001'
        );
        number = number.toString().padStart(9, '0');
      }

      // Preparar datos con fechas correctas
      const dataToSave = {
        ...docData,
        number,
        businessId, // VINCULAMOS DOCUMENTO A LA EMPRESA
        userId: req.user.id, // VINCULAMOS AL USUARIO CREADOR
        issueDate: new Date(docData.issueDate),
        dueDate: docData.dueDate ? new Date(docData.dueDate) : undefined,
        relatedDocumentDate: docData.relatedDocumentDate ? new Date(docData.relatedDocumentDate) : null,
        sustainingDocDate: docData.sustainingDocDate ? new Date(docData.sustainingDocDate) : null,
        retentionTaxes: retentionTaxes ? retentionTaxes : undefined,
        items: items ? {
          create: items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: item.taxRate,
            total: item.total
          }))
        } : undefined
      };

      // Crear documento
      const doc = await tx.document.create({
        data: dataToSave,
        include: { items: true }
      });

      // Actualizar stock y registrar movimientos SOLO para FACTURAS
      if (items && docData.type === '01') {
        for (const item of items) {
          if (item.type === 'FISICO') {
            // Buscamos producto asegurando que sea de la empresa
            const product = await tx.product.findUnique({
              where: { id: item.productId } // (Idealmente verificar businessId aquí también)
            });

            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock - item.quantity;

              await tx.product.update({
                where: { id: item.productId },
                data: { stock: newStock }
              });

              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  documentId: doc.id,
                  type: 'VENTA',
                  quantity: -item.quantity,
                  previousStock,
                  newStock
                }
              });
            }
          }
        }
      }
      // Lógica para Notas de Crédito (04) - Devolución de inventario
      if (items && docData.type === '04') {
        for (const item of items) {
          if (item.type === 'FISICO') {
            const product = await tx.product.findUnique({ where: { id: item.productId } });

            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock + item.quantity; // SUMAR stock
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: newStock }
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  documentId: doc.id,
                  type: 'DEVOLUCION',
                  quantity: item.quantity, // Positivo porque entra
                  previousStock,
                  newStock
                }
              });
            }
          }
        }
      }

      // Lógica para Liquidaciones de Compra (03) - Entrada de inventario
      if (items && docData.type === '03') {
        for (const item of items) {
          if (item.type === 'FISICO') {
            const product = await tx.product.findUnique({ where: { id: item.productId } });

            if (product && product.businessId === businessId) {
              const previousStock = product.stock;
              const newStock = previousStock + item.quantity; // SUMAR stock
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: newStock }
              });
              await tx.inventoryMovement.create({
                data: {
                  productId: item.productId,
                  documentId: doc.id,
                  type: 'COMPRA',
                  quantity: item.quantity, // Positivo porque entra
                  previousStock,
                  newStock
                }
              });
            }
          }
        }
      }

      return doc;
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// ============================================
// ENDPOINT: Asistente de IA (Gemini)
// ============================================
app.post('/api/ai/chat', verifyToken, async (req, res) => {
  try {
    const { message, context } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

    if (!apiKey) {
      // Fallback para modo desarrollo si no hay key
      console.warn('⚠️ GEMINI_API_KEY no configurada');
      return res.json({
        reply: "El servicio de IA no está configurado correctamente en el servidor. Por favor configura la variable GEMINI_API_KEY."
      });
    }

    // Prompt del sistema con contexto
    const systemPrompt = `Eres Ecuafact AI, un asistente experto en facturación electrónica del SRI (Ecuador).
    
    CONTEXTO DEL NEGOCIO:
    Nombre: ${context?.name || 'Usuario'}
    RUC: ${context?.ruc || 'N/A'}
    Régimen: ${context?.regime || 'General'}
    
    TU OBJETIVO:
    Ayudar con dudas sobre impuestos (IVA 15%), retenciones, fechas de vencimiento y uso del sistema.
    Responde de forma breve, amigable y profesional. Si no sabes algo, sugiere consultar a un contador.`;

    console.log('🤖 Enviando consulta a Gemini 1.5 Pro...');

    // Inicializar la librería
    const genAI = new GoogleGenerativeAI(apiKey);
    // Usamos 'gemini-1.5-pro' como alternativa estable
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `${systemPrompt}\n\nPregunta del usuario: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    res.json({ reply });

  } catch (error) {
    console.error('❌ Error AI:', error.message);
    // Devolver 200 con el mensaje de error para que se muestre en el chat y no rompa el frontend
    res.json({ reply: `Error de IA: ${error.message}. (Verifica tu API Key o cuota)` });
  }
});

// ============================================
// ENDPOINT: Asistente de IA (Insights Dashboard)
// ============================================
app.post('/api/ai/insights', verifyToken, async (req, res) => {
  try {
    const { salesData } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyASFiaKmJ_5vOy8sPYhhzl86ag4GexX7rM';

    if (!apiKey) {
      return res.json({
        insights: "El servicio de IA no está configurado en el servidor (falta GEMINI_API_KEY)."
      });
    }

    const systemPrompt = `Eres un asesor financiero experto para negocios en Ecuador. Analiza los siguientes datos y genera 3 recomendaciones cortas y accionables en formato de lista de viñetas (markdown). Sé directo y profesional.
    
    DATOS:
    - Total Ventas: ${salesData.totalVentas}
    - Cantidad de Documentos: ${salesData.documentos}
    - Inventario: ${salesData.inventario.length} productos.
    
    Ejemplo de respuesta:
    - **Optimizar Stock:** Se detectan X productos con bajo inventario. Revisa tus niveles de compra para evitar quiebres de stock.
    - **Incentivar Ventas:** El ticket promedio es de $Y. Considera crear combos o promociones para aumentarlo.
    - **Revisión Fiscal:** Has emitido Z facturas. Asegúrate de tener todo listo para tu próxima declaración del IVA.`;

    console.log('📊 Generando insights con Gemini 1.5 Pro...');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const insights = response.text();

    res.json({ insights });

  } catch (error) {
    console.error('❌ Error AI Insights:', error.message);
    res.json({ insights: `No se pudieron generar recomendaciones: ${error.message}` });
  }
});

// ============================================
// SERVIR FRONTEND EN PRODUCCIÓN
// ============================================
app.get('/', (req, res) => {
  res.send('✅ Servidor Backend Ecuafact Funcionando. La API está en /api');
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🇪🇨  PROXY SRI ECUADOR - SERVIDOR INICIADO  🇪🇨');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('');
  console.log('📋 Endpoints disponibles:');
  console.log(`   POST http://localhost:${PORT}/api/sri/sign-xml`);
  console.log(`   POST http://localhost:${PORT}/api/sri/recepcion`);
  console.log(`   POST http://localhost:${PORT}/api/sri/autorizacion`);
  console.log(`   POST http://localhost:${PORT}/api/login`);
  console.log(`   POST http://localhost:${PORT}/api/auth/client/login`);
  console.log(`   POST http://localhost:${PORT}/api/forgot-password`);
  console.log(`   POST http://localhost:${PORT}/api/notifications/send-email`);
  console.log(`   POST http://localhost:${PORT}/api/notifications/send-sms`);
  console.log(`   POST http://localhost:${PORT}/api/notifications/send-whatsapp`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/api/info`);
  console.log('');
  console.log('🔐 Conectado a:');
  console.log(`   Pruebas: ${SRI_ENDPOINTS.TEST.RECEPCION}`);
  console.log(`   Producción: ${SRI_ENDPOINTS.PROD.RECEPCION}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Cerrando servidor...');
  process.exit(0);
});
