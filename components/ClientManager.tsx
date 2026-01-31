
import React, { useState, useMemo } from 'react';
import { Client } from '../types';
import { validateEcuadorianId, getEntityAvatarColor } from '../utils/validation';

interface ClientManagerProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  onNotify: (msg: string, type?: any) => void;
}

// URL del backend
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const ClientManager: React.FC<ClientManagerProps> = ({ clients, setClients, onNotify }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({ type: 'CLIENTE' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'CLIENTE' | 'PROVEEDOR'>('TODOS');
  
  // Estado de carga
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => ({
    total: clients.length,
    clients: clients.filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS').length,
    suppliers: clients.filter(c => c.type === 'PROVEEDOR' || c.type === 'AMBOS').length
  }), [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.ruc.includes(searchTerm);
      const matchesType = filterType === 'TODOS' || c.type === filterType || c.type === 'AMBOS';
      return matchesSearch && matchesType;
    });
  }, [clients, searchTerm, filterType]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      if (client.ruc === '9999999999999') {
        onNotify("Consumidor Final no puede ser editado", "warning");
        return;
      }
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData({ type: 'CLIENTE', address: '', email: '', phone: '', name: '', ruc: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.ruc || !formData.name) {
      onNotify("RUC y Razón Social son obligatorios", "error");
      return;
    }

    if (!validateEcuadorianId(formData.ruc) && formData.ruc !== '9999999999999') {
      onNotify("El RUC/Cédula ingresado no es válido para Ecuador", "error");
      return;
    }

    setLoading(true);
    try {
      if (editingClient) {
        // ACTUALIZAR (PUT)
        const response = await fetch(`${API_URL}/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Error al actualizar cliente');
        
        const updatedClient = await response.json();
        setClients(clients.map(c => c.id === editingClient.id ? updatedClient : c));
        onNotify("Entidad actualizada correctamente en base de datos");
      } else {
        // CREAR (POST)
        const response = await fetch(`${API_URL}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            email: formData.email || '',
            address: formData.address || '',
            phone: formData.phone || '',
            type: formData.type || 'CLIENTE'
          })
        });

        if (!response.ok) throw new Error('Error al crear cliente');

        const newClient = await response.json();
        setClients([newClient, ...clients]);
        onNotify("Entidad guardada exitosamente");
      }
      setShowModal(false);
    } catch (error) {
      console.error(error);
      onNotify("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, ruc: string) => {
    if (ruc === '9999999999999') {
      onNotify("No se puede eliminar Consumidor Final", "error");
      return;
    }
    if (confirm("¿Está seguro de eliminar esta entidad? Se borrará permanentemente de la base de datos.")) {
      try {
        const response = await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Error al eliminar');
        
        setClients(clients.filter(c => c.id !== id));
        onNotify("Entidad eliminada de la base de datos");
      } catch (error) {
        onNotify("Error al eliminar del servidor", "error");
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Entidades Totales', value: stats.total, icon: '📇', color: 'slate' },
          { label: 'Clientes Activos', value: stats.clients, icon: '🛍️', color: 'blue' },
          { label: 'Proveedores', value: stats.suppliers, icon: '🚚', color: 'emerald' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-${s.color}-50 text-${s.color}-600`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-3xl font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controles de Directorio */}
      <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Nombre o RUC..." 
              className="w-full md:w-80 bg-slate-50 p-4 pl-12 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-50 p-1 rounded-2xl">
            {(['TODOS', 'CLIENTE', 'PROVEEDOR'] as const).map(t => (
              <button 
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-6 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${filterType === t ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                {t === 'TODOS' ? 'Todos' : t === 'CLIENTE' ? 'Clientes' : 'Proveedores'}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full lg:w-auto bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200"
        >
          + Agregar Entidad
        </button>
      </div>

      {/* Listado de Tarjetas Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map(client => (
          <div key={client.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl ${getEntityAvatarColor(client.name)} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end">
                   <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                     client.type === 'CLIENTE' ? 'bg-blue-50 text-blue-600' : 
                     client.type === 'PROVEEDOR' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                   }`}>
                     {client.type}
                   </span>
                   <p className="text-[10px] font-mono text-slate-400 mt-2">{client.ruc}</p>
                </div>
              </div>

              <h4 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                {client.name}
              </h4>
              
              <div className="space-y-3 mt-6">
                {client.email && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="opacity-50">✉️</span> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="opacity-50">📞</span> {client.phone}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium truncate">
                    <span className="opacity-50">📍</span> {client.address}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50/50 p-6 flex justify-between items-center border-t border-slate-50">
              <div className="flex gap-2">
                {client.phone && (
                  <button 
                    onClick={() => window.open(`https://wa.me/593${client.phone.replace(/^0/, '')}`, '_blank')}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                    title="WhatsApp"
                  >💬</button>
                )}
                {client.email && (
                  <button 
                    onClick={() => window.location.href = `mailto:${client.email}`}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                    title="Email"
                  >✉️</button>
                )}
                {client.address && (
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(client.address)}`, '_blank')}
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Mapa"
                  >📍</button>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleOpenModal(client)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Editar</button>
                <button onClick={() => handleDelete(client.id, client.ruc)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col">
            <div className="p-12 space-y-8">
              <div className="flex justify-between items-center">
                <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                  {editingClient ? 'Actualizar Entidad' : 'Nueva Entidad'}
                </h4>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl text-2xl">👤</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC / Cédula</label>
                  <input 
                    placeholder="Ej: 1722334455001" 
                    value={formData.ruc}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    onChange={e => setFormData({...formData, ruc: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Entidad</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all appearance-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="PROVEEDOR">PROVEEDOR</option>
                    <option value="AMBOS">AMBOS (B2B)</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social / Nombre Completo</label>
                  <input 
                    placeholder="Ej: Juan Pérez o Empresa S.A." 
                    value={formData.name}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <input 
                    placeholder="email@ejemplo.com" 
                    value={formData.email}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono / WhatsApp</label>
                  <input 
                    placeholder="Ej: 0998877665" 
                    value={formData.phone}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Completa</label>
                  <input 
                    placeholder="Ej: Av. Amazonas y República, Quito" 
                    value={formData.address}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-[2] py-5 font-black bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-100 uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                  {editingClient ? 'Guardar Cambios' : 'Registrar Entidad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManager;
