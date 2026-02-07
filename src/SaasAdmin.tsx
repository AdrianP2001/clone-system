import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface Business {
  id: string;
  name: string;
  ruc: string;
  email: string;
  subscriptionEnd: string | null;
  isActive: boolean;
  plan: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  businessId: string | null;
  business: Business | null;
}

interface SaasAdminProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SaasAdmin: React.FC<SaasAdminProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthsToAdd, setMonthsToAdd] = useState<number>(1);
  const [processing, setProcessing] = useState(false);

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar datos');
      
      const data: User[] = await response.json();
      setUsers(data);

      // Extraer empresas únicas de los usuarios
      const uniqueBusinesses = data
        .map(u => u.business)
        .filter((b): b is Business => !!b)
        .filter((b, index, self) => index === self.findIndex(t => t.id === b.id));
      
      setBusinesses(uniqueBusinesses);

      // Si hay una empresa seleccionada, actualizar sus datos
      if (selectedBusiness) {
        const updated = uniqueBusinesses.find(b => b.id === selectedBusiness.id);
        if (updated) setSelectedBusiness(updated);
      }

    } catch (error) {
      console.error(error);
      onNotify('Error al cargar el panel SaaS', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar empresas
  const filteredBusinesses = businesses.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.ruc.includes(searchTerm)
  );

  // Manejar actualización de suscripción
  const handleUpdateSubscription = async () => {
    if (!selectedBusiness) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscriptions/add-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          businessId: selectedBusiness.id, 
          months: monthsToAdd 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        onNotify(`✅ ${result.message}`, 'success');
        await loadData(); // Recargar datos para ver cambios
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      onNotify(error.message || 'Error al actualizar suscripción', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      {/* PANEL IZQUIERDO: LISTA DE EMPRESAS */}
      <div className="w-1/3 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <span>🏢</span> Panel SaaS
          </h2>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar empresa o RUC..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center p-10 text-slate-400">Cargando...</div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center p-10 text-slate-400">No se encontraron empresas</div>
          ) : (
            filteredBusinesses.map(b => (
              <div 
                key={b.id}
                onClick={() => setSelectedBusiness(b)}
                className={`p-4 rounded-2xl cursor-pointer border-2 transition-all hover:shadow-md ${
                  selectedBusiness?.id === b.id 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800 line-clamp-1">{b.name}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {b.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-2">{b.ruc}</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-lg w-fit">
                  <span>📅 Vence:</span>
                  <span className={new Date(b.subscriptionEnd || '') < new Date() ? 'text-red-500' : 'text-blue-600'}>
                    {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL DERECHO: GESTIÓN */}
      <div className="w-2/3">
        {selectedBusiness ? (
          <div className="h-full flex flex-col gap-6">
            {/* Tarjeta de Estado */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">{selectedBusiness.name}</h1>
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">RUC: {selectedBusiness.ruc}</span>
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">Plan: {selectedBusiness.plan || 'Básico'}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium pl-1">
                      <div className="flex items-center gap-2">
                        <span>👤 Usuario Admin:</span>
                        <span className="text-slate-800 font-bold bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100">
                          {users.find(u => u.business?.id === selectedBusiness.id)?.email || 'No asignado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>📧 Email Empresa:</span>
                        <span className="text-slate-800 font-bold">{selectedBusiness.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Estado Actual</p>
                  <div className={`text-2xl font-black ${selectedBusiness.isActive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedBusiness.isActive ? 'OPERATIVO' : 'SUSPENDIDO'}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-bold mb-1">Inicio Suscripción</p>
                  <p className="font-bold text-slate-700">--</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-400 font-bold mb-1">Vencimiento</p>
                  <p className="font-bold text-blue-700 text-lg">
                    {selectedBusiness.subscriptionEnd ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString(undefined, { dateStyle: 'full' }) : 'Sin fecha'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta de Acciones */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50"></div>
              
              <div className="relative z-10">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span>⚡</span> Gestión de Tiempo
                </h3>

                <div className="flex flex-col gap-6 max-w-md">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Seleccionar Periodo</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 3, 6, 12].map(m => (
                        <button
                          key={m}
                          onClick={() => setMonthsToAdd(m)}
                          className={`py-3 rounded-xl font-bold text-sm transition-all ${
                            monthsToAdd === m 
                              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105' 
                              : 'bg-white/10 hover:bg-white/20 text-slate-300'
                          }`}
                        >
                          +{m} Mes{m > 1 ? 'es' : ''}
                        </button>
                      ))}
                      <button
                          onClick={() => setMonthsToAdd(-1)}
                          className={`py-3 rounded-xl font-bold text-sm transition-all ${
                            monthsToAdd === -1 
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' 
                              : 'bg-white/10 hover:bg-red-500/20 text-red-300'
                          }`}
                        >
                          -1 Mes (Restar)
                        </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={handleUpdateSubscription}
                      disabled={processing}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                      {processing ? (
                        <><span>⏳</span> Procesando...</>
                      ) : (
                        <><span>💾</span> Aplicar Cambios</>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-slate-500 mt-3 font-medium">
                      Esta acción actualizará la fecha de vencimiento y el estado de la empresa inmediatamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <span className="text-6xl mb-4 opacity-50">👈</span>
            <p className="font-bold">Selecciona una empresa del listado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaasAdmin;
