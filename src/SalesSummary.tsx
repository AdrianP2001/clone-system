import React, { useMemo } from 'react';
import { Document } from '../types';

interface SalesSummaryProps {
  documents: Document[];
}

const SalesSummary: React.FC<SalesSummaryProps> = ({ documents }) => {
  const summary = useMemo(() => {
    const stats: Record<string, { name: string; total: number; count: number }> = {};

    documents.forEach(doc => {
      // Solo considerar facturas autorizadas o válidas para el reporte
      if (doc.type === '01') { // 01 = Factura
        const userId = doc.userId || 'unknown';
        const userName = doc.user?.name || doc.user?.email || 'Desconocido';
        
        if (!stats[userId]) {
          stats[userId] = { name: userName, total: 0, count: 0 };
        }
        
        stats[userId].total += Number(doc.total);
        stats[userId].count += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [documents]);

  if (summary.length === 0) return null;

  const maxTotal = Math.max(...summary.map(s => s.total));

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-8">
      <h3 className="font-black text-slate-800 text-lg mb-6 flex items-center gap-2">
        <span className="text-blue-600">📊</span> Rendimiento de Ventas por Vendedor
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.map((item, index) => (
          <div key={index} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-slate-700 truncate pr-2" title={item.name}>
                  {item.name}
                </div>
                <div className="text-xs font-black bg-white px-2 py-1 rounded-lg text-slate-500 shadow-sm">
                  #{index + 1}
                </div>
              </div>
              
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-black text-slate-900">
                  ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-xs text-slate-500 font-medium mb-3">
                {item.count} facturas emitidas
              </div>

              {/* Barra de progreso visual */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(item.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>

            {/* Decoración de fondo */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          </div>
        ))}
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-6 font-medium">
        * Datos basados en facturas registradas en el sistema.
      </p>
    </div>
  );
};

export default SalesSummary;