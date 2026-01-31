
import React, { useState } from 'react';
import { WebOrder, Product, Client, Document, DocumentType, SriStatus, PaymentStatus, BusinessInfo, InvoiceItem } from '../types';
import { generateAccessKey } from '../utils/sri';

interface IntegrationsProps {
  products: Product[];
  clients: Client[];
  businessInfo: BusinessInfo;
  onOrderAuthorized: (doc: Document, items: InvoiceItem[]) => void;
  onNotify: (msg: string, type?: any) => void;
  onUpdateProducts: (updated: Product[]) => void;
}

const Integrations: React.FC<IntegrationsProps> = ({ products, clients, businessInfo, onOrderAuthorized, onNotify, onUpdateProducts }) => {
  const [storeUrl, setStoreUrl] = useState(businessInfo.website || 'https://tu-tienda.com');
  const [storeApiKey, setStoreApiKey] = useState('ck_live_xxxxxxxxxxxxxxxx');
  const [isConfigured, setIsConfigured] = useState(false);

  const [pendingOrders, setPendingOrders] = useState<WebOrder[]>([]);
  const [editingOrder, setEditingOrder] = useState<WebOrder | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<{msg: string, time: string, type: 'info' | 'success' | 'warn' | 'error'}[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setSyncLogs(prev => [{ msg, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 8));
  };

  const saveConfiguration = () => {
    if (!storeUrl || !storeApiKey) {
      onNotify("Ingresa la URL y el API Key de tu tienda", "error");
      return;
    }
    setIsConfigured(true);
    addLog(`Conexión establecida con ${storeUrl}`, "success");
    onNotify("Configuración de tienda guardada");
  };

  const syncInventory = () => {
    if (!isConfigured) {
      onNotify("Primero configura la conexión de la tienda", "warning");
      return;
    }
    setIsSyncing(true);
    addLog("Sincronizando catálogo de productos...", "info");
    
    setTimeout(() => {
      const updatedProducts = products.map(p => ({
        ...p,
        isSynced: true,
        lastSync: new Date().toLocaleString()
      }));
      onUpdateProducts(updatedProducts);
      addLog(`Éxito: ${products.length} productos vinculados.`, "success");
      onNotify("Inventario web actualizado");
      setIsSyncing(false);
    }, 1500);
  };

  const simulateWebhook = () => {
    if (!isConfigured) {
      onNotify("Activa la conexión para recibir pedidos", "warning");
      return;
    }
    setIsSimulating(true);
    addLog("Escuchando Webhook de la tienda...", "info");
    
    setTimeout(() => {
      const isCard = Math.random() > 0.5;
      const hasDiscount = Math.random() > 0.4;
      const product = products[Math.floor(Math.random() * products.length)];
      
      const webDiscount = hasDiscount ? (product.price * 0.10) : 0;
      const subtotal = (product.price - webDiscount);
      const total = subtotal * 1.15;

      const newOrder: WebOrder = {
        id: Math.random().toString(36).substr(2, 9),
        orderNumber: `WEB-${Math.floor(Math.random() * 9000) + 1000}`,
        customerName: "Génesis García",
        customerRuc: "0922334455001",
        customerEmail: "genesis.garcia@test.com",
        paymentMethod: isCard ? 'CARD' : 'TRANSFER',
        paymentConfirmed: isCard, // Las tarjetas se auto-validan
        transactionId: isCard ? `TXN-${Math.random().toString(36).toUpperCase().substr(2, 10)}` : undefined,
        total: total,
        date: new Date().toLocaleString(),
        items: [{
          productId: product.id,
          description: product.description,
          quantity: 1,
          unitPrice: product.price,
          discount: webDiscount,
          taxRate: product.taxRate,
          total: subtotal,
          type: product.type
        }]
      };

      setPendingOrders(prev => [newOrder, ...prev]);
      addLog(`Pedido ${newOrder.orderNumber} detectado. Método: ${isCard ? 'Tarjeta (Confirmada)' : 'Transferencia (Pendiente)'}`, isCard ? "success" : "warn");
      onNotify(`Nuevo pedido web: ${newOrder.orderNumber}`);
      setIsSimulating(false);
    }, 1200);
  };

  const saveEditedOrder = () => {
    if (!editingOrder) return;
    
    const updatedItems = editingOrder.items.map(item => ({
      ...item,
      total: (item.quantity * item.unitPrice) - (item.discount || 0)
    }));

    const newTotal = updatedItems.reduce((acc, item) => {
      const tax = item.taxRate > 0 ? item.total * (item.taxRate / 100) : 0;
      return acc + item.total + tax;
    }, 0);

    const finalizedOrder = { ...editingOrder, items: updatedItems, total: newTotal };
    
    setPendingOrders(prev => prev.map(o => o.id === finalizedOrder.id ? finalizedOrder : o));
    setEditingOrder(null);
    onNotify("Pedido actualizado correctamente");
    addLog(`Edición: Se ajustaron datos del pedido ${finalizedOrder.orderNumber}`, "info");
  };

  const processOrderToSRI = (order: WebOrder) => {
    if (!order.paymentConfirmed) {
      onNotify("El pago debe estar confirmado para emitir", "error");
      return;
    }

    addLog(`Firmando factura para ${order.orderNumber}...`, "info");
    
    setTimeout(() => {
      const sriPaymentCode = order.paymentMethod === 'CARD' ? '19' : '20';
      const newDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        type: DocumentType.INVOICE,
        number: `001-001-${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}`,
        accessKey: generateAccessKey(
          new Date().toLocaleDateString('es-EC').replace(/\//g, ''),
          '01',
          businessInfo.ruc,
          businessInfo.isProduction ? '2' : '1',
          '001', '001', '001'
        ),
        issueDate: new Date().toISOString().split('T')[0],
        entityName: order.customerName,
        entityEmail: order.customerEmail,
        entityPhone: order.customerRuc,
        total: order.total,
        status: SriStatus.AUTHORIZED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: sriPaymentCode,
        items: order.items,
        source: 'TIENDA_ONLINE',
        additionalInfo: order.transactionId ? `Transacción Web: ${order.transactionId}` : ''
      };

      onOrderAuthorized(newDoc, order.items);
      setPendingOrders(prev => prev.filter(o => o.id !== order.id));
      
      addLog(`ÉXITO: Factura ${newDoc.number} emitida.`, "success");
      onNotify(`Factura emitida satisfactoriamente`, 'success');
    }, 2000);
  };

  const confirmTransferManual = (id: string) => {
    setPendingOrders(prev => prev.map(o => o.id === id ? { ...o, paymentConfirmed: true } : o));
    addLog("Pago por transferencia marcado como RECIBIDO.", "success");
    onNotify("Pago confirmado");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL IZQUIERDO: Conexión y Logs */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlace con Tienda</h4>
            <div className="space-y-4">
              <input 
                type="text" 
                value={storeUrl} 
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border border-slate-100 outline-none focus:border-blue-500"
                placeholder="URL de tu tienda"
              />
              <input 
                type="password" 
                value={storeApiKey} 
                onChange={(e) => setStoreApiKey(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border border-slate-100 outline-none focus:border-blue-500"
                placeholder="API Secret Key"
              />
              <button 
                onClick={saveConfiguration}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                Conectar ahora
              </button>
            </div>
            <div className="pt-4 border-t border-slate-50">
               <button 
                onClick={syncInventory}
                disabled={isSyncing || !isConfigured}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-30"
               >
                 {isSyncing ? 'Sincronizando...' : 'Sincronizar Inventario'}
               </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-8 text-white min-h-[300px] flex flex-col shadow-2xl">
             <h4 className="font-black text-blue-400 uppercase tracking-widest text-[10px] mb-6">Actividad de Integración</h4>
             <div className="flex-1 space-y-3 font-mono text-[9px] overflow-y-auto max-h-[250px]">
                {syncLogs.length === 0 ? <p className="text-slate-600 italic">Esperando eventos...</p> : 
                  syncLogs.map((log, i) => (
                    <div key={i}><span className="text-slate-500">[{log.time}]</span> <span className={log.type === 'success' ? 'text-emerald-400' : log.type === 'error' ? 'text-rose-400' : 'text-blue-300'}>{log.msg}</span></div>
                  ))
                }
             </div>
             <button 
                disabled={isSimulating || !isConfigured}
                onClick={simulateWebhook}
                className="mt-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest disabled:opacity-10"
             >
                Simular Pedido de la Web
             </button>
          </div>
        </div>

        {/* PANEL DERECHO: Bandeja de Pedidos */}
        <div className="lg:col-span-2 space-y-6">
           <div className="px-4">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Bandeja de Pedidos Web</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Sincronización automática de pagos con tarjeta y transferencias</p>
           </div>

           <div className="space-y-4">
             {pendingOrders.length === 0 ? (
               <div className="bg-white p-32 rounded-[4rem] text-center border-2 border-dashed border-slate-100">
                  <span className="text-6xl opacity-20">🛒</span>
                  <p className="text-slate-400 font-bold uppercase text-[10px] mt-4">Sin pedidos pendientes</p>
               </div>
             ) : (
               pendingOrders.map(order => (
                 <div key={order.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all animate-in slide-in-from-right-10">
                   <div className="flex flex-col md:flex-row justify-between gap-8">
                     <div className="flex-1 space-y-4">
                       <div className="flex flex-wrap items-center gap-4">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.paymentMethod === 'CARD' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
                            {order.paymentMethod === 'CARD' ? '💳 Tarjeta' : '🏦 Transferencia'}
                          </span>
                          {order.transactionId && (
                            <span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold">
                              ID: {order.transactionId}
                            </span>
                          )}
                          <span className="text-sm font-black text-slate-800">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{order.date}</span>
                       </div>

                       <div>
                         <h4 className="text-xl font-black text-slate-900 tracking-tight">{order.customerName}</h4>
                         <p className="text-xs text-slate-500 font-medium">{order.customerEmail} • {order.customerRuc}</p>
                       </div>

                       <div className="flex flex-wrap gap-8 items-center pt-2">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Monto Cobrado</p>
                            <p className="text-2xl font-black text-slate-900">${order.total.toFixed(2)}</p>
                          </div>
                          
                          {/* Visualización de Descuento Detectado */}
                          {order.items.some(it => (it.discount || 0) > 0) && (
                            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                               <p className="text-[8px] font-black text-emerald-600 uppercase">Descuento Web</p>
                               <p className="text-sm font-black text-emerald-700">-${order.items.reduce((a,b) => a + (b.discount || 0), 0).toFixed(2)}</p>
                            </div>
                          )}

                          <div className={`px-5 py-3 rounded-2xl flex items-center gap-3 ${order.paymentConfirmed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {order.paymentMethod === 'CARD' ? '🛡️ Auto-Validado' : (order.paymentConfirmed ? '✅ Confirmado' : '⏳ Pendiente')}
                            </span>
                          </div>
                       </div>
                     </div>

                     <div className="flex flex-col justify-center gap-3 md:w-56">
                       <button 
                         onClick={() => setEditingOrder({...order})}
                         className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                       >
                         ✏️ Editar Datos
                       </button>

                       {!order.paymentConfirmed && order.paymentMethod === 'TRANSFER' && (
                         <button 
                           onClick={() => confirmTransferManual(order.id)}
                           className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                         >
                           Verificar Depósito
                         </button>
                       )}
                       
                       <button 
                         onClick={() => processOrderToSRI(order)}
                         disabled={!order.paymentConfirmed}
                         className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${order.paymentConfirmed ? 'bg-slate-900 text-white shadow-xl hover:scale-105' : 'bg-slate-100 text-slate-400'}`}
                       >
                         {order.paymentConfirmed ? '🚀 Emitir SRI' : '❌ Sin Pago'}
                       </button>
                     </div>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PEDIDO */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
               <div>
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Corregir Datos del Pedido</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Rastreo de pago: {editingOrder.paymentMethod === 'CARD' ? `TARJETA (${editingOrder.transactionId})` : 'TRANSFERENCIA BANCARIA'}</p>
               </div>
               <button onClick={() => setEditingOrder(null)} className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 hover:text-rose-500 transition-all">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
               {/* Sección Cliente */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                    <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                      value={editingOrder.customerName}
                      onChange={e => setEditingOrder({...editingOrder, customerName: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC / Cédula</label>
                    <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                      value={editingOrder.customerRuc}
                      onChange={e => setEditingOrder({...editingOrder, customerRuc: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Cliente</label>
                    <input 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                      value={editingOrder.customerEmail}
                      onChange={e => setEditingOrder({...editingOrder, customerEmail: e.target.value})}
                    />
                 </div>
               </div>

               {/* Sección Ítems */}
               <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Desglose de Productos y Descuentos</p>
                 {editingOrder.items.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                      <div className="md:col-span-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Producto</p>
                        <p className="font-bold text-sm text-slate-800">{item.description}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cantidad</p>
                        <input 
                          type="number"
                          className="w-full p-3 bg-white rounded-xl font-black text-sm border border-slate-200"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...editingOrder.items];
                            newItems[idx].quantity = Number(e.target.value);
                            setEditingOrder({...editingOrder, items: newItems});
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Precio Unit.</p>
                        <input 
                          type="number"
                          className="w-full p-3 bg-white rounded-xl font-black text-sm border border-slate-200"
                          value={item.unitPrice}
                          onChange={e => {
                            const newItems = [...editingOrder.items];
                            newItems[idx].unitPrice = Number(e.target.value);
                            setEditingOrder({...editingOrder, items: newItems});
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-rose-500 uppercase mb-1">Descuento ($)</p>
                        <input 
                          type="number"
                          className="w-full p-3 bg-rose-50 rounded-xl font-black text-sm border border-rose-100 text-rose-600"
                          value={item.discount || 0}
                          onChange={e => {
                            const newItems = [...editingOrder.items];
                            newItems[idx].discount = Number(e.target.value);
                            setEditingOrder({...editingOrder, items: newItems});
                          }}
                        />
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
               <div className="flex gap-10">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Subtotal Neto</p>
                    <p className="text-xl font-black">${editingOrder.items.reduce((a,b) => a + (b.quantity * b.unitPrice - (b.discount || 0)), 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-blue-400 uppercase">Total + IVA 15%</p>
                    <p className="text-3xl font-black text-blue-400">
                      ${(editingOrder.items.reduce((a,b) => a + (b.quantity * b.unitPrice - (b.discount || 0)), 0) * 1.15).toFixed(2)}
                    </p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setEditingOrder(null)} className="px-8 py-4 font-black text-[10px] uppercase text-slate-400 hover:text-white transition-colors">Cancelar</button>
                  <button 
                    onClick={saveEditedOrder}
                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40"
                  >
                    Guardar Cambios
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
