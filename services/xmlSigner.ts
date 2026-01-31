/**
 * Firmador XML con certificado .p12 (PKCS#12)
 * Implementa firma electrónica XAdES-BES según estándar del SRI Ecuador
 */

import * as forge from 'node-forge';

export interface SignatureOptions {
  p12File: ArrayBuffer;
  password: string;
  claveAcceso: string;
}

/**
 * Firma el XML con el certificado .p12
 */
export const signXml = async (
  xmlString: string,
  options: SignatureOptions
): Promise<string> => {
  try {
    // Cargar el certificado .p12
    const uint8Array = new Uint8Array(options.p12File);
    const binaryString = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
    const p12Der = forge.util.decode64(forge.util.encode64(binaryString));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, options.password);

    // Extraer el certificado y la clave privada
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];
    
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

    if (!certBag || !keyBag) {
      throw new Error('No se pudo extraer el certificado o clave privada del archivo .p12');
    }

    const certificate = certBag.cert;
    const privateKey = keyBag.key;

    if (!certificate || !privateKey) {
      throw new Error('Certificado o clave privada inválidos');
    }

    // Extraer información del certificado
    const certPem = forge.pki.certificateToPem(certificate);
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const certBase64 = forge.util.encode64(certDer);

    // Calcular el digest SHA1 del comprobante
    const md = forge.md.sha1.create();
    md.update(xmlString, 'utf8');
    const digestValue = forge.util.encode64(md.digest().getBytes());

    // Crear SignedInfo
    const signedInfo = `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>
  <ds:Reference Id="SignedPropertiesID${options.claveAcceso}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature${options.claveAcceso}-SignedProperties">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
    <ds:DigestValue>${digestValue}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference URI="#Certificate${options.claveAcceso}">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
    <ds:DigestValue>${digestValue}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`;

    // Firmar el SignedInfo
    const mdSigned = forge.md.sha1.create();
    mdSigned.update(signedInfo, 'utf8');
    const signature = privateKey.sign(mdSigned);
    const signatureValue = forge.util.encode64(signature);

    // Obtener información del certificado
    const subject = certificate.subject.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(',');

    const serialNumber = certificate.serialNumber;
    const issuer = certificate.issuer.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(',');

    // Construir la firma XAdES-BES
    const signatureBlock = `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="Signature${options.claveAcceso}">
${signedInfo}
  <ds:SignatureValue Id="SignatureValue${options.claveAcceso}">
${signatureValue}
  </ds:SignatureValue>
  <ds:KeyInfo Id="Certificate${options.claveAcceso}">
    <ds:X509Data>
      <ds:X509Certificate>
${certBase64}
      </ds:X509Certificate>
    </ds:X509Data>
    <ds:KeyValue>
      <ds:RSAKeyValue>
        <ds:Modulus>${forge.util.encode64(
          forge.asn1
            .toDer(
              forge.pki.publicKeyToAsn1(certificate.publicKey)
            )
            .getBytes()
        )}</ds:Modulus>
        <ds:Exponent>AQAB</ds:Exponent>
      </ds:RSAKeyValue>
    </ds:KeyValue>
  </ds:KeyInfo>
  <ds:Object Id="Signature${options.claveAcceso}-Object">
    <etsi:QualifyingProperties Target="#Signature${options.claveAcceso}">
      <etsi:SignedProperties Id="Signature${options.claveAcceso}-SignedProperties">
        <etsi:SignedSignatureProperties>
          <etsi:SigningTime>${new Date().toISOString()}</etsi:SigningTime>
          <etsi:SigningCertificate>
            <etsi:Cert>
              <etsi:CertDigest>
                <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
                <ds:DigestValue>${digestValue}</ds:DigestValue>
              </etsi:CertDigest>
              <etsi:IssuerSerial>
                <ds:X509IssuerName>${issuer}</ds:X509IssuerName>
                <ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>
              </etsi:IssuerSerial>
            </etsi:Cert>
          </etsi:SigningCertificate>
        </etsi:SignedSignatureProperties>
        <etsi:SignedDataObjectProperties>
          <etsi:DataObjectFormat ObjectReference="#Reference-ID-${options.claveAcceso}">
            <etsi:Description>comprobante</etsi:Description>
            <etsi:MimeType>text/xml</etsi:MimeType>
          </etsi:DataObjectFormat>
        </etsi:SignedDataObjectProperties>
      </etsi:SignedProperties>
    </etsi:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;

    // Insertar la firma antes de la etiqueta de cierre
    const signedXml = xmlString.replace('</factura>', `${signatureBlock}\n</factura>`);

    return signedXml;
  } catch (error: any) {
    throw new Error(`Error al firmar XML: ${error.message}`);
  }
};

/**
 * Valida el certificado .p12
 */
export const validateP12Certificate = async (
  p12File: ArrayBuffer,
  password: string
): Promise<{ valid: boolean; info?: any; error?: string }> => {
  try {
    const uint8Array = new Uint8Array(p12File);
    const binaryString = Array.from(uint8Array)
      .map(byte => String.fromCharCode(byte))
      .join('');
    const p12Der = forge.util.decode64(forge.util.encode64(binaryString));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];

    if (!certBag) {
      return { valid: false, error: 'No se encontró un certificado válido en el archivo' };
    }

    const cert = certBag.cert;
    if (!cert) {
      return { valid: false, error: 'Certificado inválido' };
    }

    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;

    if (now < notBefore || now > notAfter) {
      return {
        valid: false,
        error: `Certificado expirado o aún no válido. Válido desde ${notBefore.toLocaleDateString()} hasta ${notAfter.toLocaleDateString()}`,
      };
    }

    const subject = cert.subject.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(', ');

    return {
      valid: true,
      info: {
        subject,
        notBefore: notBefore.toLocaleDateString(),
        notAfter: notAfter.toLocaleDateString(),
        serialNumber: cert.serialNumber,
      },
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message.includes('Invalid password')
        ? 'Contraseña incorrecta'
        : `Error al validar certificado: ${error.message}`,
    };
  }
};
