import React, { useState, useEffect, useMemo } from 'react';
import { Document } from '../types';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const ClientDashboard = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error cargando facturas", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    fetchDocuments();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
        setPasswordMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
        return;
    }

    if (newPassword.length < 6) {
        setPasswordMessage({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
        return;
    }

    setIsSubmittingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/client/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ clientId: user.id, newPassword })
      });
      
      if (response.ok) {
        setPasswordMessage({ text: 'Contraseña actualizada correctamente', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        localStorage.removeItem('requirePasswordChange');
      } else {
        setPasswordMessage({ text: 'Error al actualizar contraseña', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setPasswordMessage({ text: 'Error de conexión', type: 'error' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/portal/login';
  };

  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalAmount = documents.reduce((acc, doc) => acc + doc.total, 0);
    // Assuming 'PENDIENTE' is a status for pending review/payment
    const pendingDocs = documents.filter(d => d.status === 'PENDIENTE' || d.paymentStatus === 'PENDIENTE').length; 
    
    return { totalDocs, totalAmount, pendingDocs };
  }, [documents]);

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
          .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
          .font-display { font-family: 'Inter', sans-serif; }
        `}
      </style>
      
      <div className="bg-[#f6f6f8] dark:bg-[#101622] font-display text-[#0d121b] dark:text-slate-200 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-solid border-[#e7ebf3] dark:border-slate-800 px-4 md:px-10 lg:px-40 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-[#135bec]">
                <div className="size-8 flex items-center justify-center bg-[#135bec] rounded-lg text-white">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <h2 className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight tracking-tight">FacturaPortal</h2>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a className="text-[#135bec] text-sm font-semibold leading-normal border-b-2 border-[#135bec] pb-1" href="#">Dashboard</a>
                <a className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal hover:text-[#135bec] transition-colors" href="#">Facturas</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pl-4 border-l border-[#cfd7e7] dark:border-slate-700">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-[#0d121b] dark:text-white leading-none">{user?.name || 'Cliente'}</p>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400">{user?.identification || 'Invitado'}</p>
                </div>
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-[#135bec]/20 flex items-center justify-center bg-slate-100 text-[#135bec] font-bold">
                    {user?.name?.charAt(0) || 'C'}
                </div>
                <button onClick={handleLogout} className="ml-2 text-slate-400 hover:text-red-500" title="Cerrar Sesión">
                    <span className="material-symbols-outlined">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-8">
          {/* Summary Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Total Facturas</p>
                <span className="material-symbols-outlined text-[#135bec] bg-[#135bec]/10 p-2 rounded-lg">description</span>
              </div>
              <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.totalDocs}</p>
              <p className="text-[#07883b] text-sm font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">check_circle</span> Registradas
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Total Compras</p>
                <span className="material-symbols-outlined text-[#135bec] bg-[#135bec]/10 p-2 rounded-lg">payments</span>
              </div>
              <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">${stats.totalAmount.toFixed(2)}</p>
              <p className="text-[#4c669a] text-sm font-medium flex items-center gap-1">
                 Acumulado histórico
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Pendientes</p>
                <span className="material-symbols-outlined text-[#135bec] bg-[#135bec]/10 p-2 rounded-lg">pending_actions</span>
              </div>
              <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.pendingDocs}</p>
              <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium">Por procesar o pagar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Transactions Table Column */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[#0d121b] dark:text-white text-[22px] font-bold leading-tight tracking-tight">Mis Transacciones</h2>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Número</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Total</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando facturas...</td></tr>
                      ) : documents.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No se encontraron documentos.</td></tr>
                      ) : (
                        documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-[#135bec]/5 transition-colors">
                            <td className="px-4 py-5 text-[#4c669a] dark:text-slate-400 text-sm">
                                {new Date(doc.issueDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-5 text-[#0d121b] dark:text-white text-sm font-medium">{doc.number}</td>
                            <td className="px-4 py-5 text-[#4c669a] dark:text-slate-400 text-sm">
                                {doc.type === '01' ? 'Factura' : 'Nota Crédito'}
                            </td>
                            <td className="px-4 py-5 text-[#0d121b] dark:text-white text-sm font-semibold">${doc.total.toFixed(2)}</td>
                            <td className="px-4 py-5 text-right space-x-2">
                              <button className="inline-flex items-center justify-center p-2 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all" title="Descargar PDF">
                                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                              </button>
                              <button className="inline-flex items-center justify-center p-2 rounded-lg bg-[#135bec]/10 text-[#135bec] hover:bg-[#135bec] hover:text-white transition-all" title="Descargar XML">
                                <span className="material-symbols-outlined text-[20px]">code</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Configuration Column */}
            <div className="flex flex-col gap-4">
              <div className="px-2">
                <h2 className="text-[#0d121b] dark:text-white text-[22px] font-bold leading-tight tracking-tight">Configuración</h2>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-[#135bec]">lock</span>
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white">Cambiar Contraseña</h3>
                </div>
                
                {passwordMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg text-xs ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {passwordMessage.text}
                    </div>
                )}

                <form className="flex flex-col gap-5" onSubmit={handleChangePassword}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-[#4c669a] dark:text-slate-400">Nueva Contraseña</label>
                    <input 
                        className="rounded-lg border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#135bec] focus:ring-[#135bec] text-sm w-full p-2.5 border" 
                        placeholder="Mínimo 6 caracteres" 
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-[#4c669a] dark:text-slate-400">Confirmar Nueva Contraseña</label>
                    <input 
                        className="rounded-lg border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#135bec] focus:ring-[#135bec] text-sm w-full p-2.5 border" 
                        placeholder="Repita la contraseña" 
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                  </div>
                  <button 
                    className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl h-11 px-4 bg-[#135bec] text-white text-sm font-bold leading-normal transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-70" 
                    type="submit"
                    disabled={isSubmittingPassword}
                  >
                    {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </form>
                <div className="mt-8 pt-6 border-t border-[#cfd7e7] dark:border-slate-800">
                  <p className="text-xs text-[#4c669a] dark:text-slate-500 text-center">
                    Asegúrese de usar una contraseña segura.
                  </p>
                </div>
              </div>

              {/* Quick Help Card */}
              <div className="bg-[#135bec]/5 dark:bg-[#135bec]/10 rounded-xl p-6 border border-[#135bec]/10">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#135bec]">help</span>
                  <div>
                    <h4 className="text-sm font-bold text-[#0d121b] dark:text-white mb-1">¿Necesitas ayuda?</h4>
                    <p className="text-xs text-[#4c669a] dark:text-slate-400 leading-relaxed mb-3">
                      Si tienes problemas para visualizar tus facturas, contacta a nuestro soporte técnico.
                    </p>
                    <button className="text-xs font-bold text-[#135bec] underline">Contactar Soporte</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        {/* Footer (Mini) */}
        <footer className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-10">
          <div className="border-t border-[#cfd7e7] dark:border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#4c669a] dark:text-slate-500">© 2024 FacturaPortal. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#135bec]" href="#">Términos</a>
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#135bec]" href="#">Privacidad</a>
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#135bec]" href="#">Soporte</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ClientDashboard;
