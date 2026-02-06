import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import Dashboard from '../components/Dashboard';
import InvoiceForm from '../components/InvoiceForm';
import CreditNoteForm from '../components/CreditNoteForm';
import RetentionForm from '../components/RetentionForm';
import RemittanceForm from '../components/RemittanceForm';
import SettlementForm from '../components/SettlementForm';
import SalesBook from '../components/SalesBook';
import ATSReport from '../components/ATSReport';
import Form104 from '../components/Form104';
import Kardex from '../components/Kardex';
import ProfitabilityAnalysis from '../components/ProfitabilityAnalysis';
import NotificationSettingsComponent from '../components/NotificationSettings';
import AIAssistant from '../components/AIAssistant';
import ClientManager from '../components/ClientManager';
import ProductManager from '../components/ProductManager';
import Reports from '../components/Reports';
import Integrations from '../components/Integrations';
import { Client, Product, AppNotification, Document, DocumentType, SriStatus, BusinessInfo, InvoiceItem, NotificationSettings } from '../types';
import { MOCK_CLIENTS, MOCK_PRODUCTS } from '../constants';

import Login from './Login';
<<<<<<< HEAD
import ClientLogin from './ClientLogin';
import ClientDashboard from './ClientDashboard';
import SubscriptionManager from './SubscriptionManager';
import AdminUsers from './AdminUsers';
=======
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
import { client } from './api/client';

