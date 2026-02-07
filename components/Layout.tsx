import React, { useState, useRef, useEffect } from 'react';
import { AppNotification, BusinessInfo } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AppNotification[];
  onMarkRead: (id?: string) => void;
  onRemoveNotif: (id: string) => void;
  businessInfo: BusinessInfo;
  currentUser: any;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  notifications,
  onMarkRead,
  onRemoveNotif,
  businessInfo,
  currentUser
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // --- FUNCIÓN PARA CERRAR SESIÓN ---
  const handleLogout = () => {
    localStorage.removeItem('token'); // Borra el token
    localStorage.removeItem('user');  // Borra el usuario
    window.location.reload();         // Recarga la página para que App.tsx detecte que no hay token
  };

  const allMenuItems = [
    // Menú Exclusivo Superadmin
    { id: 'admin-users', label: 'Panel SaaS', icon: '🏢', roles: ['SUPERADMIN'] },

    // Menú General
    { id: 'dashboard', label: 'Panel Principal', icon: '📊', roles: ['ADMIN', 'EMPLOYEE', 'SUPERADMIN'] },

    // Menú Operativo (Solo Empresas)
    { id: 'invoices', label: 'Emisión', icon: '📄', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'credit-notes', label: 'Notas de Crédito', icon: '🔄', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'retentions', label: 'Retenciones', icon: '💰', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'remittances', label: 'Guías de Remisión', icon: '🚚', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'settlements', label: 'Liquidaciones', icon: '📑', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'reports', label: 'Reportes y SRI', icon: '📈', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'sales-book', label: 'Libro de Ventas', icon: '📚', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'ats', label: 'ATS', icon: '📄', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'form-104', label: 'Formulario 104', icon: '💰', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'kardex', label: 'Kardex', icon: '📦', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'profitability', label: 'Rentabilidad', icon: '📈', roles: ['ADMIN', 'EMPLOYEE'] },
    
    // Común
    { id: 'notifications', label: 'Notificaciones', icon: '📧', roles: ['ADMIN', 'EMPLOYEE', 'SUPERADMIN'] },
    
    // Operativo
    { id: 'clients', label: 'Entidades', icon: '👥', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'products', label: 'Inventario', icon: '🏷️', roles: ['ADMIN', 'EMPLOYEE'] },
    { id: 'integrations', label: 'Integración Web', icon: '🔌', roles: ['ADMIN', 'EMPLOYEE'] },
    
    // Configuración
    { id: 'config', label: 'Perfil de Empresa', icon: '🏢', roles: ['ADMIN', 'SUPERADMIN'] },
    { id: 'ai-assistant', label: 'Asistente IA', icon: '🤖', roles: ['ADMIN', 'EMPLOYEE', 'SUPERADMIN'] },
    
    { id: 'logout_btn', label: 'Cerrar Sesión', icon: '🚪', roles: ['ADMIN', 'EMPLOYEE', 'SUPERADMIN', 'CLIENT'] },
  ];

  // Filtrar menú según el rol del usuario
  const menuItems = allMenuItems.filter(item => 
    !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- MANEJADOR DE CLICS DEL MENÚ ---
  const handleTabClick = (id: string) => {
    if (id === 'logout_btn') {
      // Si el ID es el botón de salir, ejecutamos logout
      handleLogout();
    } else {
      // Si no, cambiamos de pestaña normalmente
      setActiveTab(id);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">

      {/* OVERLAY PARA MÓVIL */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tighter text-blue-400">ECUAFACT <span className="text-white">PRO</span></h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-black tracking-widest">Enterprise Edition</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-2">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/30'
                  : item.id === 'logout_btn' 
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 mt-4 border border-transparent hover:border-red-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
            <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center font-black text-white shadow-lg overflow-hidden border border-slate-600">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <span>{businessInfo.name ? businessInfo.name.charAt(0) : 'E'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{businessInfo.name || 'Mi Negocio'}</p>
              <p className="text-[9px] text-slate-500 font-mono truncate">RUC: {businessInfo.ruc || 'Sin configurar'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all print:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h2 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-400 truncate print:hidden">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4 print:hidden">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <svg className="w-5 h-5 lg:w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full text-[9px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-72 lg:w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tighter text-slate-800">Notificaciones</span>
                    <button onClick={() => onMarkRead()} className="text-[10px] font-bold text-blue-600">Leído</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-300 italic text-xs">Sin novedades</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 flex gap-3 group relative ${!n.read ? 'bg-blue-50/20' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            <span className="text-sm">●</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${n.read ? 'text-slate-500' : 'text-slate-900 font-bold'}`}>{n.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;