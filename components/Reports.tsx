
import React, { useState, useMemo } from 'react';
import { Document, DocumentType, SriStatus, PaymentStatus, BusinessInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RideViewer from './RideViewer';

interface ReportsProps {
  documents: Document[];
  businessInfo: BusinessInfo;
}

const Reports: React.FC<ReportsProps> = ({ documents, businessInfo }) => {
  const [activeSubTab, setActiveSubTab] = useState<'CARTERA' | 'TRIBUTOS' | 'SRI'>('TRIBUTOS');
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [selectedDocForRide, setSelectedDocForRide] = useState<Document | null>(null);

  const fiscalStats = useMemo(() => {
    let sub15 = 0;
    let sub0 = 0;
    let totalIva = 0;
    let totalNeto = 0;
    documents.filter(d => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED).forEach(doc => {
      // Si el documento tiene ítems guardados, calculamos sobre ellos
      if (doc.items && doc.items.length > 0) {
        doc.items.forEach(it => {
          const base = it.quantity * it.unitPrice - it.discount;
          if (it.taxRate > 0) {
            sub15 += base;
            totalIva += base * (it.taxRate / 100);
          } else {
            sub0 += base;
          }
        });
      } else {
        // Fallback para documentos sin ítems (aproximación)
        const s15 = doc.total / 1.15;
        sub15 += s15;
        totalIva += doc.total - s15;
      }
      totalNeto += doc.total;
    });
    return { sub15, sub0, totalIva, totalNeto };
  }, [documents]);

  const chartData = useMemo(() => {
    return [
      { name: 'Sub15%', valor: fiscalStats.sub15, color: '#2563eb' },
      { name: 'Sub0%', valor: fiscalStats.sub0, color: '#94a3b8' },
      { name: 'IVA 15%', valor: fiscalStats.totalIva, color: '#6366f1' },
    ];
  }, [fiscalStats]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-fit mx-auto lg:mx-0">
        {[
          { id: 'TRIBUTOS', label: 'Resumen Fiscal', icon: '⚖️' },
          { id: 'CARTERA', label: 'Cartera y Cobros', icon: '💰' },
          { id: 'SRI', label: 'Documentos SRI', icon: '🏛️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-8 py-4 rounded-[1.5rem] flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'TRIBUTOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total IVA Generado</p>
              <h4 className="text-4xl font-black text-blue-600 tracking-tighter">${fiscalStats.totalIva.toFixed(2)}</h4>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
              <h5 className="font-black text-sm uppercase tracking-widest mb-4 text-blue-400">💡 Tip Fiscal</h5>
              <p className="text-xs leading-relaxed text-slate-400 font-medium">Recuerda que el IVA se declara mensualmente según tu noveno dígito del RUC.</p>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px]">
            {/* 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            */}
            <div className="flex items-center justify-center h-full text-slate-400">
                Gráfico deshabilitado temporalmente (Incompatibilidad detectada)
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'SRI' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-50">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Comprobantes Autorizados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="py-5 px-10 text-left">Nro Documento</th>
                  <th className="py-5 text-left">Cliente</th>
                  <th className="py-5 text-center">Estado</th>
                  <th className="py-5 px-10 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="py-6 px-10">
                      <p className="text-xs font-black text-slate-800">{doc.number}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{doc.issueDate}</p>
                    </td>
                    <td className="py-6 text-sm font-bold text-slate-600">{doc.entityName}</td>
                    <td className="py-6 text-center">
                      <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Autorizado</span>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex justify-end gap-2">
                         <button 
                          onClick={() => setSelectedDocForRide(doc)}
                          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[9px] font-black uppercase transition-all"
                         >
                           Ver RIDE
                         </button>
                         <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase transition-all">XML</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDocForRide && (
        <RideViewer 
          document={selectedDocForRide} 
          businessInfo={businessInfo} 
          items={selectedDocForRide.items || []} 
          onClose={() => setSelectedDocForRide(null)} 
        />
      )}
    </div>
  );
};

export default Reports;
