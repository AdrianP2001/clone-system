
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBusinessInsights } from '../services/geminiService';
import { Document, Product, DocumentType, SriStatus } from '../types';

interface DashboardProps {
  documents: Document[];
  products: Product[];
  setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, products, setActiveTab }) => {
  const [insights, setInsights] = useState<string>("Generando auditoría IA...");

  const totalSales = documents
    .filter(d => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED)
    .reduce((acc, d) => acc + d.total, 0);

  const lowStock = products.filter(p => p.stock < p.minStock && p.minStock > 0);

  useEffect(() => {
    const fetchInsights = async () => {
      const dataForAI = {
        totalVentas: totalSales,
        inventario: products.map(p => ({ n: p.description, s: p.stock })),
        documentos: documents.length
      };
      const result = await getBusinessInsights(dataForAI);
      setInsights(result || "Error al generar.");
    };
    fetchInsights();
  }, [totalSales, products.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Ventas Reales', value: `$${totalSales.toFixed(2)}`, sub: 'Hoy', color: 'blue', action: () => setActiveTab('reports') },
          { label: 'Alertas Inventario', value: lowStock.length.toString(), sub: 'Items bajos', color: 'rose', action: () => setActiveTab('products') },
          { label: 'Emitidos Hoy', value: documents.length.toString(), sub: 'Doc. SRI', color: 'emerald', action: () => setActiveTab('reports') },
          { label: 'IVA Neto', value: `$${(totalSales * 0.15).toFixed(2)}`, sub: 'Estimado', color: 'indigo', action: () => setActiveTab('reports') },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.action}
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
          >
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-blue-500 transition-colors">{stat.label}</span>
            <div className="mt-4">
              <span className={`text-3xl font-black ${stat.color === 'rose' && lowStock.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {stat.value}
              </span>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 min-h-[400px]">
          <h3 className="font-black text-slate-800 mb-8 uppercase tracking-tighter">Auditoría en Tiempo Real</h3>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-blue-200 animate-pulse">🤖</div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-slate-600 font-medium italic">"{insights}"</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div onClick={() => setActiveTab('products')} className="p-6 rounded-3xl bg-blue-50/50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Top Producto</p>
                <p className="font-black text-slate-800">Licencia Cloud Pro</p>
             </div>
             <div onClick={() => setActiveTab('config')} className="p-6 rounded-3xl bg-indigo-50/50 border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors">
                <p className="text-[10px] font-black text-indigo-600 uppercase mb-2">Próximo Vencimiento</p>
                <p className="font-black text-slate-800">Firma Electrónica: 28 Jul</p>
             </div>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-2xl text-white flex flex-col">
          <h3 className="font-black mb-6 uppercase tracking-tighter text-blue-400">Estado de Inventario</h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {products.map(p => (
              <div key={p.id} className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="truncate w-40">{p.description}</span>
                  <span className={p.stock < p.minStock ? 'text-rose-400' : 'text-blue-400'}>{p.stock} un.</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${p.stock < p.minStock ? 'bg-rose-500' : 'bg-blue-500'}`} 
                    style={{ width: `${Math.min((p.stock / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setActiveTab('products')}
            className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Ver Reporte de Stock
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
