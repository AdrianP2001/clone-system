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
  
  // Estados para modales de creación
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [businessFormData, setBusinessFormData] = useState({
    name: '',
    ruc: '',
    email: '',
    address: '',
    phone: '',
    plan: 'BASIC',
    password: ''
  });

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

  const handleResetAdminPassword = async () => {
    if (!selectedBusiness) return;
    const adminUser = users.find(u => u.business?.id === selectedBusiness.id);
    if (!adminUser) return onNotify('No se encontró usuario admin', 'error');

    const tempPass = prompt("Ingrese la nueva contraseña temporal (Cédula):");
    if (!tempPass) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/users/${adminUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ temporaryPassword: tempPass })
      });
      const data = await response.json();
      if (data.success) onNotify(data.message, 'success');
    } catch (error) { onNotify('Error de conexión', 'error'); }
  };

  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/businesses/${selectedBusiness.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onNotify('Empresa eliminada correctamente', 'success');
        setSelectedBusiness(null);
        setShowDeleteModal(false);
        loadData();
      } else {
        const data = await response.json();
        onNotify(data.message || 'Error al eliminar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userFormData.password !== userFormData.confirmPassword) {
      onNotify("Las contraseñas no coinciden", "error");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...userFormData, role: 'SUPERADMIN' })
      });

      const data = await response.json();

      if (response.ok) {
        onNotify('Superadmin creado exitosamente', 'success');
        setShowUserModal(false);
        setUserFormData({ email: '', password: '', confirmPassword: '' });
        loadData();
      } else {
        onNotify('Error: ' + (data.message || data.error || 'Ocurrió un error desconocido'), 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/businesses`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(businessFormData)
      });

      if (response.ok) {
        onNotify('Empresa registrada exitosamente', 'success');
        setShowBusinessModal(false);
        setBusinessFormData({ name: '', ruc: '', email: '', address: '', phone: '', plan: 'BASIC', password: '' });
        loadData();
      } else {
        const err = await response.json();
        onNotify('Error: ' + err.message, 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      {/* PANEL IZQUIERDO: LISTA DE EMPRESAS */}
      <div className="w-1/3 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>🏢</span> Panel SaaS
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowBusinessModal(true)}
                className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                title="Nueva Empresa"
              >
                +
              </button>
              <button 
                onClick={() => setShowUserModal(true)}
                className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                title="Nuevo Superadmin"
              >
                👤
              </button>
            </div>
          </div>
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
      <div className="w-2/3 h-full overflow-y-auto custom-scrollbar pr-2">
        {selectedBusiness ? (
          <div className="flex flex-col gap-6 pb-10">
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
                        <span className="text-slate-800 font-bold bg-yellow-50 px-2 py-0.5 rounded border border-yellow-100 truncate max-w-[150px]">
                          {users.find(u => u.business?.id === selectedBusiness.id)?.email || 'No asignado'}
                        </span>
                        <button onClick={handleResetAdminPassword} className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded text-slate-600 font-bold" title="Resetear Clave">
                          🔑
                        </button>
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

                  <div className="pt-4 border-t border-white/10 space-y-4">
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

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                      <span>🗑️</span> Eliminar Empresa
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

      {/* MODAL CREAR SUPERADMIN */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
                <h3 className="text-xl font-black text-slate-800 mb-6">Nuevo Superadmin</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={userFormData.email}
                            onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                        />
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={userFormData.password}
                            onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                        />
                        <button
                            type="button"
                            className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={userFormData.confirmPassword}
                            onChange={e => setUserFormData({...userFormData, confirmPassword: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={() => setShowUserModal(false)}
                            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all text-xs uppercase tracking-widest"
                        >
                            Crear Usuario
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL CREAR EMPRESA */}
      {showBusinessModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-black text-slate-800 mb-6">Registrar Nueva Empresa</h3>
                <form onSubmit={handleCreateBusiness} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</label>
                        <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.name} onChange={e => setBusinessFormData({...businessFormData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC</label>
                        <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.ruc} onChange={e => setBusinessFormData({...businessFormData, ruc: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Contacto</label>
                        <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.email} onChange={e => setBusinessFormData({...businessFormData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña Admin</label>
                        <input type="password" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.password} onChange={e => setBusinessFormData({...businessFormData, password: e.target.value})} placeholder="Para el usuario admin" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.phone} onChange={e => setBusinessFormData({...businessFormData, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Inicial</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.plan} onChange={e => setBusinessFormData({...businessFormData, plan: e.target.value})}>
                            <option value="BASIC">Básico</option>
                            <option value="PRO">Profesional</option>
                            <option value="ENTERPRISE">Empresarial</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección</label>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={businessFormData.address} onChange={e => setBusinessFormData({...businessFormData, address: e.target.value})} />
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowBusinessModal(false)}
                            className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest">
                            Cancelar
                        </button>
                        <button type="submit"
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all text-xs uppercase tracking-widest">
                            Registrar Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL ELIMINAR EMPRESA */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Empresa?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Esta acción es irreversible. Se borrarán todos los usuarios, facturas y datos asociados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBusiness}
                className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all text-xs uppercase tracking-widest"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaasAdmin;
