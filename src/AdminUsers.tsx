import React, { useEffect, useState } from 'react';
import { getAllUsers, UserWithBusiness } from './adminService';

interface AdminUsersProps {
  onManageSubscription?: (businessId: number) => void;
}

const AdminUsers: React.FC<AdminUsersProps> = ({ onManageSubscription }) => {
  const [users, setUsers] = useState<UserWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error cargando usuarios', error);
      alert('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Gestión de Usuarios y Suscripciones</h2>
        <button onClick={fetchUsers} className="text-blue-600 hover:text-blue-800 text-sm font-bold">🔄 Actualizar</button>
      </div>
      
      <div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-slate-100">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
              <th className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vencimiento</th>
              <th className="px-5 py-4 border-b-2 border-gray-100 bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-5 border-b border-gray-100 bg-white text-sm">
                  <div className="flex items-center">
                    <div>
                      <p className="text-gray-900 font-bold">{user.email}</p>
                      <p className="text-gray-400 text-xs font-medium mt-0.5">{user.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5 border-b border-gray-100 bg-white text-sm">
                  <p className="text-gray-700 font-medium">
                    {user.business?.name || <span className="text-gray-300 italic">Sin empresa</span>}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-100 bg-white text-sm">
                  {user.business ? (
                    <span className={`relative inline-block px-3 py-1 font-bold text-xs leading-tight rounded-full ${user.business.isActive ? 'text-green-900 bg-green-100' : 'text-red-900 bg-red-100'}`}>
                      {user.business.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-5 py-5 border-b border-gray-100 bg-white text-sm">
                  <p className="text-gray-600 font-medium">
                    {user.business?.subscriptionEnd 
                      ? new Date(user.business.subscriptionEnd).toLocaleDateString() 
                      : <span className="text-gray-300">-</span>}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-100 bg-white text-sm">
                  {user.business && (
                    <button
                      onClick={() => onManageSubscription && onManageSubscription(user.business!.id)}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-lg shadow-slate-200 transition-all active:scale-95"
                    >
                      ⚙️ Gestionar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;