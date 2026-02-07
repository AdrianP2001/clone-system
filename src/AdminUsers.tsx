import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  business?: {
    id: string;
    name: string;
  };
}

interface Business {
  id: string;
  name: string;
  ruc: string;
}

interface AdminUsersProps {
  onManageSubscription: (id: string) => void;
  onNotify: (msg: string, type?: any) => void;
  isDemoMode: boolean;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const AdminUsers: React.FC<AdminUsersProps> = ({ onManageSubscription, onNotify, isDemoMode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'user' | 'business';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'user', id: '', name: '' });

  const [formData, setFormData] = useState({
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, businessesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers }),
        fetch(`${API_URL}/api/admin/businesses`, { headers })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (businessesRes.ok) setBusinesses(await businessesRes.json());

    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode) {
      onNotify("Esta acción solo está disponible en Modo Producción", "warning");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
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
        body: JSON.stringify({ ...formData, role: 'SUPERADMIN' }) // Forzamos rol SUPERADMIN
      });

      const data = await response.json();

      if (response.ok) {
        onNotify('Usuario creado exitosamente', 'success');
        setShowModal(false);
        setFormData({ email: '', password: '', confirmPassword: '' });
        fetchData();
      } else {
        onNotify('Error: ' + (data.message || data.error || 'Ocurrió un error desconocido'), 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión al intentar crear el usuario.', 'error');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemoMode) {
      onNotify("Esta acción solo está disponible en Modo Producción", "warning");
      return;
    }

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
        fetchData(); // Recargar listas
      } else {
        const err = await response.json();
        onNotify('Error: ' + err.message, 'error');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === 'superadmin@admin.com') {
      onNotify("No se puede eliminar al Superadmin principal", "warning");
      return;
    }
    setDeleteConfirmation({ isOpen: true, type: 'user', id, name: email });
  };

  const handleDeleteBusiness = (id: string, ruc: string) => {
    if (ruc === '9999999999999') {
      onNotify("No se puede eliminar la Empresa SaaS Global", "warning");
      return;
    }
    setDeleteConfirmation({ isOpen: true, type: 'business', id, name: ruc });
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirmation;
    const endpoint = type === 'user' ? 'users' : 'businesses';

    if (isDemoMode) {
      onNotify("Esta acción solo está disponible en Modo Producción", "warning");
      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        onNotify(`${type === 'user' ? 'Usuario' : 'Empresa'} eliminado correctamente`, 'success');
        fetchData();
      } else {
        const err = await response.json();
        onNotify(err.message || err.error || 'Error al eliminar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    } finally {
      setDeleteConfirmation({ ...deleteConfirmation, isOpen: false });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">Panel SaaS</h2>
            <p className="text-slate-500">Gestión de Empresas (Clientes) y Usuarios Administrativos</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={fetchData}
                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-transform flex items-center gap-2"
                title="Recargar datos"
            >
                🔄
            </button>
            <button 
                onClick={() => setShowBusinessModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform shadow-lg shadow-blue-200"
            >
                + Nueva Empresa
            </button>
            <button 
                onClick={() => setShowModal(true)}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
                + Nuevo Usuario
            </button>
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-4 mt-8">Usuarios del Sistema</h3>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                <tr>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Rol</th>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Empresa Asignada</th>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-6 font-bold text-slate-700 dark:text-slate-200">{user.email}</td>
                        <td className="p-6">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                {user.role}
                            </span>
                        </td>
                        <td className="p-6 text-sm text-slate-500">
                            {user.business ? user.business.name : <span className="text-slate-300 italic">N/A (Global)</span>}
                        </td>
                        <td className="p-6 flex gap-3 items-center">
                            {user.business && (
                                <button 
                                    onClick={() => onManageSubscription(user.business!.id)}
                                    className="text-blue-600 font-bold text-xs hover:underline"
                                >
                                    Gestionar Suscripción
                                </button>
                            )}
                            {user.email !== 'superadmin@admin.com' && (
                                <button 
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    className="text-rose-500 font-bold text-xs hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* TABLA DE EMPRESAS */}
      <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-4 mt-12">Empresas Registradas</h3>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                <tr>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Razón Social</th>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">RUC</th>
                    <th className="p-6 font-black text-xs text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {businesses.map(business => (
                    <tr key={business.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-6 font-bold text-slate-700 dark:text-slate-200">{business.name}</td>
                        <td className="p-6 text-sm text-slate-500 font-mono">{business.ruc}</td>
                        <td className="p-6 flex gap-3">
                            <button 
                                onClick={() => onManageSubscription(business.id)}
                                className="text-blue-600 font-bold text-xs hover:underline"
                            >
                                Suscripción
                            </button>
                            {business.ruc !== '9999999999999' && (
                                <button 
                                    onClick={() => handleDeleteBusiness(business.id, business.ruc)}
                                    className="text-rose-500 font-bold text-xs hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Nuevo Superadmin (SaaS)</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Correo Electrónico</label>
                        <input 
                            type="email" 
                            required
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Confirmar Contraseña</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={formData.confirmPassword}
                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Registrar Nueva Empresa (Cliente SaaS)</h3>
                <form onSubmit={handleCreateBusiness} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Razón Social</label>
                        <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.name} onChange={e => setBusinessFormData({...businessFormData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">RUC</label>
                        <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.ruc} onChange={e => setBusinessFormData({...businessFormData, ruc: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Email Contacto</label>
                        <input type="email" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.email} onChange={e => setBusinessFormData({...businessFormData, email: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña Admin</label>
                        <input type="password" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.password} onChange={e => setBusinessFormData({...businessFormData, password: e.target.value})} placeholder="Para el usuario admin" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                        <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.phone} onChange={e => setBusinessFormData({...businessFormData, phone: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Plan Inicial</label>
                        <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.plan} onChange={e => setBusinessFormData({...businessFormData, plan: e.target.value})}>
                            <option value="BASIC">Básico</option>
                            <option value="PRO">Profesional</option>
                            <option value="ENTERPRISE">Empresarial</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dirección</label>
                        <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-500"
                            value={businessFormData.address} onChange={e => setBusinessFormData({...businessFormData, address: e.target.value})} />
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-4">
                        <button type="button" onClick={() => setShowBusinessModal(false)}
                            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">
                            Cancelar
                        </button>
                        <button type="submit"
                            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">
                            Registrar Empresa
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm">
                🗑️
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  ¿Eliminar {deleteConfirmation.type === 'user' ? 'Usuario' : 'Empresa'}?
                </h3>
                <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                  Estás a punto de eliminar a <span className="text-slate-800 dark:text-white font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{deleteConfirmation.name}</span>
                </p>
                {deleteConfirmation.type === 'business' && (
                  <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-800">
                    <p className="text-xs text-rose-600 font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                      <span>⚠️</span> Advertencia
                    </p>
                    <p className="text-xs text-rose-700 mt-1">
                      Se eliminarán permanentemente todos los usuarios, clientes, productos y documentos asociados.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                  className="py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDelete}
                  className="py-4 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;