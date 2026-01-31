import React, { useState, useMemo } from 'react';
import { Product, Document, ProductProfitability } from '../types';

interface ProfitabilityAnalysisProps {
  products: Product[];
  documents: Document[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function ProfitabilityAnalysis({ products, documents, onNotify }: ProfitabilityAnalysisProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'profit' | 'margin'>('profit');

  const profitabilityData = useMemo((): ProductProfitability[] => {
    const productMap = new Map<string, ProductProfitability>();

    // Filtrar documentos autorizados
    const filteredDocs = documents.filter(doc => {
      if (doc.status !== 'AUTORIZADA' || doc.type !== '01') return false;
      const docDate = new Date(doc.issueDate);
      if (startDate && docDate < new Date(startDate)) return false;
      if (endDate && docDate > new Date(endDate)) return false;
      return true;
    });

    // Calcular ventas por producto
    filteredDocs.forEach(doc => {
      doc.items?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const existing = productMap.get(item.productId);
        const revenue = item.total;
        const cost = item.quantity * (item.unitPrice * 0.6); // Estimación: costo = 60% del precio venta

        if (existing) {
          existing.unitsSold += item.quantity;
          existing.totalRevenue += revenue;
          existing.totalCost += cost;
          existing.grossProfit = existing.totalRevenue - existing.totalCost;
          existing.profitMargin = (existing.grossProfit / existing.totalRevenue) * 100;
        } else {
          const grossProfit = revenue - cost;
          productMap.set(item.productId, {
            productId: item.productId,
            productCode: product.code,
            productName: item.description,
            unitsSold: item.quantity,
            totalRevenue: revenue,
            totalCost: cost,
            grossProfit,
            profitMargin: (grossProfit / revenue) * 100
          });
        }
      });
    });

    const data = Array.from(productMap.values());

    // Ordenar según criterio
    data.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.totalRevenue - a.totalRevenue;
        case 'profit': return b.grossProfit - a.grossProfit;
        case 'margin': return b.profitMargin - a.profitMargin;
        default: return 0;
      }
    });

    return data;
  }, [products, documents, startDate, endDate, sortBy]);

  const totals = useMemo(() => {
    return profitabilityData.reduce((acc, item) => ({
      unitsSold: acc.unitsSold + item.unitsSold,
      revenue: acc.revenue + item.totalRevenue,
      cost: acc.cost + item.totalCost,
      profit: acc.profit + item.grossProfit
    }), { unitsSold: 0, revenue: 0, cost: 0, profit: 0 });
  }, [profitabilityData]);

  const exportToCSV = () => {
    let csv = 'Código,Producto,Unidades Vendidas,Ingresos,Costos,Utilidad Bruta,Margen %\n';
    
    profitabilityData.forEach(item => {
      csv += `${item.productCode},"${item.productName}",${item.unitsSold},${item.totalRevenue.toFixed(2)},${item.totalCost.toFixed(2)},${item.grossProfit.toFixed(2)},${item.profitMargin.toFixed(2)}\n`;
    });

    csv += `\nTOTALES,,${totals.unitsSold},${totals.revenue.toFixed(2)},${totals.cost.toFixed(2)},${totals.profit.toFixed(2)},${((totals.profit / totals.revenue) * 100).toFixed(2)}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rentabilidad_${startDate}_${endDate}.csv`;
    link.click();

    onNotify('Análisis exportado exitosamente');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📈</span>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Análisis de Rentabilidad</h2>
              <p className="text-sm text-slate-500 font-bold">Utilidad por producto</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            disabled={profitabilityData.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Ordenar Por</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
            >
              <option value="profit">Utilidad Bruta</option>
              <option value="revenue">Ingresos</option>
              <option value="margin">Margen %</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Unidades Vendidas</p>
            <p className="text-2xl font-black text-blue-900">{totals.unitsSold}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 rounded-2xl border border-emerald-200">
            <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Ingresos Totales</p>
            <p className="text-2xl font-black text-emerald-900">${totals.revenue.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-2xl border border-red-200">
            <p className="text-xs text-red-600 font-bold uppercase mb-1">Costos Totales</p>
            <p className="text-2xl font-black text-red-900">${totals.cost.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200">
            <p className="text-xs text-purple-600 font-bold uppercase mb-1">Utilidad Bruta</p>
            <p className="text-2xl font-black text-purple-900">${totals.profit.toFixed(2)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Código</th>
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Producto</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Unidades</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Ingresos</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Costos</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Utilidad</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Margen %</th>
              </tr>
            </thead>
            <tbody>
              {profitabilityData.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs text-slate-600">{item.productCode}</td>
                  <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                  <td className="p-3 text-right font-bold text-slate-600">{item.unitsSold}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">${item.totalRevenue.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold text-red-600">${item.totalCost.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-purple-600">${item.grossProfit.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-blue-600">{item.profitMargin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {profitabilityData.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl opacity-20">📊</span>
            <p className="text-slate-400 font-bold mt-4">No hay ventas en el rango seleccionado</p>
          </div>
        )}

        <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-800 font-bold">
            💡 Los costos se estiman en 60% del precio de venta. Para mayor precisión, configura costos reales en cada producto.
          </p>
        </div>
      </div>
    </div>
  );
}
