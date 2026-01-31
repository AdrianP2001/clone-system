import React, { useState, useMemo } from 'react';
import { Product, Document, InventoryMovement } from '../types';

interface KardexProps {
  products: Product[];
  documents: Document[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function Kardex({ products, documents, onNotify }: KardexProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const movements = useMemo((): InventoryMovement[] => {
    if (!selectedProductId) return [];

    const productMovements: InventoryMovement[] = [];
    let balance = 0;

    // Filtrar documentos autorizados con el producto
    const relevantDocs = documents
      .filter(doc => {
        if (doc.status !== 'AUTORIZADA') return false;
        const docDate = new Date(doc.issueDate);
        if (startDate && docDate < new Date(startDate)) return false;
        if (endDate && docDate > new Date(endDate)) return false;
        return doc.items?.some(item => item.productId === selectedProductId);
      })
      .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

    relevantDocs.forEach(doc => {
      const item = doc.items?.find(i => i.productId === selectedProductId);
      if (!item) return;

      const isOutbound = doc.type === '01'; // Factura = salida
      const quantity = item.quantity;
      const unitCost = item.unitPrice;

      if (isOutbound) {
        balance -= quantity;
        productMovements.push({
          date: doc.issueDate,
          documentType: 'FACTURA',
          documentNumber: doc.number,
          description: `Venta a ${doc.entityName}`,
          quantityIn: 0,
          quantityOut: quantity,
          balance,
          unitCost,
          totalCost: unitCost * balance
        });
      } else {
        balance += quantity;
        productMovements.push({
          date: doc.issueDate,
          documentType: 'COMPRA',
          documentNumber: doc.number,
          description: `Compra`,
          quantityIn: quantity,
          quantityOut: 0,
          balance,
          unitCost,
          totalCost: unitCost * balance
        });
      }
    });

    return productMovements;
  }, [selectedProductId, documents, startDate, endDate]);

  const exportToCSV = () => {
    if (!selectedProduct) {
      onNotify('Selecciona un producto', 'warning');
      return;
    }

    let csv = `KARDEX DE INVENTARIO\nProducto: ${selectedProduct.description}\nCódigo: ${selectedProduct.code}\n\n`;
    csv += 'Fecha,Tipo,Número,Descripción,Entradas,Salidas,Saldo,Costo Unit.,Costo Total\n';

    movements.forEach(mov => {
      csv += `${mov.date},${mov.documentType},${mov.documentNumber},"${mov.description}",${mov.quantityIn},${mov.quantityOut},${mov.balance},${mov.unitCost.toFixed(2)},${mov.totalCost.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kardex_${selectedProduct.code}_${startDate}_${endDate}.csv`;
    link.click();

    onNotify('Kardex exportado exitosamente');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">📦</span>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kardex de Inventario</h2>
              <p className="text-sm text-slate-500 font-bold">Control de movimientos por producto</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            disabled={movements.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Producto</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
            >
              <option value="">Selecciona producto</option>
              {products.filter(p => p.type === 'FISICO').map(product => (
                <option key={product.id} value={product.id}>
                  {product.code} - {product.description}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        {selectedProduct && (
          <div className="bg-slate-50 p-6 rounded-2xl mb-6 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Código</p>
              <p className="font-black text-slate-800">{selectedProduct.code}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Stock Actual</p>
              <p className="font-black text-slate-800">{selectedProduct.stock} unidades</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Precio</p>
              <p className="font-black text-slate-800">${selectedProduct.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">Categoría</p>
              <p className="font-black text-slate-800">{selectedProduct.category || 'N/A'}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Fecha</th>
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Tipo</th>
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Documento</th>
                <th className="text-left p-3 font-black text-slate-700 text-xs uppercase">Descripción</th>
                <th className="text-right p-3 font-black text-emerald-700 text-xs uppercase">Entradas</th>
                <th className="text-right p-3 font-black text-red-700 text-xs uppercase">Salidas</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Saldo</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Costo Unit.</th>
                <th className="text-right p-3 font-black text-slate-700 text-xs uppercase">Costo Total</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-600">{new Date(mov.date).toLocaleDateString()}</td>
                  <td className="p-3 font-bold text-slate-600">{mov.documentType}</td>
                  <td className="p-3 font-mono text-xs">{mov.documentNumber}</td>
                  <td className="p-3 font-bold text-slate-800">{mov.description}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">{mov.quantityIn || '-'}</td>
                  <td className="p-3 text-right font-bold text-red-600">{mov.quantityOut || '-'}</td>
                  <td className="p-3 text-right font-black text-slate-800">{mov.balance}</td>
                  <td className="p-3 text-right font-bold text-slate-600">${mov.unitCost.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-blue-600">${mov.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movements.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl opacity-20">📭</span>
            <p className="text-slate-400 font-bold mt-4">
              {selectedProductId ? 'No hay movimientos en el rango seleccionado' : 'Selecciona un producto para ver su kardex'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
