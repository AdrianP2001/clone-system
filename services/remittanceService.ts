import { BusinessInfo, RemittanceGuide } from '../types';

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateAccessKey(
  date: Date,
  docType: string,
  ruc: string,
  environment: string,
  series: string,
  sequential: string,
  randomCode: string,
  emissionType: string
): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  const base = `${dateStr}${docType}${ruc}${environment}${series}${sequential}${randomCode}${emissionType}`;
  
  // Módulo 11
  let sum = 0;
  let multiplier = 7;
  
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]) * multiplier;
    multiplier--;
    if (multiplier < 2) multiplier = 7;
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;
  
  return base + checkDigit;
}

export function generateRemittanceXML(guide: RemittanceGuide, business: BusinessInfo): string {
  const date = new Date(guide.issueDate);
  const environment = business.isProduction ? '2' : '1';
  const emissionType = '1'; // Normal
  const docType = '06'; // Guía de Remisión
  
  const series = `${business.establishmentCode}${business.emissionPointCode}`;
  const sequential = guide.sequential.padStart(9, '0');
  const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
  
  const accessKey = generateAccessKey(
    date,
    docType,
    business.ruc,
    environment,
    series,
    sequential,
    randomCode,
    emissionType
  );

  const dateStr = formatDate(date);
  const startDateStr = formatDate(new Date(guide.startDate));
  const endDateStr = formatDate(new Date(guide.endDate));
  
  // Generar XML de destinatarios
  let destinatariosXml = '';
  guide.recipients.forEach(recipient => {
    let detallesXml = '';
    guide.items.forEach(item => {
      detallesXml += `
        <detalle>
          <codigoInterno>${escapeXml(item.productCode)}</codigoInterno>
          <descripcion>${escapeXml(item.description)}</descripcion>
          <cantidad>${item.quantity.toFixed(2)}</cantidad>
          ${item.additionalDetail ? `<detalleAdicional>${escapeXml(item.additionalDetail)}</detalleAdicional>` : ''}
        </detalle>`;
    });

    destinatariosXml += `
    <destinatario>
      <identificacionDestinatario>${recipient.ruc}</identificacionDestinatario>
      <razonSocialDestinatario>${escapeXml(recipient.name)}</razonSocialDestinatario>
      <dirDestinatario>${escapeXml(recipient.address)}</dirDestinatario>
      <motivoTraslado>${escapeXml(recipient.reasonForTransfer)}</motivoTraslado>
      ${recipient.fiscalDocNumber ? `<docAduaneroUnico>${escapeXml(recipient.fiscalDocNumber)}</docAduaneroUnico>` : ''}
      ${recipient.authorizationCode ? `<codEstabDestino>${escapeXml(recipient.authorizationCode)}</codEstabDestino>` : ''}
      <ruta>${escapeXml(guide.route || 'N/A')}</ruta>
      ${recipient.fiscalDocDate ? `<codDocSustento>01</codDocSustento>` : ''}
      ${recipient.fiscalDocNumber ? `<numDocSustento>${escapeXml(recipient.fiscalDocNumber)}</numDocSustento>` : ''}
      ${recipient.fiscalDocDate ? `<fechaEmisionDocSustento>${escapeXml(recipient.fiscalDocDate)}</fechaEmisionDocSustento>` : ''}
      <detalles>${detallesXml}
      </detalles>
    </destinatario>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<guiaRemision id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${environment}</ambiente>
    <tipoEmision>${emissionType}</tipoEmision>
    <razonSocial>${escapeXml(business.name.trim())}</razonSocial>
    <nombreComercial>${escapeXml(business.tradename.trim())}</nombreComercial>
    <ruc>${business.ruc}</ruc>
    <claveAcceso>${accessKey}</claveAcceso>
    <codDoc>${docType}</codDoc>
    <estab>${business.establishmentCode}</estab>
    <ptoEmi>${business.emissionPointCode}</ptoEmi>
    <secuencial>${sequential}</secuencial>
    <dirMatriz>${escapeXml(business.address.trim())}</dirMatriz>
  </infoTributaria>
  <infoGuiaRemision>
    <dirEstablecimiento>${escapeXml(business.branchAddress.trim())}</dirEstablecimiento>
    <dirPartida>${escapeXml(guide.originAddress)}</dirPartida>
    <razonSocialTransportista>${escapeXml(guide.carrierName)}</razonSocialTransportista>
    <tipoIdentificacionTransportista>04</tipoIdentificacionTransportista>
    <rucTransportista>${guide.carrierRuc}</rucTransportista>
    <obligadoContabilidad>${business.isAccountingObliged ? 'SI' : 'NO'}</obligadoContabilidad>
    <fechaIniTransporte>${startDateStr}</fechaIniTransporte>
    <fechaFinTransporte>${endDateStr}</fechaFinTransporte>
    <placa>${escapeXml(guide.licensePlate)}</placa>
  </infoGuiaRemision>
  <destinatarios>${destinatariosXml}
  </destinatarios>
</guiaRemision>`;
}
