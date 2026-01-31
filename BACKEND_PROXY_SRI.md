# 🔧 Backend Proxy para SRI (Producción)

## ¿Por qué se necesita un backend?

Las librerías SOAP (soap, node-forge) requieren módulos de Node.js que **no funcionan en navegadores** por razones de seguridad. El navegador bloquea:
- Módulos de sistema (`fs`, `crypto`, `stream`)
- Llamadas SOAP directas (CORS)
- Procesamiento de certificados .p12

## Solución: Backend Proxy

Crear un servidor Node.js/Express que actúe como intermediario entre el frontend y el SRI.

---

## 📦 Implementación Completa

### 1. Crear Proyecto Backend

```bash
mkdir sri-proxy-server
cd sri-proxy-server
npm init -y
npm install express cors soap xml2js node-forge body-parser
```

### 2. Crear `server.js`

```javascript
const express = require('express');
const cors = require('cors');
const soap = require('soap');
const forge = require('node-forge');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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

// Endpoint: Firmar XML
app.post('/api/sri/sign-xml', async (req, res) => {
  try {
    const { xml, p12Base64, password, claveAcceso } = req.body;

    // Decodificar certificado .p12
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extraer certificado y clave privada
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    
    const certificate = certBags[forge.pki.oids.certBag][0].cert;
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    // Calcular digest
    const md = forge.md.sha1.create();
    md.update(xml, 'utf8');
    const digestValue = forge.util.encode64(md.digest().getBytes());

    // Crear SignedInfo
    const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <ds:Reference URI="#comprobante">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${digestValue}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`;

    // Firmar
    const mdSigned = forge.md.sha1.create();
    mdSigned.update(signedInfo, 'utf8');
    const signature = privateKey.sign(mdSigned);
    const signatureValue = forge.util.encode64(signature);

    // Certificado en Base64
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    // Construir bloque de firma
    const signatureBlock = `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature">
${signedInfo}
  <ds:SignatureValue>${signatureValue}</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <ds:X509Certificate>${certBase64}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
</ds:Signature>`;

    // Insertar firma en el XML
    const signedXml = xml.replace('</factura>', `${signatureBlock}\n</factura>`);

    res.json({ success: true, signedXml });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint: Enviar a Recepción
app.post('/api/sri/recepcion', async (req, res) => {
  try {
    const { xmlSigned, isProduction } = req.body;
    
    const endpoint = isProduction 
      ? SRI_ENDPOINTS.PROD.RECEPCION 
      : SRI_ENDPOINTS.TEST.RECEPCION;

    // Crear cliente SOAP
    const client = await soap.createClientAsync(endpoint, {
      wsdl_options: { timeout: 30000 }
    });

    // Codificar a Base64
    const xmlBase64 = Buffer.from(xmlSigned, 'utf-8').toString('base64');

    // Llamar método validarComprobante
    const result = await client.validarComprobanteAsync({ xml: xmlBase64 });
    const respuesta = result[0]?.RespuestaRecepcionComprobante;

    if (!respuesta) {
      throw new Error('Respuesta vacía del SRI');
    }

    res.json({
      success: respuesta.estado === 'RECIBIDA',
      estado: respuesta.estado,
      claveAcceso: respuesta.claveAcceso,
      comprobantes: respuesta.comprobantes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint: Consultar Autorización
app.post('/api/sri/autorizacion', async (req, res) => {
  try {
    const { claveAcceso, isProduction } = req.body;
    
    const endpoint = isProduction 
      ? SRI_ENDPOINTS.PROD.AUTORIZACION 
      : SRI_ENDPOINTS.TEST.AUTORIZACION;

    // Crear cliente SOAP
    const client = await soap.createClientAsync(endpoint, {
      wsdl_options: { timeout: 30000 }
    });

    // Consultar autorización
    const result = await client.autorizacionComprobanteAsync({
      claveAccesoComprobante: claveAcceso
    });

    const respuesta = result[0]?.RespuestaAutorizacionComprobante;
    const autorizacion = respuesta?.autorizaciones?.autorizacion?.[0];

    if (!autorizacion) {
      throw new Error('No se encontró autorización');
    }

    res.json({
      success: autorizacion.estado === 'AUTORIZADO',
      estado: autorizacion.estado,
      numeroAutorizacion: autorizacion.numeroAutorizacion,
      fechaAutorizacion: autorizacion.fechaAutorizacion,
      mensajes: autorizacion.mensajes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Proxy SRI funcionando' });
});

app.listen(PORT, () => {
  console.log(`✅ Proxy SRI ejecutándose en http://localhost:${PORT}`);
  console.log(`📡 Listo para conectar con el SRI de Ecuador`);
});
```

### 3. Actualizar `sriService.ts` en el Frontend

```typescript
// En lugar de llamar directamente a SOAP:

const API_PROXY = 'http://localhost:3001/api/sri';

// Firmar XML
const signResponse = await fetch(`${API_PROXY}/sign-xml`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    xml,
    p12Base64: Buffer.from(signatureOptions.p12File).toString('base64'),
    password: signatureOptions.password,
    claveAcceso: signatureOptions.claveAcceso
  })
});

const { signedXml } = await signResponse.json();

// Enviar a Recepción
const recepcionResponse = await fetch(`${API_PROXY}/recepcion`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ xmlSigned: signedXml, isProduction })
});

// Consultar Autorización
const autorizacionResponse = await fetch(`${API_PROXY}/autorizacion`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claveAcceso, isProduction })
});
```

### 4. Ejecutar el Backend

```bash
node server.js
```

---

## 🔐 Seguridad en Producción

### Recomendaciones:

1. **Variables de Entorno**
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3001;
```

2. **Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de requests
});

app.use('/api/sri/', limiter);
```

3. **Autenticación**
```javascript
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
};

app.use('/api/sri/', authenticate);
```

4. **HTTPS**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, app).listen(443);
```

---

## 📊 Ventajas del Backend Proxy

✅ Acceso completo a librerías Node.js
✅ Sin problemas de CORS
✅ Procesamiento seguro de certificados
✅ Cache de respuestas del SRI
✅ Logs centralizados
✅ Rate limiting y seguridad
✅ Manejo de reintentos
✅ Almacenamiento en base de datos

---

## 🚀 Deploy en Producción

### Opción 1: VPS (DigitalOcean, AWS, etc.)
```bash
# Instalar PM2 para mantener el servidor activo
npm install -g pm2

# Iniciar servidor
pm2 start server.js --name "sri-proxy"

# Configurar para arranque automático
pm2 startup
pm2 save
```

### Opción 2: Heroku
```bash
# Crear Procfile
echo "web: node server.js" > Procfile

# Deploy
git push heroku main
```

### Opción 3: Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## 📝 Variables de Entorno

Crear `.env`:
```
PORT=3001
API_KEY=tu_clave_secreta_aqui
NODE_ENV=production
FRONTEND_URL=https://tu-app.com
```

---

**Con este backend proxy, tendrás acceso completo a la API del SRI de forma segura y profesional.**
