
import React, { useState } from 'react';

const ClientLogin = () => {
  const [identification, setIdentification] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Conectamos con el endpoint específico para clientes que creamos antes

   const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
   const response = await fetch(`${API_URL}/api/auth/client/login`, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identification, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Guardamos el token y redirigimos
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Guardar flag si el backend lo pide (para forzar cambio de contraseña)
        if (data.requirePasswordChange) {
            localStorage.setItem('requirePasswordChange', 'true');
        }

        // Redirigir al dashboard del cliente (ajusta la ruta según tu router)
        window.location.href = '/portal/dashboard'; 
      } else {
        setError(data.message || 'Credenciales incorrectas. Verifique su Cédula/RUC.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor. Intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Estilos específicos para este componente (Fuentes e Iconos) */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
          .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
          .font-display { font-family: 'Inter', sans-serif; }
        `}
      </style>

      <div className="bg-[#f6f6f8] dark:bg-[#101622] font-display min-h-screen flex flex-col">
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[linear-gradient(135deg,#f0f4ff_0%,#e0e7ff_100%)] dark:bg-[linear-gradient(135deg,#101622_0%,#1a2333_100%)] group/design-root overflow-x-hidden">
          <div className="layout-container flex h-full grow flex-col">
            
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#135bec]/10 bg-white/80 dark:bg-[#101622]/80 backdrop-blur-md px-10 py-3 sticky top-0 z-50">
              <div className="flex items-center gap-4 text-[#135bec]">
                <div className="size-8">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">Portal de Facturación</h2>
              </div>
              <div className="flex flex-1 justify-end gap-8">
                <div className="flex items-center gap-9">
                  <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="/">Inicio</a>
                  <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="#">Ayuda</a>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-[480px] flex flex-col gap-6">
                <div className="text-center space-y-2">
                  <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">Consulta de Facturas</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base">Ingrese su identificación para acceder a sus comprobantes electrónicos.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800">
                  
                  {/* Mensaje de Error */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2" role="alert">
                      <span className="material-symbols-outlined text-lg">error</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Número de Cédula o RUC</label>
                      <div className="flex w-full items-stretch rounded-lg group">
                        <div className="text-slate-400 flex border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                          <span className="material-symbols-outlined text-xl">badge</span>
                        </div>
                        <input 
                          className="form-input flex w-full min-w-0 flex-1 rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#135bec]/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#135bec] h-12 placeholder:text-slate-400 p-3 text-base font-normal" 
                          placeholder="Ej: 1712345678" 
                          type="text"
                          value={identification}
                          onChange={(e) => setIdentification(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Contraseña</label>
                        <span className="text-slate-400 text-xs">(Ingrese su Cédula/RUC nuevamente)</span>
                      </div>
                      <div className="flex w-full items-stretch rounded-lg group">
                        <div className="text-slate-400 flex border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                          <span className="material-symbols-outlined text-xl">lock</span>
                        </div>
                        <div className="relative flex-1">
                          <input 
                            className="form-input w-full rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#135bec]/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#135bec] h-12 placeholder:text-slate-400 p-3 text-base font-normal pr-10" 
                            placeholder="••••••••" 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#135bec] text-white text-base font-bold shadow-lg shadow-[#135bec]/20 hover:bg-[#135bec]/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed" 
                      type="submit"
                      disabled={loading}
                    >
                      <span className="truncate">{loading ? 'Verificando...' : 'Consultar Facturas'}</span>
                    </button>
                  </form>

                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      ¿Problemas para ingresar? 
                      <a className="text-[#135bec] font-bold hover:underline ml-1" href="#">Contactar Soporte</a>
                    </p>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold">Conexión Segura SSL</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">security</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Protección de Datos</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">receipt_long</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Facturación Electrónica</span>
                  </div>
                </div>
              </div>
            </main>

            <footer className="p-6 text-center text-slate-400 dark:text-slate-600 text-xs">
              <p>© 2024 Portal de Facturación. Todos los derechos reservados. Sistema de Facturación Autorizado.</p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientLogin;
