import React, { useState, useEffect } from 'react';
import { Retention, RetentionTax, BusinessInfo, Client } from '../types';
import { generateRetentionXML, RETENTION_PERCENTAGES } from '../services/retentionService';
import { getLocalDateISO } from '../utils/date';

interface RetentionFormProps {
  business: BusinessInfo;
  clients: Client[];
  onSubmit: (retention: Retention, xml: string) => void;
}

export default function RetentionForm({ business, clients, onSubmit }: RetentionFormProps) {
  const [supplierRuc, setSupplierRuc] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [sustainingDocType, setSustainingDocType] = useState('01');
  const [sustainingDocNumber, setSustainingDocNumber] = useState('');
  const [sustainingDocDate, setSustainingDocDate] = useState('');
  const [sustainingDocTotal, setSustainingDocTotal] = useState('');
  const [taxPeriod, setTaxPeriod] = useState('');
  const [taxes, setTaxes] = useState<RetentionTax[]>([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => {
    // Establecer período fiscal actual (MM/YYYY)
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    setTaxPeriod(`${month}/${year}`);
  }, []);

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSupplierRuc(client.ruc);
      setSupplierName(client.name);
      setSupplierEmail(client.email);
    }
  };

  const addTax = () => {
    setTaxes([...taxes, {
      code: '1', // Renta por defecto
      baseImponible: 0,
      percentageCode: '303',
      percentage: 2,
      taxValue: 0,
      fiscalDocCode: sustainingDocType,
      fiscalDocNumber: sustainingDocNumber
    }]);
  };

  const updateTax = (index: number, field: keyof RetentionTax, value: any) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };

    // Calcular valor retenido automáticamente
    if (field === 'baseImponible' || field === 'percentage') {
      const base = field === 'baseImponible' ? parseFloat(value) : newTaxes[index].baseImponible;
      const percent = field === 'percentage' ? parseFloat(value) : newTaxes[index].percentage;
      newTaxes[index].taxValue = (base * percent) / 100;
    }

    // Actualizar porcentaje según código
    if (field === 'percentageCode') {
      const code = newTaxes[index].code;
      const percentages = code === '1' ? RETENTION_PERCENTAGES.RENTA : RETENTION_PERCENTAGES.IVA;
      const selected = percentages.find(p => p.code === value);
      if (selected) {
        newTaxes[index].percentage = selected.percentage;
        newTaxes[index].taxValue = (newTaxes[index].baseImponible * selected.percentage) / 100;
      }
    }

    setTaxes(newTaxes);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const calculateTotalRetained = () => {
    return taxes.reduce((sum, tax) => sum + tax.taxValue, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierRuc || !supplierName || taxes.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // El número secuencial lo asigna el backend
    const number = '';

    const retention: Retention = {
      id: Date.now().toString(),
      number,
      accessKey: '', // Se genera en el XML
      issueDate: getLocalDateISO(),
      taxPeriod,
      supplierRuc,
      supplierName,
      supplierEmail,
      establishmentCode: business.establishmentCode,
      emissionPointCode: business.emissionPointCode,
      taxes,
      totalRetained: calculateTotalRetained(),
      status: 'PENDIENTE' as any,
      sustainingDocType,
      sustainingDocNumber,
      sustainingDocDate,
      sustainingDocTotal: parseFloat(sustainingDocTotal)
    };

    const xml = generateRetentionXML(retention, business);
    onSubmit(retention, xml);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">📄</span>
          <h2 className="text-2xl font-bold text-gray-800">Nueva Retención</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Proveedor */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">👤</span>
              Proveedor (Sujeto Retenido)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Proveedor
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  RUC del Proveedor *
                </label>
                <input
                  type="text"
                  value={supplierRuc}
                  onChange={(e) => setSupplierRuc(e.target.value)}
                  placeholder="1234567890001"
                  maxLength={13}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social del Proveedor *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período Fiscal *
                </label>
                <input
                  type="text"
                  value={taxPeriod}
                  onChange={(e) => setTaxPeriod(e.target.value)}
                  placeholder="MM/YYYY"
                  pattern="\d{2}/\d{4}"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Documento Sustento */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📅</span>
              Documento Sustento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  value={sustainingDocType}
                  onChange={(e) => setSustainingDocType(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="01">01 - Factura</option>
                  <option value="04">04 - Nota de Crédito</option>
                  <option value="03">03 - Liquidación de Compra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número del Documento *
                </label>
                <input
                  type="text"
                  value={sustainingDocNumber}
                  onChange={(e) => setSustainingDocNumber(e.target.value)}
                  placeholder="001-001-000001234"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Emisión *
                </label>
                <input
                  type="date"
                  value={sustainingDocDate}
                  onChange={(e) => setSustainingDocDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total del Documento *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sustainingDocTotal}
                  onChange={(e) => setSustainingDocTotal(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Retenciones */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-xl">💰</span>
                Impuestos Retenidos
              </h3>
              <button
                type="button"
                onClick={addTax}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <span className="text-lg">➕</span>
                Agregar Impuesto
              </button>
            </div>

            {taxes.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay impuestos retenidos. Haga clic en "Agregar Impuesto"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {taxes.map((tax, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700">Impuesto {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeTax(index)}
                        className="text-red-600 hover:text-red-800 text-lg"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo de Impuesto
                        </label>
                        <select
                          value={tax.code}
                          onChange={(e) => updateTax(index, 'code', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="1">Renta</option>
                          <option value="2">IVA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código Porcentaje
                        </label>
                        <select
                          value={tax.percentageCode}
                          onChange={(e) => updateTax(index, 'percentageCode', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {tax.code === '1' ? (
                            RETENTION_PERCENTAGES.RENTA.map(p => (
                              <option key={p.code} value={p.code}>{p.label}</option>
                            ))
                          ) : (
                            RETENTION_PERCENTAGES.IVA.map(p => (
                              <option key={p.code} value={p.code}>{p.label}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Base Imponible
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={tax.baseImponible}
                          onChange={(e) => updateTax(index, 'baseImponible', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Porcentaje (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={tax.percentage}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Valor Retenido
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={tax.taxValue.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Retenido:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${calculateTotalRetained().toFixed(2)}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Emitir Retención
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
