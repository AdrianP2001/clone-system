
import React, { useEffect, useState } from 'react';
import { Document, BusinessInfo, InvoiceItem } from '../types';
import QRCode from 'qrcode';

interface RideViewerProps {
  document: Document;
  businessInfo: BusinessInfo;
  items: InvoiceItem[];
  onClose: () => void;
}

const RideViewer: React.FC<RideViewerProps> = ({ document, businessInfo, items, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    // Generar código QR con la clave de acceso
    if (document.accessKey) {
      QRCode.toDataURL(document.accessKey, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Error generando QR:', err);
      });
    }
  }, [document.accessKey]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Importar html2pdf dinámicamente
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Usar window.document para evitar colisión con el prop "document"
      const element = window.document.getElementById('ride-content');
      if (!element) {
        console.error('No se encontró el elemento RIDE');
        setIsGeneratingPdf(false);
        return;
      }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `factura_${document.number.replace(/-/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 1.5,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowHeight: element.scrollHeight,
          windowWidth: element.scrollWidth
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: ['img', 'table', '.no-break', '.qr-code']
        }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Intente usar el botón de Imprimir.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Cálculos robustos basados en la normativa del SRI
  const subtotal15 = items.reduce((acc, item) => 
    item.taxRate > 0 ? acc + (item.quantity * item.unitPrice - item.discount) : acc, 0
  );
  
  const subtotal0 = items.reduce((acc, item) => 
    item.taxRate === 0 ? acc + (item.quantity * item.unitPrice - item.discount) : acc, 0
  );

  const totalDiscount = items.reduce((acc, item) => acc + (item.discount || 0), 0);
  
  const totalIva = items.reduce((acc, item) => 
    item.taxRate > 0 ? acc + ((item.quantity * item.unitPrice - item.discount) * (item.taxRate / 100)) : acc, 0
  );

  const finalTotal = subtotal15 + subtotal0 + totalIva;

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] overflow-y-auto print:p-0 print:bg-white print:static print:block print:overflow-visible">
      {/* Estilos inyectados específicamente para impresión */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4; 
            margin: 10mm; 
          }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Ocultar scrollbars y otros elementos */
          ::-webkit-scrollbar { display: none; }
        }
      `}} />

      {/* Contenedor con scroll mejorado */}
      <div className="min-h-screen flex items-start justify-center py-8 px-4 print:p-0 print:min-h-0">
        <div className="print-container bg-white w-full max-w-[210mm] shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none print:w-full">
          {/* Header de controles (No se imprime) - FIXED al top */}
          <div className="sticky top-0 z-10 bg-white shadow-md flex justify-between items-center px-6 py-4 border-b border-slate-200 print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose} 
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl transition-all font-semibold text-slate-700"
              >
                <span className="text-xl">✕</span> Cerrar
              </button>
              <h2 className="font-black text-slate-800 uppercase tracking-tight text-lg">RIDE - Factura Electrónica</h2>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-red-200 hover:bg-red-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isGeneratingPdf ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span> Generando PDF...
                  </>
                ) : (
                  <>
                    <span className="text-lg">📄</span> Guardar PDF
                  </>
                )}
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all"
              >
                <span className="text-lg">🖨️</span> Imprimir
              </button>
            </div>
          </div>

          {/* Contenido del RIDE */}
          <div id="ride-content" className="p-4 md:p-6 print:p-0">
            <div className="flex flex-col gap-2 text-[9px] text-slate-800 leading-tight font-serif print:text-[9pt]">
              <div className="grid grid-cols-2 gap-2">
            {/* Bloque Izquierdo: Emisor */}
            <div className="border border-slate-300 p-2 rounded-lg flex flex-col items-center justify-center space-y-2 text-center">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} className="max-h-16 object-contain" alt="Logo" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-xl rounded-xl">🏢</div>
              )}
              <div className="space-y-0.5">
                <p className="font-bold text-sm uppercase leading-tight">{businessInfo.name}</p>
                <p>Dirección Matriz: {businessInfo.address}</p>
                <p className="font-bold">{businessInfo.regime}</p>
                <p>OBLIGADO A LLEVAR CONTABILIDAD: NO</p>
              </div>
            </div>

            {/* Bloque Derecho: Info Fiscal */}
            <div className="border border-slate-300 p-2 rounded-lg space-y-1">
              <p className="font-bold text-base">R.U.C.: {businessInfo.ruc}</p>
              <p className="bg-slate-100 p-1 font-bold text-center border border-slate-200 text-sm">FACTURA</p>
              <p>No. {document.number}</p>
              <p className="font-bold">NÚMERO DE AUTORIZACIÓN:</p>
              <p className="text-[8px] break-all font-mono leading-none">{document.accessKey}</p>
              <p>FECHA Y HORA DE AUTORIZACIÓN: {new Date().toLocaleString()}</p>
              <p>AMBIENTE: {businessInfo.isProduction ? 'PRODUCCIÓN' : 'PRUEBAS'}</p>
              <p>EMISIÓN: NORMAL</p>
              <p className="font-bold">CLAVE DE ACCESO:</p>
              <div className="bg-slate-50 p-2 border border-slate-200 text-center font-mono tracking-tighter text-[8px]">
                {document.accessKey}
              </div>
            </div>
          </div>

          {/* Info Cliente */}
          <div className="border border-slate-300 p-2 rounded-lg space-y-1">
            <p><span className="font-bold">Razón Social / Nombres y Apellidos:</span> {document.entityName}</p>
            <p><span className="font-bold">Identificación:</span> {document.entityPhone || '9999999999'}</p>
            <p><span className="font-bold">Fecha Emisión:</span> {document.issueDate}</p>
          </div>

          {/* Tabla de Productos */}
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 p-1 text-left text-[8px]">Cod. Principal</th>
                <th className="border border-slate-300 p-1 text-center text-[8px]">Cant.</th>
                <th className="border border-slate-300 p-1 text-left text-[8px]">Descripción</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">P. Unitario</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">Descuento</th>
                <th className="border border-slate-300 p-1 text-right text-[8px]">Precio Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-1 border border-slate-300 text-[8px]">ITM-{idx+1}</td>
                  <td className="p-1 border border-slate-300 text-center text-[8px]">{it.quantity}</td>
                  <td className="p-1 border border-slate-300 text-[8px]">{it.description}</td>
                  <td className="p-1 border border-slate-300 text-right text-[8px]">${it.unitPrice.toFixed(2)}</td>
                  <td className="p-1 border border-slate-300 text-right text-[8px]">${it.discount.toFixed(2)}</td>
                  <td className="p-1 border border-slate-300 text-right font-bold text-[8px]">${(it.quantity * it.unitPrice - it.discount).toFixed(2)}</td>
                </tr>
              ))}
              {/* Rellenar espacios si hay pocos items para mantener estructura SRI */}
              {items.length < 2 && Array.from({ length: 2 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-4">
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                  <td className="border border-slate-300"></td><td className="border border-slate-300"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer: Adicionales y Totales */}
          <div className="grid grid-cols-2 gap-2 no-break">
            <div className="border border-slate-300 p-2 rounded-lg h-fit space-y-2">
              <p className="font-bold text-[8px] border-b pb-0.5">Información Adicional</p>
              <p className="text-[8px]">Email: {document.entityEmail || 'S/N'}</p>
              <div className="pt-1 mt-1 border-t border-slate-200">
                <p className="font-bold text-[8px] mb-1 uppercase">Forma de Pago</p>
                <div className="flex justify-between text-[7px] border border-slate-200 p-1">
                  <span>OTROS CON UTILIZACION DEL SISTEMA FINANCIERO</span>
                  <span className="font-bold">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Código QR */}
              {qrCodeUrl && (
                <div className="no-break qr-code pt-1 mt-1 border-t border-slate-200 flex flex-col items-center">
                  <p className="font-bold text-[7px] mb-1 uppercase text-center">Código QR</p>
                  <img src={qrCodeUrl} alt="Código QR" className="w-24 h-24" />
                  <p className="text-[6px] text-slate-500 text-center mt-0.5">Escanea para verificar</p>
                </div>
              )}
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden h-fit">
              <table className="w-full text-[8px] print:text-[8pt]">
                <tbody className="divide-y divide-slate-200">
                  <tr><td className="p-1 font-bold">SUBTOTAL 15%</td><td className="p-1 text-right">${subtotal15.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">SUBTOTAL 0%</td><td className="p-1 text-right">${subtotal0.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">SUBTOTAL SIN IMPUESTOS</td><td className="p-1 text-right">${(subtotal15 + subtotal0).toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold">DESCUENTO</td><td className="p-1 text-right">${totalDiscount.toFixed(2)}</td></tr>
                  <tr><td className="p-1 font-bold text-blue-700">IVA 15%</td><td className="p-1 text-right">${totalIva.toFixed(2)}</td></tr>
                  <tr className="bg-slate-100 font-bold text-[9px]"><td className="p-1.5">VALOR TOTAL</td><td className="p-1.5 text-right">${finalTotal.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-auto pt-2 text-[7px] text-center text-slate-400 italic">
            Este es un documento electrónico autorizado por el SRI del Ecuador. Para consultar la validez de este comprobante puede ingresar al portal web del SRI.
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideViewer;
