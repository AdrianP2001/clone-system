import { ATSPurchase, ATSSale } from '../types';

interface ATSData {
  ruc: string;
  businessName: string;
  period: string; // MMYYYY
  purchases: ATSPurchase[];
  sales: ATSSale[];
}

export function generateATSXML(data: ATSData): string {
  const { ruc, businessName, period, purchases, sales } = data;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<iva>
  <TipoIDInformante>R</TipoIDInformante>
  <IdInformante>${ruc}</IdInformante>
  <razonSocial>${escapeXml(businessName)}</razonSocial>
  <Anio>${period.substring(2, 6)}</Anio>
  <Mes>${period.substring(0, 2)}</Mes>`;

  // Compras
  if (purchases.length > 0) {
    xml += '\n  <compras>';
    purchases.forEach(purchase => {
      xml += `
    <detalleCompras>
      <codSustento>01</codSustento>
      <tpIdProv>${purchase.idProviderType}</tpIdProv>
      <idProv>${purchase.providerRuc}</idProv>
      <tipoComprobante>${purchase.documentType}</tipoComprobante>
      <parteRel>NO</parteRel>
      <fechaRegistro>${formatDateATS(purchase.authorizationDate)}</fechaRegistro>
      <establecimiento>${purchase.documentNumber.substring(0, 3)}</establecimiento>
      <puntoEmision>${purchase.documentNumber.substring(3, 6)}</puntoEmision>
      <secuencial>${purchase.documentNumber.substring(6)}</secuencial>
      <fechaEmision>${formatDateATS(purchase.authorizationDate)}</fechaEmision>
      <autorizacion>${purchase.authorizationNumber}</autorizacion>
      <baseNoGraIva>${purchase.subtotal0.toFixed(2)}</baseNoGraIva>
      <baseImponible>${purchase.subtotal12.toFixed(2)}</baseImponible>
      <baseImpGrav>${purchase.subtotal12.toFixed(2)}</baseImpGrav>
      <baseImpExe>0.00</baseImpExe>
      <montoIce>0.00</montoIce>
      <montoIva>${purchase.iva.toFixed(2)}</montoIva>
      <valRetBien10>0.00</valRetBien10>
      <valRetServ20>0.00</valRetServ20>
      <valorRetBienes>0.00</valorRetBienes>
      <valRetServ50>0.00</valRetServ50>
      <valorRetServicios>0.00</valorRetServicios>
      <valRetServ100>0.00</valRetServ100>
      <totbasesImpReemb>0.00</totbasesImpReemb>
      <pagoExterior>
        <pagoLocExt>01</pagoLocExt>
        <paisEfecPago>NA</paisEfecPago>
        <aplicConvDobTrib>NA</aplicConvDobTrib>
        <pagExtSujRetNorLeg>NA</pagExtSujRetNorLeg>
      </pagoExterior>
      <formasDePago>
        <formaPago>01</formaPago>
      </formasDePago>
    </detalleCompras>`;
    });
    xml += '\n  </compras>';
  }

  // Ventas
  if (sales.length > 0) {
    xml += '\n  <ventas>';
    sales.forEach(sale => {
      xml += `
    <detalleVentas>
      <tpIdCliente>${sale.clientIdType}</tpIdCliente>
      <idCliente>${sale.clientId}</idCliente>
      <parteRelVtas>NO</parteRelVtas>
      <tipoComprobante>${sale.documentType}</tipoComprobante>
      <tipoEmision>1</tipoEmision>
      <numeroComprobantes>1</numeroComprobantes>
      <baseNoGraIva>${sale.subtotal0.toFixed(2)}</baseNoGraIva>
      <baseImponible>${sale.subtotal12.toFixed(2)}</baseImponible>
      <baseImpGrav>${sale.subtotal12.toFixed(2)}</baseImpGrav>
      <montoIva>${sale.iva.toFixed(2)}</montoIva>
      <montoIce>0.00</montoIce>
      <valorRetIva>0.00</valorRetIva>
      <valorRetRenta>0.00</valorRetRenta>
      <formasDePago>
        <formaPago>01</formaPago>
      </formasDePago>
    </detalleVentas>`;
    });
    xml += '\n  </ventas>';
  }

  xml += '\n</iva>';
  return xml;
}

function formatDateATS(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