// URL del backend definida en variable de entorno o fallback
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const App: React.FC = () => {

  // ESTADO DE SEGURIDAD: Verificamos si existe el token al cargar
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
<<<<<<< HEAD
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
=======
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a

  // --- ESTADO DEL MODO DEMO ---
  // Por defecto false (Modo Producción).
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Inicializamos vacíos para llenar con datos de la BD
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: 'CORPORACION EJEMPLO S.A.',
    tradename: 'ECUAFACT ENTERPRISE',
    ruc: '1791234567001',
    address: 'Av. 10 de Agosto N22 y Riofrío, Quito',
    branchAddress: 'C.C. El Recreo, Local 45, Quito',
    phone: '022334455',
    email: 'facturacion@ecuafac.com',
    website: 'https://mi-tienda.com',
    category: 'RETAIL',
    regime: 'RIMPE_EMPRENDEDOR',
    isAccountingObliged: false,
    specialTaxpayerCode: '',
    withholdingAgentCode: '',
    establishmentCode: '001',
    emissionPointCode: '001',
    isProduction: false,
    logo: '',
    themeColor: '#2563eb',
    taxpayerType: 'EMPRESA'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    emailProvider: 'smtp',
    smsEnabled: false,
    smsProvider: 'twilio',
    whatsappEnabled: false,
    whatsappProvider: 'twilio',
    paymentRemindersEnabled: false,
    reminderDaysBefore: [7, 3, 1]
  });

  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePassword, setSignaturePassword] = useState<string>('');
  const [signatureBuffer, setSignatureBuffer] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', text: 'Bienvenido al sistema Ecuafact Pro', type: 'info', time: new Date(), read: false },
  ]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const showNotify = useCallback((text: string, type: AppNotification['type'] = 'success') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      time: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    setToasts(prev => [...prev, newNotif]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newNotif.id)), 4000);
  }, []);

  // 🔥 EFECTO DE CARGA DE DATOS DESDE POSTGRESQL
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      // CASO A: MODO DEMO (Usamos tus Mocks originales)
      if (isDemoMode) {
        console.log("🔶 MODO DEMO ACTIVADO: Usando datos locales");
        setClients(MOCK_CLIENTS);
        setProducts(MOCK_PRODUCTS);
        // Si no tienes mocks de facturas, pones un array vacío o creas MOCK_DOCUMENTS
        setDocuments([]);
        setBusinessInfo({
          name: 'EMPRESA DEMO S.A.',
          ruc: '1799999999001',
          address: 'Modo Demostración',
          email: 'demo@ecuafact.com',
          phone: '0999999999',
          logo: ''
        });
        return;
      }
      // CASO B: MODO REAL (Cargar desde BD)

      try {
        console.log("🟢 MODO PRODUCCIÓN: Conectando a Base de Datos...");
        const [empresa, clientes, productos, docs] = await Promise.all([
          client.get<BusinessInfo>('/business'),
          client.get<Client[]>('/clients'),
          client.get<Product[]>('/products'),
          client.get<any[]>('/documents')
        ]);

        if (empresa) setBusinessInfo(empresa);
        setClients(clientes);
        setProducts(productos);
        setDocuments(docs); console.log("✅ Datos cargados desde la Base de Datos");

      } catch (error) {
        console.error("❌ Error conectando a DB:", error);
        // Opcional: Si falla la DB, ¿quieres pasar a Demo automáticamente?
        // setIsDemoMode(true); 
        alert("Error de conexión con el servidor. Revise su internet.");
      }
    };

    loadData();
  }, [isAuthenticated, isDemoMode]); // <-- Se recarga si cambias el switch



  // Cargar el archivo de firma cuando se selecciona
  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      try {
        const buffer = await file.arrayBuffer();
        setSignatureBuffer(buffer);
        showNotify('Firma digital cargada correctamente');
      } catch (error) {
        showNotify('Error al cargar la firma digital', 'error');
      }
    }
  };

  // ⚡ HANDLER AUTORIZACIÓN: Guarda en BD
  const handleDocumentAuthorized = async (doc: Document, items?: InvoiceItem[]) => {
<<<<<<< HEAD
    // MODO DEMO: Guardado local simulado (Memoria)
    if (isDemoMode) {
      setDocuments(prev => [doc, ...prev]);
      if (items) {
        setProducts(prev => prev.map(p => {
          const item = items.find(i => i.productId === p.id);
          if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          return p;
        }));
      }
      showNotify("Documento autorizado (Modo Demo - Local)", "success");
      return;
    }

=======
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
    if (!signatureFile && businessInfo.isProduction) {
      showNotify("Firma requerida para producción", "error");
      return;
    }

    try {
<<<<<<< HEAD
      const token = localStorage.getItem('token');
      // 1. Intentar guardar en Base de Datos
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
=======
      // 1. Intentar guardar en Base de Datos
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
        body: JSON.stringify({ ...doc, items })
      });

      if (!response.ok) throw new Error('Error guardando en BD');
      const savedDoc = await response.json();

      // 2. Actualizar estado local con datos reales de BD
      setDocuments(prev => [savedDoc, ...prev]);

      // 3. Recargar productos para actualizar stock
      if (items) {
<<<<<<< HEAD
        const prodRes = await fetch(`${API_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
=======
        const prodRes = await fetch(`${API_URL}/api/products`);
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
        if (prodRes.ok) setProducts(await prodRes.json());
      }

      showNotify("Documento autorizado y guardado en base de datos", "success");

    } catch (error) {
      console.error(error);
      // Fallback: Actualizar estado local aunque falle la BD para que el usuario no pierda el trabajo
      setDocuments(prev => [doc, ...prev]);
      if (items) {
        setProducts(prev => prev.map(p => {
          const item = items.find(i => i.productId === p.id);
          if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          return p;
        }));
      }
      showNotify("Documento autorizado (Guardado localmente por error de BD)", "warning");
    }
  };

  const toggleEnvironment = () => {
    const nextState = !businessInfo.isProduction;
    if (nextState && !signatureFile) {
      showNotify("Sube tu firma .p12 para activar PRODUCCIÓN", "warning");
    }
    setBusinessInfo(prev => ({ ...prev, isProduction: nextState }));
    showNotify(`Modo ${nextState ? 'PRODUCCIÓN' : 'PRUEBAS'} activo`);
  };

  // 💾 GUARDAR CONFIGURACIÓN EMPRESARIAL
  const saveBusinessConfig = async () => {
    try {
<<<<<<< HEAD
      const token = localStorage.getItem('token');
      // Excluir el ID del objeto para evitar errores de actualización en Prisma
      const { id, ...dataToSave } = businessInfo as any;
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
=======
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessInfo)
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
      });

      if (!response.ok) throw new Error('Error en servidor');

      showNotify("Perfil Fiscal actualizado en base de datos");
    } catch (error) {
      console.error(error);
      showNotify("Error al guardar configuración", "error");
    }
  };

  // ✅ NUEVA FUNCIÓN: Guardar configuración de notificaciones en BD
  const handleSaveNotificationSettings = async (settings: NotificationSettings) => {
    // 1. Actualizar estado local inmediatamente
    setNotificationSettings(settings);

    try {
      // 2. Fusionar con la info del negocio actual
      const updatedBusinessInfo = {
        ...businessInfo,
        notificationSettings: settings
      };

<<<<<<< HEAD
      const token = localStorage.getItem('token');
      // 3. Enviar al backend
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
=======
      // 3. Enviar al backend
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
        body: JSON.stringify(updatedBusinessInfo)
      });

      if (!response.ok) throw new Error('Error guardando en servidor');

      // 4. Actualizar estado de negocio local
      setBusinessInfo(updatedBusinessInfo);
      showNotify('Configuración de notificaciones guardada en Base de Datos', 'success');
    } catch (error) {
      console.error(error);
      showNotify('Error al guardar configuración remota', 'error');
    }
  };

  // ESTADO DE SEGURIDAD: Verificamos si existe el token al cargar
  //LA COMPUERTA (Inserta esto ANTES del 'return' principal)
<<<<<<< HEAD
  
  // 1. Ruta pública para Portal de Clientes
  if (window.location.pathname === '/portal/login') {
    return <ClientLogin />;
  }
  // 2. Ruta protegida para Dashboard de Clientes
  if (window.location.pathname === '/portal/dashboard') {
    return <ClientDashboard />;
  }

=======
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />;
      case 'invoices': return <InvoiceForm clients={clients} products={products} businessInfo={businessInfo} signatureFile={signatureFile} signaturePassword={signaturePassword} notificationSettings={notificationSettings} onNotify={showNotify} onAuthorize={handleDocumentAuthorized} />;
      case 'credit-notes': return (
        <CreditNoteForm
          clients={clients}
          products={products}
          invoices={documents}
          businessInfo={businessInfo}
          signatureOptions={signatureFile && signaturePassword ? {
            p12File: signatureFile,
            password: signaturePassword,
            claveAcceso: '' // Se genera dentro del componente
          } : null}
          onDocumentCreated={handleDocumentAuthorized}
        />
      );
      case 'retentions': return <RetentionForm business={businessInfo} clients={clients} onSubmit={(retention, xml) => showNotify('Retención generada exitosamente')} />;
      case 'remittances': return <RemittanceForm business={businessInfo} clients={clients} products={products} onSubmit={(guide, xml) => showNotify('Guía de remisión generada exitosamente')} />;
      case 'settlements': return <SettlementForm business={businessInfo} clients={clients} products={products} onSubmit={(settlement, xml) => showNotify('Liquidación generada exitosamente')} />;
      case 'sales-book': return <SalesBook documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'ats': return <ATSReport documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'form-104': return <Form104 documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'kardex': return <Kardex products={products} documents={documents} onNotify={showNotify} />;
      case 'profitability': return <ProfitabilityAnalysis products={products} documents={documents} onNotify={showNotify} />;
      case 'notifications': return <NotificationSettingsComponent settings={notificationSettings} onSave={handleSaveNotificationSettings} onNotify={showNotify} />;
<<<<<<< HEAD
      case 'reports': return <Reports documents={documents} businessInfo={businessInfo} />;      case 'ai-assistant': return <AIAssistant businessInfo={businessInfo} />;
      // Pasamos el ID seleccionado al Manager de Suscripciones
      case 'admin-subscriptions': return <SubscriptionManager businessId={selectedBusinessId} onNotify={showNotify} />;
      // Pasamos la función para navegar a suscripciones
      case 'admin-users': return <AdminUsers onManageSubscription={(id) => { setSelectedBusinessId(id); setActiveTab('admin-subscriptions'); }} />;

      
      case 'clients': return <ClientManager clients={clients} setClients={setClients} onNotify={showNotify} isDemoMode={isDemoMode}/>;
      case 'products': return <ProductManager products={products} setProducts={setProducts} onNotify={showNotify} isDemoMode={isDemoMode} />;
=======
      case 'reports': return <Reports documents={documents} businessInfo={businessInfo} />;
      case 'ai-assistant': return <AIAssistant />;
      case 'clients': return <ClientManager clients={clients} setClients={setClients} onNotify={showNotify} />;
      case 'products': return <ProductManager products={products} setProducts={setProducts} onNotify={showNotify} />;
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
      case 'integrations': return <Integrations products={products} clients={clients} businessInfo={businessInfo} onOrderAuthorized={handleDocumentAuthorized} onNotify={showNotify} onUpdateProducts={setProducts} />;
      case 'config':

        return (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header del Perfil */}
            <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center cursor-pointer overflow-hidden group relative"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {businessInfo.logo ? <img src={businessInfo.logo} className="w-full h-full object-cover" /> : <span className="text-3xl opacity-20">📸</span>}
                  <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black text-white uppercase">Editar</div>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file instanceof File) {
                      const reader = new FileReader();
                      reader.onloadend = () => setBusinessInfo(prev => ({ ...prev, logo: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">{businessInfo.tradename || businessInfo.name}</h2>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">RUC: {businessInfo.ruc}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    const newType = businessInfo.taxpayerType === 'EMPRESA' ? 'PERSONA_NATURAL' : 'EMPRESA';
                    setBusinessInfo(prev => ({ ...prev, taxpayerType: newType }));
                    showNotify(`Cambiado a ${newType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}`);
                  }}
                  className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${businessInfo.taxpayerType === 'EMPRESA' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-purple-600 text-white shadow-purple-100'
                    }`}
                >
                  {businessInfo.taxpayerType === 'EMPRESA' ? '🏢 Empresa' : '👤 Persona Natural'}
                </button>
                <button
                  onClick={toggleEnvironment}
                  className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${businessInfo.isProduction ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-amber-500 text-white shadow-amber-100'
                    }`}
                >
                  {businessInfo.isProduction ? '🚀 Ambiente Producción' : '🧪 Ambiente Pruebas'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Datos Tributarios */}
                <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                  <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter border-b border-slate-50 pb-4 flex items-center gap-3">
                    <span className="text-blue-500">📄</span> Información Legal (SRI)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RUC</label>
                      <input
                        type="text"
                        value={businessInfo.ruc}
                        placeholder="1234567890001"
                        maxLength={13}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-blue-500"
                        onChange={e => setBusinessInfo({ ...businessInfo, ruc: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        {businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Nombre Completo' : 'Razón Social'}
                      </label>
                      <input
                        type="text"
                        value={businessInfo.name}
                        placeholder={businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Ej: Juan Pérez Gómez' : 'Ej: CORPORACION EJEMPLO S.A.'}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                        onChange={e => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                      <input
                        type="text"
                        value={businessInfo.tradename}
                        placeholder={businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Ej: Tienda Juan' : 'Ej: ECUAFACT ENTERPRISE'}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500"
                        onChange={e => setBusinessInfo({ ...businessInfo, tradename: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Matriz</label>
                      <input type="text" value={businessInfo.address} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500" onChange={e => setBusinessInfo({ ...businessInfo, address: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dirección Sucursal</label>
                      <input type="text" value={businessInfo.branchAddress} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-500" onChange={e => setBusinessInfo({ ...businessInfo, branchAddress: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estab.</label>
                      <input type="text" placeholder="001" value={businessInfo.establishmentCode} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-sm" onChange={e => setBusinessInfo({ ...businessInfo, establishmentCode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pto. Emisión</label>
                      <input type="text" placeholder="001" value={businessInfo.emissionPointCode} className="w-full p-4 bg-slate-50 rounded-2xl font-black text-center text-sm" onChange={e => setBusinessInfo({ ...businessInfo, emissionPointCode: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obligado Contabilidad</label>
                      <div className="flex bg-slate-50 p-1 rounded-2xl h-[52px]">
                        <button onClick={() => setBusinessInfo({ ...businessInfo, isAccountingObliged: true })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${businessInfo.isAccountingObliged ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>SÍ</button>
                        <button onClick={() => setBusinessInfo({ ...businessInfo, isAccountingObliged: false })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${!businessInfo.isAccountingObliged ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>NO</button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Regímenes y Resoluciones */}
                <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                  <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter border-b border-slate-50 pb-4 flex items-center gap-3">
                    <span className="text-emerald-500">🛡️</span> Regímenes Especiales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Régimen</label>
                      <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" value={businessInfo.regime} onChange={e => setBusinessInfo({ ...businessInfo, regime: e.target.value as any })}>
                        <option value="GENERAL">Régimen General</option>
                        <option value="RIMPE_EMPRENDEDOR">RIMPE - Emprendedor</option>
                        <option value="RIMPE_POPULAR">RIMPE - Negocio Popular</option>
                        <option value="ARTESANO">Artesano Calificado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agente de Retención (Res.)</label>
                      <input type="text" placeholder="Ej: NAC-DNCRASC20-00000001" value={businessInfo.withholdingAgentCode} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" onChange={e => setBusinessInfo({ ...businessInfo, withholdingAgentCode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contribuyente Especial (Nro)</label>
                      <input type="text" placeholder="Ej: 000" value={businessInfo.specialTaxpayerCode} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" onChange={e => setBusinessInfo({ ...businessInfo, specialTaxpayerCode: e.target.value })} />
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar de Configuración */}
              <div className="space-y-8">
                <section className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <h3 className="font-black text-blue-400 text-xs uppercase tracking-widest">Certificado P12</h3>
                    <div className={`w-3 h-3 rounded-full ${signatureFile ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  </div>

                  <div className="space-y-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-10 border-2 border-dashed border-white/20 hover:border-blue-500 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all"
                    >
                      <span className="text-3xl mb-3">🔑</span>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{signatureFile ? signatureFile.name : 'Subir firma .p12'}</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".p12" onChange={handleSignatureFileChange} />

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contraseña de Firma</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={signaturePassword}
                        onChange={e => setSignaturePassword(e.target.value)}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    * Tu firma es procesada localmente. Ecuafact Pro no almacena copias de tu certificado en servidores externos.
                  </p>
                </section>

                <button
                  onClick={saveBusinessConfig}
                  className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Guardar Cambios Legales
                </button>
              </div>
            </div>
          </div>
        );
      default: return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notifications={notifications}
      businessInfo={businessInfo}
      onMarkRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
      onRemoveNotif={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
    >
      {renderContent()}

      {/* --- EL BOTÓN SECRETO DEL SUPERADMIN --- */}
      {currentUser?.role === 'SUPERADMIN' && (
<<<<<<< HEAD
        <div className="fixed top-5 right-24 z-[9999] flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isDemoMode ? 'text-orange-500' : 'text-emerald-600'}`}>
            {isDemoMode ? 'Modo Demo' : 'Modo Live'}
          </span>
          <button
            onClick={() => setActiveTab('admin-subscriptions')}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
          >
            Suscripciones
          </button>
          <button
            onClick={() => setActiveTab('admin-users')}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
          >
            Usuarios
          </button>
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`
              w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none
              ${isDemoMode ? 'bg-orange-400' : 'bg-emerald-500'}
            `}
          >
            <div 
              className={`
                w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300
                ${isDemoMode ? 'translate-x-0' : 'translate-x-5'}
              `} 
            />
=======
        <div className="fixed bottom-4 left-4 z-[9999]">
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`
              px-4 py-2 rounded-full font-bold shadow-2xl transition-all 
              ${isDemoMode
                ? 'bg-orange-500 text-white hover:bg-orange-600 ring-4 ring-orange-200'
                : 'bg-green-600 text-white hover:bg-green-700 ring-4 ring-green-200'}
            `}
          >
            {isDemoMode ? '🚧 MODO DEMO' : '🚀 MODO LIVE'}
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
          </button>
        </div>
      )}
      {/* --- TOASTS DE NOTIFICACIONES --- */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto min-w-[320px] p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border animate-in slide-in-from-right-10 flex items-start gap-4 text-white" style={{ backgroundColor: `${businessInfo.themeColor}EE`, borderColor: `${businessInfo.themeColor}55` }}>
            <span className="text-2xl">{toast.type === 'success' ? '✅' : 'ℹ️'}</span>
            <p className="font-black text-sm leading-tight mt-1">{toast.text}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default App;