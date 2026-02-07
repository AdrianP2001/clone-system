import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface User {
  id: string;
  email: string;
  role: string;
}

interface CompanyUsersProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const CompanyUsers: React.FC<CompanyUsersProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'USER' });
  const [showPassword, setShowPassword] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/users`, {
        headers: { 'Authorization': `Bearer ` }
      });
      if (response.ok) {
        setUsers(await response.json());
      }
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/business/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer `
        },
        body: JSON.stringify(newUser)
      });
      
      const data = await response.json();
      if (response.ok) {
        onNotify('Usuario creado exitosamente', 'success');
        setNewUser({ email: '', password: '', role: 'USER' });
        loadUsers();
      } else {
        onNotify(data.message || 'Error al crear usuario', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/business/users/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ` }
      });
      
      if (response.ok) {
        onNotify('Usuario eliminado', 'success');
        loadUsers();
      } else {
        const data = await response.json();
        onNotify(data.message || 'Error al eliminar', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 h-[calc(100vh-100px)] animate-in fade-in duration-500">
      {/* Lista de Usuarios */}
      <div className="w-full md:w-2/3 bg-white rounded-[2rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span>👥</span> Usuarios del Sistema
          </h2>
          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{users.length} Usuarios</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center p-10 text-slate-400">Cargando...</div>
          ) : (
            users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{user.email}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteUser(user.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Eliminar usuario"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Formulario de Creación */}
      <div className="w-full md:w-1/3">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-6">
          <h3 className="text-lg font-black mb-6 flex items-center gap-2">
            <span>✨</span> Nuevo Usuario
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="usuario@empresa.com"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Rol</label>
              <select 
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full p-3 bg-white/10 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors [&>option]:text-slate-900"
              >
                <option value="USER">Usuario (Vendedor)</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all mt-4"
            >
              Crear Usuario
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanyUsers;
