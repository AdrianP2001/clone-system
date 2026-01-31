import React, { useState } from 'react';
import { RemittanceGuide, RemittanceRecipient, RemittanceItem, BusinessInfo, Client, Product } from '../types';
import { generateRemittanceXML } from '../services/remittanceService';
import { getLocalDateISO } from '../utils/date';

interface RemittanceFormProps {
  business: BusinessInfo;
  clients: Client[];
  products: Product[];
  onSubmit: (guide: RemittanceGuide, xml: string) => void;
}

export default function RemittanceForm({ business, clients, products, onSubmit }: RemittanceFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [originAddress, setOriginAddress] = useState(business.address);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [carrierRuc, setCarrierRuc] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [route, setRoute] = useState('');
  const [recipients, setRecipients] = useState<RemittanceRecipient[]>([]);
  const [items, setItems] = useState<RemittanceItem[]>([]);

  const addRecipient = () => {
    setRecipients([...recipients, {
      ruc: '',
      name: '',
      address: '',
      reasonForTransfer: 'VENTA',
      fiscalDocNumber: '',
      authorizationCode: '',
      fiscalDocDate: ''
    }]);
  };

  const updateRecipient = (index: number, field: keyof RemittanceRecipient, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setRecipients(newRecipients);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const selectClientForRecipient = (index: number, clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      updateRecipient(index, 'ruc', client.ruc);
      updateRecipient(index, 'name', client.name);
      updateRecipient(index, 'address', client.address);
    }
  };

  const addItem = () => {
    setItems([...items, {
      productCode: '',
      description: '',
      quantity: 1,
      additionalDetail: ''
    }]);
  };

  const updateItem = (index: number, field: keyof RemittanceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      updateItem(index, 'productCode', product.code);
      updateItem(index, 'description', product.description);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !carrierRuc || !carrierName || !licensePlate || recipients.length === 0 || items.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // El número secuencial lo asigna el backend
    const number = '';

    const guide: RemittanceGuide = {
      id: Date.now().toString(),
      number: '', // El backend asigna el número
      accessKey: '', // Se genera en el XML
      issueDate: getLocalDateISO(),
      startDate,
      endDate,
      originAddress,
      destinationAddress: recipients[0]?.address || destinationAddress,
      carrierRuc,
      carrierName,
      licensePlate: licensePlate.toUpperCase(),
      establishmentCode: business.establishmentCode,
      emissionPointCode: business.emissionPointCode,
      recipients,
      items,
      status: 'PENDIENTE' as any,
      route
    };

    const xml = generateRemittanceXML(guide, business);

    onSubmit(guide, xml);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🚚</span>
          <h2 className="text-2xl font-bold text-gray-800">Nueva Guía de Remisión</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Transporte */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">🚚</span>
              Información del Transporte
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio Transporte *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin Transporte *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de Partida *
                </label>
                <input
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ruta
                </label>
                <input
                  type="text"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  placeholder="Ej: Guayaquil - Samborondón"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Información del Transportista */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Transportista</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RUC del Transportista *
                </label>
                <input
                  type="text"
                  value={carrierRuc}
                  onChange={(e) => setCarrierRuc(e.target.value)}
                  placeholder="1234567890001"
                  maxLength={13}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Transportista *
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa del Vehículo *
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  maxLength={8}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Destinatarios */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-xl">📍</span>
                Destinatarios
              </h3>
              <button
                type="button"
                onClick={addRecipient}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <span className="text-lg">➕</span>
                Agregar Destinatario
              </button>
            </div>

            {recipients.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay destinatarios. Haga clic en "Agregar Destinatario"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recipients.map((recipient, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700">Destinatario {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeRecipient(index)}
                        className="text-red-600 hover:text-red-800 text-lg"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Cliente
                        </label>
                        <select
                          onChange={(e) => selectClientForRecipient(index, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">Seleccione o ingrese manualmente</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>
                              {client.name} - {client.ruc}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RUC
                        </label>
                        <input
                          type="text"
                          value={recipient.ruc}
                          onChange={(e) => updateRecipient(index, 'ruc', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={recipient.name}
                          onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={recipient.address}
                          onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Motivo del Traslado
                        </label>
                        <select
                          value={recipient.reasonForTransfer}
                          onChange={(e) => updateRecipient(index, 'reasonForTransfer', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="VENTA">Venta</option>
                          <option value="TRANSFORMACION">Transformación</option>
                          <option value="DEVOLUCION">Devolución</option>
                          <option value="TRASLADO">Traslado entre establecimientos</option>
                          <option value="EXPORTACION">Exportación</option>
                          <option value="IMPORTACION">Importación</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número Documento Fiscal
                        </label>
                        <input
                          type="text"
                          value={recipient.fiscalDocNumber || ''}
                          onChange={(e) => updateRecipient(index, 'fiscalDocNumber', e.target.value)}
                          placeholder="001-001-000001234"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Productos */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-xl">📦</span>
                Productos a Transportar
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <span className="text-lg">➕</span>
                Agregar Producto
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay productos. Haga clic en "Agregar Producto"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-gray-700">Producto {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 text-lg"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Seleccionar Producto
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código
                        </label>
                        <input
                          type="text"
                          value={item.productCode}
                          onChange={(e) => updateItem(index, 'productCode', e.target.value)}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Emitir Guía de Remisión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
