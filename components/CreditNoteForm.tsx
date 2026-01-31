import React, { useState, useEffect } from 'react';
import { Client, Product, Document, DocumentType, SriStatus, PaymentStatus, InvoiceItem, BusinessInfo } from '../types';
import { buildCreditNoteXml, authorizeWithSRI } from '../services/sriService';
import { SignatureOptions } from '../services/xmlSigner';
import { getLocalDateISO } from '../utils/date';

interface Props {
  clients: Client[];
  products: Product[];
  invoices: Document[];
  businessInfo: BusinessInfo;
  signatureOptions: SignatureOptions | null;
  onDocumentCreated: (doc: Document) => void;
}

const CREDIT_NOTE_REASONS = [
  { code: '01', description: 'Devolución de bienes' },
  { code: '02', description: 'Anulación de factura' },
  { code: '03', description: 'Rebaja o descuento' },
  { code: '04', description: 'Corrección de datos' },
  { code: '05', description: 'Promociones' },
  { code: '06', description: 'Bonificaciones' },
  { code: '07', description: 'Descuento especial' },
];

const CreditNoteForm: React.FC<Props> = ({
  clients,
  products,
  invoices,
  businessInfo,
  signatureOptions,
  onDocumentCreated
}) => {
  // Filtrar solo facturas autorizadas
  const authorizedInvoices = invoices.filter(inv =>
    inv.type === DocumentType.INVOICE &&
    inv.status === SriStatus.AUTHORIZED
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Document | null>(null);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [reason, setReason] = useState('01');
  const [customReason, setCustomReason] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Estados de autorización
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [authSteps, setAuthSteps] = useState<string[]>([]);
  const [generatedXml, setGeneratedXml] = useState('');

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.items) {
      // Inicializar con todos los items de la factura
      setItems(selectedInvoice.items.map(item => ({
        ...item,
        quantity: 0, // Usuario debe ingresar cantidad a devolver
      })));
    }
  }, [selectedInvoice]);

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoice = authorizedInvoices.find(inv => inv.id === invoiceId);
    setSelectedInvoice(invoice || null);
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    const maxQty = selectedInvoice?.items?.[index]?.quantity || 0;
    newItems[index].quantity = Math.min(Math.max(0, quantity), maxQty);
    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice - newItems[index].discount;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const validItems = items.filter(item => item.quantity > 0);
    const subtotal0 = validItems.reduce((sum, item) =>
      item.taxRate === 0 ? sum + item.quantity * item.unitPrice - item.discount : sum, 0
    );
    const subtotal15 = validItems.reduce((sum, item) =>
      item.taxRate > 0 ? sum + item.quantity * item.unitPrice - item.discount : sum, 0
    );
    const iva = subtotal15 * 0.15;
    const total = subtotal0 + subtotal15 + iva;

    return { subtotal0, subtotal15, iva, total, validItems };
  };

  const handleAuthorize = async () => {
    if (!selectedInvoice) {
      alert('Debe seleccionar una factura');
      return;
    }

    const { validItems, total } = calculateTotals();

    if (validItems.length === 0) {
      alert('Debe ingresar al menos un ítem con cantidad mayor a 0');
      return;
    }

    setIsAuthorizing(true);
    setAuthStatus('processing');
    setAuthSteps([]);
    setAuthMessage('Iniciando proceso de autorización...');

    try {
      // Generar número de nota de crédito
      const existingCreditNotes = invoices.filter(d => d.type === DocumentType.CREDIT_NOTE);
      const sequential = (existingCreditNotes.length + 1).toString().padStart(9, '0');
      const creditNoteNumber = `${businessInfo.establishmentCode}-${businessInfo.emissionPointCode}-${sequential}`;

      // Crear documento temporal
      const tempDoc: Document = {
        id: Date.now().toString(),
        type: DocumentType.CREDIT_NOTE,
        number: creditNoteNumber,
        accessKey: '',
        issueDate: getLocalDateISO(),
        entityName: selectedInvoice.entityName,
        entityEmail: selectedInvoice.entityEmail,
        entityPhone: selectedInvoice.entityPhone,
        total: total,
        status: SriStatus.PENDING,
        paymentStatus: PaymentStatus.PAID, // Las NC no generan pagos
        additionalInfo: customReason || additionalInfo,
        items: validItems,
        relatedDocumentNumber: selectedInvoice.number,
        relatedDocumentDate: selectedInvoice.issueDate,
        relatedDocumentAccessKey: selectedInvoice.accessKey,
        creditNoteReason: CREDIT_NOTE_REASONS.find(r => r.code === reason)?.description || customReason,
      };

      // Generar XML
      const xml = buildCreditNoteXml(tempDoc, businessInfo, validItems, reason, customReason);
      setGeneratedXml(xml);

      // Autorizar con SRI
      const result = await authorizeWithSRI(
        xml,
        businessInfo.isProduction,
        signatureOptions,
        (step) => {
          setAuthSteps(prev => [...prev, step]);
        }
      );

      if (result.status === SriStatus.AUTHORIZED) {
        tempDoc.status = SriStatus.AUTHORIZED;
        tempDoc.accessKey = result.claveAcceso || '';
        onDocumentCreated(tempDoc);
        setAuthStatus('success');
        setAuthMessage(`Nota de crédito autorizada. Número de autorización: ${result.authNumber}`);

        // Limpiar formulario
        setTimeout(() => {
          resetForm();
        }, 3000);
      } else {
        setAuthStatus('error');
        setAuthMessage(result.message || 'Error en la autorización');
      }
    } catch (error: any) {
      setAuthStatus('error');
      setAuthMessage(error.message || 'Error al procesar la nota de crédito');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setSearchInvoice('');
    setReason('01');
    setCustomReason('');
    setItems([]);
    setAdditionalInfo('');
    setAuthStatus('idle');
    setAuthMessage('');
    setAuthSteps([]);
    setGeneratedXml('');
  };

  const { subtotal0, subtotal15, iva, total } = calculateTotals();

  const filteredInvoices = authorizedInvoices.filter(inv =>
    inv.number.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.entityName.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.accessKey.toLowerCase().includes(searchInvoice.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-5xl">🔄</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Nota de Crédito</h2>
            <p className="text-gray-600">Devoluciones, anulaciones y correcciones de facturas</p>
          </div>
        </div>

        {/* Selección de Factura */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            1. Seleccione la Factura a Modificar
          </h3>

          <div className="mb-4">
            <input
              type="text"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder="Buscar por número, cliente o clave de acceso..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
            {filteredInvoices.map(invoice => (
              <div
                key={invoice.id}
                onClick={() => handleInvoiceSelect(invoice.id)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedInvoice?.id === invoice.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-300'
                  }`}
              >
                <div className="font-semibold text-gray-800">{invoice.number}</div>
                <div className="text-sm text-gray-600">{invoice.entityName}</div>
                <div className="text-sm text-gray-500">{invoice.issueDate}</div>
                <div className="text-lg font-bold text-orange-600 mt-2">
                  ${invoice.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {authorizedInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay facturas autorizadas disponibles para crear notas de crédito
            </div>
          )}
        </div>

        {selectedInvoice && (
          <>
            {/* Motivo */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">2. Motivo de la Nota de Crédito</h3>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 mb-3"
              >
                {CREDIT_NOTE_REASONS.map(r => (
                  <option key={r.code} value={r.code}>
                    {r.code} - {r.description}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descripción adicional del motivo (opcional)"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">3. Seleccione los Items a Devolver/Modificar</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Descripción</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cant. Factura</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Cant. NC</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">P. Unit.</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => {
                      const originalItem = selectedInvoice.items?.[index];
                      const subtotal = item.quantity * item.unitPrice - item.discount;
                      return (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-800">{item.description}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600">
                            {originalItem?.quantity || 0}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={originalItem?.quantity || 0}
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(index, parseFloat(e.target.value) || 0)}
                              className="w-20 p-2 border rounded text-center focus:ring-2 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-800">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                            ${subtotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal 0%:</span>
                  <span className="font-semibold">${subtotal0.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal 15%:</span>
                  <span className="font-semibold">${subtotal15.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>IVA 15%:</span>
                  <span className="font-semibold">${iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-orange-600 pt-2 border-t-2 border-orange-200">
                  <span>TOTAL A DEVOLVER:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Información Adicional (Opcional)
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Botón Autorizar */}
            <div className="flex gap-4">
              <button
                onClick={handleAuthorize}
                disabled={isAuthorizing || items.filter(i => i.quantity > 0).length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isAuthorizing ? (
                  <>
                    <span className="animate-spin text-xl">⏳</span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <span className="text-xl">✅</span>
                    Autorizar Nota de Crédito con SRI
                  </>
                )}
              </button>

              <button
                onClick={resetForm}
                disabled={isAuthorizing}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Panel de Autorización */}
      {authStatus !== 'idle' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Estado de Autorización</h3>

          <div className="space-y-2 mb-4">
            {authSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-orange-600">▸</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {authStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <div className="font-semibold text-green-800">¡Nota de Crédito Autorizada!</div>
                <div className="text-sm text-green-700 mt-1">{authMessage}</div>
              </div>
            </div>
          )}

          {authStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <span className="text-3xl">❌</span>
              <div>
                <div className="font-semibold text-red-800">Error en Autorización</div>
                <div className="text-sm text-red-700 mt-1">{authMessage}</div>
              </div>
            </div>
          )}

          {generatedXml && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-orange-600">
                Ver XML Generado
              </summary>
              <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto">
                {generatedXml}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditNoteForm;
