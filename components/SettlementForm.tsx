import React, { useState } from 'react';
import { PurchaseSettlement, SettlementPayment, InvoiceItem, BusinessInfo, Client, Product } from '../types';
import { generateSettlementXML } from '../services/settlementService';
import { getLocalDateISO } from '../utils/date';

interface SettlementFormProps {
  business: BusinessInfo;
  clients: Client[];
  products: Product[];
  onSubmit: (settlement: PurchaseSettlement, xml: string) => void;
}

export default function SettlementForm({ business, clients, products, onSubmit }: SettlementFormProps) {
  const [supplierRuc, setSupplierRuc] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<SettlementPayment[]>([{
    paymentMethodCode: '01',
    total: 0
  }]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSupplierRuc(client.ruc);
      setSupplierName(client.name);
      setSupplierEmail(client.email);
      setSupplierAddress(client.address);
    }
  };

  const addItem = () => {
    setItems([...items, {
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 15,
      total: 0,
      type: 'FISICO'
    }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calcular total del ítem
    const item = newItems[index];
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discount || 0;
    item.total = subtotal - discountAmount;

    setItems(newItems);
    updatePaymentTotal();
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    updatePaymentTotal();
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateItem(index, 'productId', product.id);
      updateItem(index, 'description', product.description);
      updateItem(index, 'unitPrice', product.price);
      updateItem(index, 'taxRate', product.taxRate);
    }
  };

  const calculateSubtotals = () => {
    let subtotal12 = 0;
    let subtotal0 = 0;

    items.forEach(item => {
      if (item.taxRate > 0) {
        subtotal12 += item.total;
      } else {
        subtotal0 += item.total;
      }
    });

    const subtotal = subtotal12 + subtotal0;
    const iva = subtotal12 * 0.15;
    const total = subtotal + iva;

    return { subtotal12, subtotal0, subtotal, iva, total };
  };

  const updatePaymentTotal = () => {
    const { total } = calculateSubtotals();
    if (payments.length > 0) {
      const newPayments = [...payments];
      newPayments[0].total = total;
      setPayments(newPayments);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierRuc || !supplierName || !supplierAddress || items.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const { subtotal12, subtotal0, subtotal, iva, total } = calculateSubtotals();

    // El número secuencial lo asigna el backend
    const number = '';

    const settlement: PurchaseSettlement = {
      id: Date.now().toString(),
      number,
      accessKey: '', // Se genera en el XML
      issueDate: getLocalDateISO(),
      supplierRuc,
      supplierName,
      supplierEmail,
      supplierAddress,
      establishmentCode: business.establishmentCode,
      emissionPointCode: business.emissionPointCode,
      items,
      subtotal12,
      subtotal0,
      subtotalNotSubject: 0,
      subtotalExempt: 0,
      subtotal,
      iva,
      tip: 0,
      total,
      payments,
      status: 'PENDIENTE' as any,
      additionalInfo
    };

    const xml = generateSettlementXML(settlement, business);
    onSubmit(settlement, xml);
  };

  const totals = calculateSubtotals();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">📊</span>
          <h2 className="text-2xl font-bold text-gray-800">Nueva Liquidación de Compra</h2>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Nota:</strong> Las liquidaciones de compra se emiten cuando compras bienes o servicios
            a personas sin RUC o que no están obligadas a emitir comprobantes de venta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Proveedor */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">👤</span>
              Proveedor (Sin RUC)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Proveedor (Opcional)
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccione o ingrese manualmente</option>
                  {clients.filter(c => c.type !== 'CLIENTE').map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.ruc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cédula o RUC del Proveedor *
                </label>
                <input
                  type="text"
                  value={supplierRuc}
                  onChange={(e) => setSupplierRuc(e.target.value)}
                  placeholder="0912345678 o 0912345678001"
                  maxLength={13}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email del Proveedor
                </label>
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección del Proveedor *
                </label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Productos/Servicios */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-xl">🛒</span>
                Productos / Servicios
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <span className="text-lg">➕</span>
                Agregar Ítem
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay ítems. Haga clic en "Agregar Ítem"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700">Ítem {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-lg"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Producto (Opcional)
                        </label>
                        <select
                          onChange={(e) => selectProduct(index, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Seleccione o ingrese manualmente</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.code} - {product.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Precio Unitario
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Descuento
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          IVA (%)
                        </label>
                        <select
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value={15}>15% IVA</option>
                          <option value={0}>0% IVA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.total.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 font-bold text-purple-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Forma de Pago */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">💰</span>
              Forma de Pago
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago
                </label>
                <select
                  value={payments[0]?.paymentMethodCode || '01'}
                  onChange={(e) => {
                    const newPayments = [...payments];
                    newPayments[0].paymentMethodCode = e.target.value;
                    setPayments(newPayments);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="01">Sin utilización del sistema financiero</option>
                  <option value="19">Tarjeta de débito</option>
                  <option value="20">Otros con utilización del sistema financiero</option>
                </select>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Información Adicional
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
              placeholder="Observaciones o detalles adicionales..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Totales */}
          <div className="bg-purple-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal IVA 15%:</span>
              <span className="font-semibold">${totals.subtotal12.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal IVA 0%:</span>
              <span className="font-semibold">${totals.subtotal0.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">IVA 15%:</span>
              <span className="font-semibold">${totals.iva.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t-2 border-purple-200">
              <span className="text-xl font-bold text-gray-800">Total:</span>
              <span className="text-2xl font-bold text-purple-600">
                ${totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Emitir Liquidación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
