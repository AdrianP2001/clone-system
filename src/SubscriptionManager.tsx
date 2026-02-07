import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Definimos interfaces locales para evitar errores de importación
interface Business {
  id: string | number;
  name: string;
  isActive: boolean;
  subscriptionEnd: string | Date | null;
}

interface UserWithBusiness {
  id: string | number;
  email: string;
  role: string;
  businessId: string | number | null;
  business: Business | null;
}

interface SubscriptionHistoryItem {
  id: string;
  date: string;
  action: string;
  details: string;
  amount: string;
}

interface SubscriptionManagerProps {
  businessId: string | number | null; // Aceptamos string o number
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ businessId, onNotify }) => {
  const [users, setUsers] = useState<UserWithBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | number | null>(businessId);
  const [monthsInput, setMonthsInput] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manage' | 'history'>('manage');
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);

  // Cargar usuarios directamente desde la API
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar lista de empresas');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar datos de empresas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Actualizar selección si cambia la prop (ej. al venir desde Usuarios)
  useEffect(() => {
    if (businessId) setSelectedBusinessId(businessId);
  }, [businessId]);

  // Extraer lista única de empresas desde los usuarios
  const businesses = users
    .map(u => u.business)
    .filter((b): b is Business => !!b)
    // Eliminar duplicados por ID
    .filter((b, index, self) => index === self.findIndex(t => t.id === b.id));

  // Comparación robusta convirtiendo ambos a String
  const selectedBusiness = businesses.find(b => String(b.id) === String(selectedBusinessId));

  const handleUpdateSubscription = async (value: number | string) => {
    if (!selectedBusinessId) {
      onNotify('⚠️ Selecciona una empresa primero', 'warning');
      return;
    }
    
    const monthsToAdd = Number(value);
    if (isNaN(monthsToAdd)) {
      onNotify('❌ Por favor ingresa un número válido', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscriptions/add-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Enviamos businessId asegurando que sea string o número según lo que tenga
        body: JSON.stringify({ businessId: selectedBusinessId, months: monthsToAdd })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar');

      onNotify(data.message || `✅ Suscripción ${monthsToAdd > 0 ? 'extendida' : 'ajustada'} correctamente`, 'success');
      await loadData(); // Recargar para ver la nueva fecha
    } catch (error: any) {
      console.error(error);
      onNotify(error.message || '❌ Error al actualizar suscripción', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Sidebar: Lista de Empresas */}
      <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-700 text-lg tracking-tight">🏢 Empresas</h3>
          <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
            {businesses.length} Total
          </span>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
          {businesses.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedBusinessId(b.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border-2 group ${
                String(selectedBusinessId) === String(b.id)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{b.name}</div>
              <div className="flex justify-between items-center mt-2">
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                  b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {b.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'Sin fecha'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Detalles y Acciones */}
      <div className="w-full md:w-2/3">
        {selectedBusiness ? (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 h-full flex flex-col relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>

            <div className="p-8 pb-0 relative z-10">
              <h2 className="text-3xl font-black text-slate-800 mb-1">{selectedBusiness.name}</h2>
              <p className="text-slate-400 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Gestión de Suscripción
              </p>

              {/* Tabs */}
              <div className="flex gap-4 mt-6 border-b border-slate-100">
                <button 
                  onClick={() => setActiveTab('manage')}
                  className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'manage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ⚡ Gestión Ágil
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  📜 Historial de Pagos
                </button>
              </div>
            </div>

            {activeTab === 'manage' ? (
            <div className="p-8 flex-1 flex flex-col relative z-10">
              <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vencimiento Actual</div>
                <div className="text-2xl font-black text-slate-700">
                  {selectedBusiness.subscriptionEnd 
                    ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString(undefined, { dateStyle: 'long' }) 
                    : 'N/A'}
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estado del Servicio</div>
                <div className={`text-2xl font-black flex items-center gap-2 ${selectedBusiness.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {selectedBusiness.isActive ? (
                    <><span>✅</span> OPERATIVO</>
                  ) : (
                    <><span>⛔</span> SUSPENDIDO</>
                  )}
                </div>
              </div>
              </div>

              <div className="mt-auto bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span>🚀</span> Acciones Rápidas
                </h3>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                   <button onClick={() => handleUpdateSubscription(1)} disabled={loading} className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">
                     +1 Mes
                   </button>
                   <button onClick={() => handleUpdateSubscription(12)} disabled={loading} className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">
                     +1 Año
                   </button>
                   <button onClick={() => handleUpdateSubscription(-1)} disabled={loading} className="py-3 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 rounded-xl font-bold text-sm transition-all">
                     -1 Mes
                   </button>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-4 pt-4 border-t border-white/10">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Ajuste Manual (Meses)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={monthsInput}
                        onChange={(e) => setMonthsInput(e.target.value)}
                        className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white font-black text-lg focus:outline-none focus:bg-white/20 transition-all pl-4"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateSubscription(monthsInput)}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50 active:scale-95 text-xs"
                  >
                    {loading ? '⏳...' : 'Aplicar'}
                  </button>
                </div>
              </div>
            </div>
            ) : (
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Acción</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Detalle</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-600">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-800">{item.action}</td>
                        <td className="p-4 text-xs text-slate-500">{item.details}</td>
                        <td className="p-4 text-sm font-black text-slate-700 text-right">{item.amount}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay historial disponible</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
            <span className="text-6xl mb-6 opacity-50">👈</span>
            <h3 className="text-xl font-black text-slate-500 mb-2">Ninguna empresa seleccionada</h3>
            <p className="max-w-xs mx-auto">Selecciona una empresa de la lista lateral o desde el módulo de Usuarios para gestionar su suscripción.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;