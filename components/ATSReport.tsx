import React, { useState } from 'react';
import { Document, BusinessInfo, ATSPurchase, ATSSale } from '../types';
import { generateATSXML } from '../services/atsService';

interface ATSReportProps {
  documents: Document[];
  business: BusinessInfo;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function ATSReport({ documents, business, onNotify }: ATSReportProps) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const generateATS = () => {
    if (!month || !year) {
      onNotify('Selecciona mes y año', 'warning');
      return;
    }

    const period = `${month}${year}`;
    
    // Filtrar documentos del período
    const filteredDocs = documents.filter(doc => {
      const docDate = new Date(doc.issueDate);
      const docMonth = (docDate.getMonth() + 1).toString().padStart(2, '0');
      const docYear = docDate.getFullYear().toString();
      return docMonth === month && docYear === year && doc.status === 'AUTORIZADA';
    });

    // Generar ventas del ATS
    const sales: ATSSale[] = filteredDocs
      .filter(doc => doc.type === '01') // Solo facturas
      .map(doc => {
        const subtotal0 = doc.items?.filter(i => i.taxRate === 0).reduce((sum, item) => sum + (item.unitPrice * item.quantity - item.discount), 0) || 0;
        const subtotal12 = doc.items?.filter(i => i.taxRate > 0).reduce((sum, item) => sum + (item.unitPrice * item.quantity - item.discount), 0) || 0;
        const iva = subtotal12 * 0.15;
        const clientId = doc.entityName.split(' - ')[0] || '';
        
        return {
          establishmentType: '01' as const,
          documentType: doc.type,
          documentNumber: doc.number,
          authorizationNumber: doc.accessKey,
          issueDate: doc.issueDate,
          clientIdType: clientId.length === 13 ? '04' as const : '05' as const,
          clientId,
          clientName: doc.entityName,
          subtotal0,
          subtotal12,
          iva
        };
      });

    // Por ahora, compras vacío (se necesitaría módulo de compras)
    const purchases: ATSPurchase[] = [];

    const xml = generateATSXML({
      ruc: business.ruc,
      businessName: business.name,
      period,
      purchases,
      sales
    });

    // Descargar XML
    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ATS_${business.ruc}_${period}.xml`;
    link.click();

    onNotify('ATS generado exitosamente');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">📊</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Anexo Transaccional Simplificado</h2>
            <p className="text-sm text-slate-500 font-bold">Genera el archivo XML para el SRI</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Mes</label>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
              >
                <option value="">Selecciona mes</option>
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Año</label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                min="2020"
                max="2030"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
              />
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-black text-blue-900 text-sm mb-2">ℹ️ Información</h3>
            <ul className="text-xs text-blue-700 space-y-1 font-bold">
              <li>• El ATS debe presentarse hasta el día 28 del mes siguiente</li>
              <li>• Incluye todas las transacciones autorizadas del período</li>
              <li>• El archivo XML debe subirse al portal del SRI</li>
              <li>• Mantén respaldo de los archivos generados</li>
            </ul>
          </div>

          <button
            onClick={generateATS}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-sm tracking-wide shadow-lg shadow-blue-500/20"
          >
            📥 Generar ATS (XML)
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="font-black text-slate-700 mb-4">Resumen del Período</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">RUC</p>
              <p className="font-black text-slate-800">{business.ruc}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Razón Social</p>
              <p className="font-black text-slate-800 text-sm">{business.name}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Período</p>
              <p className="font-black text-slate-800">{month}/{year}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
