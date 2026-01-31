import { BusinessInfo, PurchaseSettlement } from '../types';

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

export function generateSettlementXML(settlement: PurchaseSettlement, business: BusinessInfo): string {
  const date = new Date(settlement.issueDate);
  const environment = business.isProduction ? '2' : '1';
  const emissionType = '1'; // Normal
  const docType = '03'; // Liquidación de Compra
  
  const series = `${business.establishmentCode}${business.emissionPointCode}`;
  const sequential = settlement.sequential.padStart(9, '0');
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
  
  // Generar XML de detalles
  let detallesXml = '';
  settlement.items.forEach((item, index) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discount || 0;
    const itemTotal = itemSubtotal - itemDiscount;
    const taxCode = item.taxRate > 0 ? '2' : '0'; // 2=IVA, 0=IVA 0%
    const taxPercentage = item.taxRate > 0 ? '2' : '0'; // 2=15%

    detallesXml += `
    <detalle>
      <codigoPrincipal>${escapeXml(item.productId)}</codigoPrincipal>
      <descripcion>${escapeXml(item.description)}</descripcion>
      <cantidad>${item.quantity.toFixed(2)}</cantidad>
      <precioUnitario>${item.unitPrice.toFixed(6)}</precioUnitario>
      <descuento>${itemDiscount.toFixed(2)}</descuento>
      <precioTotalSinImpuesto>${itemTotal.toFixed(2)}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>${taxCode}</codigo>
          <codigoPorcentaje>${taxPercentage}</codigoPorcentaje>
          <tarifa>${item.taxRate.toFixed(0)}</tarifa>
          <baseImponible>${itemTotal.toFixed(2)}</baseImponible>
          <valor>${(itemTotal * item.taxRate / 100).toFixed(2)}</valor>
        </impuesto>
      </impuestos>
    </detalle>`;
  });

  // Generar XML de totales con impuestos
  let totalConImpuestosXml = '';
  if (settlement.subtotal12 > 0) {
    totalConImpuestosXml += `
    <totalImpuesto>
      <codigo>2</codigo>
      <codigoPorcentaje>2</codigoPorcentaje>
      <baseImponible>${settlement.subtotal12.toFixed(2)}</baseImponible>
      <tarifa>15</tarifa>
      <valor>${settlement.iva.toFixed(2)}</valor>
    </totalImpuesto>`;
  }
  if (settlement.subtotal0 > 0) {
    totalConImpuestosXml += `
    <totalImpuesto>
      <codigo>2</codigo>
      <codigoPorcentaje>0</codigoPorcentaje>
      <baseImponible>${settlement.subtotal0.toFixed(2)}</baseImponible>
      <tarifa>0</tarifa>
      <valor>0.00</valor>
    </totalImpuesto>`;
  }

  // Generar XML de pagos
  let pagosXml = '';
  settlement.payments.forEach(payment => {
    pagosXml += `
    <pago>
      <formaPago>${escapeXml(payment.paymentMethodCode)}</formaPago>
      <total>${payment.total.toFixed(2)}</total>
      ${payment.timeUnit ? `<plazo>${payment.term || 0}</plazo>` : ''}
      ${payment.timeUnit ? `<unidadTiempo>${escapeXml(payment.timeUnit)}</unidadTiempo>` : ''}
    </pago>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<liquidacionCompra id="comprobante" version="1.0.0">
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
  <infoLiquidacionCompra>
    <fechaEmision>${dateStr}</fechaEmision>
    <dirEstablecimiento>${escapeXml(business.branchAddress.trim())}</dirEstablecimiento>
    <obligadoContabilidad>${business.isAccountingObliged ? 'SI' : 'NO'}</obligadoContabilidad>
    <tipoIdentificacionProveedor>05</tipoIdentificacionProveedor>
    <razonSocialProveedor>${escapeXml(settlement.supplierName.trim())}</razonSocialProveedor>
    <identificacionProveedor>${settlement.supplierRuc}</identificacionProveedor>
    <direccionProveedor>${escapeXml(settlement.supplierAddress)}</direccionProveedor>
    <totalSinImpuestos>${settlement.subtotal.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>0.00</totalDescuento>
    <totalConImpuestos>${totalConImpuestosXml}
    </totalConImpuestos>
    <importeTotal>${settlement.total.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>${pagosXml}
    </pagos>
  </infoLiquidacionCompra>
  <detalles>${detallesXml}
  </detalles>
</liquidacionCompra>`;
}
