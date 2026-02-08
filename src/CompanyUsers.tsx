import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  isActive: boolean;
}

interface CompanyUsersProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'USER'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      onNotify('Email y contraseña son obligatorios', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al crear usuario');

      setUsers([...users, data.user]);
      onNotify('Usuario creado exitosamente', 'success');
      setShowModal(false);
      setFormData({ email: '', password: '', name: '', role: 'USER' });
    } catch (error: any) {
      onNotify(error.message, 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    setUserToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al eliminar');
      }

      setUsers(users.filter(u => u.id !== userToDelete));
      if (selectedUser?.id === userToDelete) setSelectedUser(null);
      onNotify('Usuario eliminado', 'success');
    } catch (error: any) {
      onNotify(error.message, 'error');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.message || 'Error al actualizar estado');
      }

      const updatedUser = data.user;
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      if (selectedUser?.id === user.id) setSelectedUser(updatedUser);
      
      onNotify(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`, 'success');
    } catch (error: any) {
      onNotify(error.message, 'error');
    }
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    setTempPassword('');
    setShowResetModal(true);
  };

  const confirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !tempPassword) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ temporaryPassword: tempPassword })
      });
      const data = await response.json();
      if (data.success) {
        onNotify(data.message, 'success');
        setShowResetModal(false);
      } else {
        onNotify(data.message || 'Error al resetear', 'error');
      }
    } catch (error) { onNotify('Error de conexión', 'error'); }
  };

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in duration-500">
      {/* PANEL IZQUIERDO: LISTA */}
      <div className="w-1/3 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>👥</span> Equipo
            </h2>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
            >
              +
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center p-10 text-slate-400">Cargando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-10 text-slate-400">No se encontraron usuarios</div>
          ) : (
            filteredUsers.map(user => (
              <div 
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`p-4 rounded-2xl cursor-pointer border-2 transition-all hover:shadow-md ${
                  selectedUser?.id === user.id 
                    ? 'border-blue-500 bg-blue-50/50' 
                    : 'border-transparent bg-slate-50 hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-800 line-clamp-1">{user.name || 'Sin nombre'}</h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${user.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {user.isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mb-2 truncate">{user.email}</p>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}>
                    {user.role === 'ADMIN' ? 'ADMINISTRADOR' : 'VENDEDOR'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLES */}
      <div className="w-2/3">
        {selectedUser ? (
          <div className="h-full flex flex-col gap-6">
            {/* Tarjeta de Perfil */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10 flex gap-6 items-start">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-100 flex items-center justify-center text-4xl shadow-inner">
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-black text-slate-800 mb-1">{selectedUser.name || 'Usuario Sin Nombre'}</h1>
                  <p className="text-slate-500 font-bold text-lg mb-4">{selectedUser.email}</p>
                  
                  <div className="flex gap-3">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${selectedUser.role === 'ADMIN' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-slate-200 text-slate-600'}`}>
                      {selectedUser.role === 'ADMIN' ? '👑 Administrador' : '👤 Vendedor'}
                    </span>
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${selectedUser.isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-red-500 text-white shadow-lg shadow-red-200'}`}>
                      {selectedUser.isActive ? '✅ Activo' : '⛔ Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Acciones */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white flex-1 relative overflow-hidden flex flex-col justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-50"></div>
              
              <div className="relative z-10 max-w-md mx-auto w-full space-y-6">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-center justify-center">
                  <span>⚡</span> Acciones de Gestión
                </h3>

                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2 ${
                    selectedUser.isActive 
                      ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20' 
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20'
                  }`}
                >
                  {selectedUser.isActive ? '⏸️ Desactivar Cuenta' : '▶️ Activar Cuenta'}
                </button>

                <button
                  onClick={handleResetPassword}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  🔑 Resetear Contraseña
                </button>

                <button
                  onClick={() => handleDeleteUser(selectedUser.id)}
                  className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  🗑️ Eliminar Usuario
                </button>

                <p className="text-center text-[10px] text-slate-500 mt-4 font-medium">
                  Las acciones son inmediatas y se reflejarán en el acceso del usuario.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <span className="text-6xl mb-4 opacity-50">👈</span>
            <p className="font-bold">Selecciona un usuario del equipo</p>
            <button 
              onClick={() => setShowModal(true)}
              className="mt-6 px-8 py-3 bg-white border border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              + Crear Nuevo
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Nuevo Miembro</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Juan Pérez"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="email"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="usuario@empresa.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xl opacity-50 hover:opacity-100 transition-opacity"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'USER'})}
                    className={`p-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${formData.role === 'USER' ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400'}`}
                  >
                    Vendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, role: 'ADMIN'})}
                    className={`p-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${formData.role === 'ADMIN' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-slate-50 text-slate-400'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
              🗑️
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">¿Eliminar Usuario?</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Esta acción es irreversible. El usuario perderá el acceso inmediatamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all text-xs uppercase tracking-widest"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESETEAR CONTRASEÑA */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Resetear Contraseña</h3>
                <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={confirmResetPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña Temporal</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Ej: Cédula del usuario"
                  value={tempPassword}
                  onChange={e => setTempPassword(e.target.value)}
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-2 ml-1">
                  El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:scale-105 transition-all text-xs uppercase tracking-widest"
                >
                  Confirmar Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyUsers;