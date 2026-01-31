import { BusinessInfo, Retention } from '../types';

// Códigos de retención más comunes en Ecuador
export const RETENTION_CODES = {
  RENTA: {
    '1': 'Impuesto a la Renta',
    '312': 'Honorarios profesionales y demás pagos por servicios relacionados con el título profesional - 10%',
    '303': 'Servicios entre sociedades - 2%',
    '304': 'Servicios de construcción - 2%',
    '319': 'Servicios predomina el intelecto no relacionados con el título profesional - 8%',
    '320': 'Servicios predomina la mano de obra - 2%',
    '322': 'Comisiones y demás pagos por servicios - 2%',
    '323': 'Transporte privado de pasajeros o transporte público o privado de carga - 1%',
    '324': 'Transferencia de bienes muebles de naturaleza corporal - 1%',
    '325': 'Arrendamiento mercantil - 1%',
    '326': 'Seguros y reaseguros (primas y cesiones) - 1%',
    '327': 'Rendimientos financieros - 1%',
    '328': 'Compra de bienes de origen agrícola, avícola, pecuario, apícola, etc. - 1%'
  },
  IVA: {
    '2': 'Impuesto al Valor Agregado',
    '9': 'IVA presuntivo - Servicios en los que predomina la mano de obra',
    '10': 'IVA presuntivo - Servicios profesionales',
    '1': 'IVA por presuntos rendimientos económicos'
  }
};

// Porcentajes de retención
export const RETENTION_PERCENTAGES = {
  RENTA: [
    { code: '303', percentage: 1, label: '1%' },
    { code: '304', percentage: 2, label: '2%' },
    { code: '307', percentage: 8, label: '8%' },
    { code: '309', percentage: 10, label: '10%' }
  ],
  IVA: [
    { code: '9', percentage: 10, label: '10%' },
    { code: '10', percentage: 20, label: '20%' },
    { code: '1', percentage: 30, label: '30%' },
    { code: '2', percentage: 50, label: '50%' },
    { code: '3', percentage: 70, label: '70%' },
    { code: '4', percentage: 100, label: '100%' }
  ]
};

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

export function generateRetentionXML(retention: Retention, business: BusinessInfo): string {
  const date = new Date(retention.issueDate);
  const environment = business.isProduction ? '2' : '1';
  const emissionType = '1'; // Normal
  const docType = '07'; // Retención
  
  const series = `${business.establishmentCode}${business.emissionPointCode}`;
  const sequential = retention.sequential.padStart(9, '0');
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
  
  let impuestosXml = '';
  retention.taxes.forEach(tax => {
    impuestosXml += `
    <impuesto>
      <codigo>${escapeXml(tax.code)}</codigo>
      <codigoRetencion>${escapeXml(tax.percentageCode)}</codigoRetencion>
      <baseImponible>${tax.baseImponible.toFixed(2)}</baseImponible>
      <porcentajeRetener>${tax.percentage}</porcentajeRetener>
      <valorRetenido>${tax.taxValue.toFixed(2)}</valorRetenido>
      <codDocSustento>${escapeXml(tax.fiscalDocCode)}</codDocSustento>
      <numDocSustento>${escapeXml(tax.fiscalDocNumber)}</numDocSustento>
      <fechaEmisionDocSustento>${escapeXml(retention.sustainingDocDate)}</fechaEmisionDocSustento>
    </impuesto>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<comprobanteRetencion id="comprobante" version="1.0.0">
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
  <infoCompRetencion>
    <fechaEmision>${dateStr}</fechaEmision>
    <dirEstablecimiento>${escapeXml(business.branchAddress.trim())}</dirEstablecimiento>
    <obligadoContabilidad>${business.isAccountingObliged ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionSujetoRetenido>04</tipoIdentificacionSujetoRetenido>
    <razonSocialSujetoRetenido>${escapeXml(retention.supplierName.trim())}</razonSocialSujetoRetenido>
    <identificacionSujetoRetenido>${retention.supplierRuc}</identificacionSujetoRetenido>
    <periodoFiscal>${retention.taxPeriod}</periodoFiscal>
  </infoCompRetencion>
  <docsSustento>
    <docSustento>
      <codSustento>${escapeXml(retention.sustainingDocType)}</codSustento>
      <codDocSustento>${escapeXml(retention.sustainingDocType)}</codDocSustento>
      <numDocSustento>${escapeXml(retention.sustainingDocNumber)}</numDocSustento>
      <fechaEmisionDocSustento>${escapeXml(retention.sustainingDocDate)}</fechaEmisionDocSustento>
      <pagoLocExt>01</pagoLocExt>
      <totalSinImpuestos>${retention.sustainingDocTotal.toFixed(2)}</totalSinImpuestos>
      <importeTotal>${retention.sustainingDocTotal.toFixed(2)}</importeTotal>
      <impuestosDocSustento>
        <impuestoDocSustento>
          <codImpuestoDocSustento>2</codImpuestoDocSustento>
          <codigoPorcentaje>2</codigoPorcentaje>
          <baseImponible>${retention.sustainingDocTotal.toFixed(2)}</baseImponible>
          <tarifa>15</tarifa>
          <valorImpuesto>${(retention.sustainingDocTotal * 0.15).toFixed(2)}</valorImpuesto>
        </impuestoDocSustento>
      </impuestosDocSustento>
      <retenciones>${impuestosXml}
      </retenciones>
      <pagos>
        <pago>
          <formaPago>01</formaPago>
          <total>${retention.sustainingDocTotal.toFixed(2)}</total>
        </pago>
      </pagos>
    </docSustento>
  </docsSustento>
</comprobanteRetencion>`;
}
