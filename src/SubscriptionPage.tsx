import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// Configuración de PayPal (Sandbox)
const PAYPAL_CLIENT_ID = "AQFmpsA0FpMUG3kwm0UynB11LSvS-3NcwjfG4hcs3aARYnPKgIV-k8GExzWbg4-sYokeMFTzQOfqezHq";

interface RegisterData {
  businessName: string;
  ruc: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<'plans' | 'register'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'PAYPAL' | 'TRANSFER'>('PAYPAL');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<RegisterData>({
    businessName: '',
    ruc: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  });

  const [toasts, setToasts] = useState<Toast[]>([]);

  // Validar RUC: Debe tener 13 dígitos numéricos
  const isValidRuc = (ruc: string) => /^\d{13}$/.test(ruc);

  // Validar Contraseña: Mínimo 8 caracteres, una mayúscula y un número
  const isValidPassword = (pass: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);

  const isFormValid = Object.values(formData).every((value) => (value as string).trim() !== '') && isValidRuc(formData.ruc) && isValidPassword(formData.password);

  const showNotify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    setStep('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (paymentId?: string) => {
    setLoading(true);
    try {

      const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan,
          paymentMethod: paymentMethod,
          paymentId: paymentId // Solo si es PayPal
        })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar token y redirigir
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        showNotify('¡Cuenta creada exitosamente! Bienvenido.', 'success');
        setTimeout(() => {
          window.location.href = '/'; // Redirigir al dashboard tras 2 segundos
        }, 2000);
      } else {
        showNotify('Error: ' + data.message, 'error');
      }
    } catch (error) {
      console.error(error);
      showNotify('Error de conexión con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppTransfer = () => {
    const message = `Hola, deseo suscribirme al plan ${selectedPlan} de EcuaFact Pro. Mis datos: ${formData.businessName} (${formData.ruc}). Solicito datos bancarios.`;
    const url = `https://wa.me/593999999999?text=${encodeURIComponent(message)}`; // Reemplaza con tu número
    window.open(url, '_blank');
    // Opcional: Registrar como pendiente o esperar confirmación manual
    handleRegister();
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 lg:px-40 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('plans')}>
          <div className="w-8 h-8 text-[#135bec]">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"></path>
            </svg>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight">EcuaFact Pro</h2>
        </div>
        <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="#" onClick={() => setStep('plans')}>Planes</a>
            <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="#">Características</a>
          </nav>
          <div className="flex gap-2">
            <button onClick={() => window.location.href = '/'} className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-[#135bec] text-white text-sm font-bold tracking-tight hover:bg-[#135bec]/90 transition-all">
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-6 lg:px-40">
        <div className="max-w-[1100px] w-full flex flex-col gap-12">

          {step === 'plans' ? (
            <>
              {/* Header Text */}
              <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto">
                <h1 className="text-slate-900 dark:text-white text-4xl lg:text-5xl font-black leading-tight tracking-tighter">
                  Elige el plan ideal para tu negocio
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Optimiza tu facturación electrónica con el respaldo de la plataforma líder en cumplimiento del SRI. Sin complicaciones, 100% digital.
                </p>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {/* Plan Mensual */}
                <div className="flex flex-col gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-slate-600 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">Plan Mensual</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-900 dark:text-white text-5xl font-black tracking-tighter">$15</span>
                      <span className="text-slate-500 text-lg font-medium">/mes</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">Ideal para emprendedores y pequeños negocios que inician.</p>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="flex flex-col gap-4 flex-grow">
                    {['Facturación Ilimitada', 'Soporte 24/7 vía Chat', 'Almacenamiento en la Nube', 'Firma Electrónica Incluida'].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm">
                        <span className="material-symbols-outlined text-[#135bec] font-bold text-lg">check_circle</span>
                        {feat}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handlePlanSelect('MONTHLY')} className="w-full flex items-center justify-center rounded-xl h-12 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Suscribirse Ahora
                  </button>
                </div>

                {/* Plan Anual (Featured) */}
                <div className="relative flex flex-col gap-6 rounded-xl border-2 border-[#135bec] bg-white dark:bg-slate-900 p-8 shadow-xl transform md:scale-105 z-10">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#135bec] text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                    Mejor Valor
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[#135bec] text-sm font-bold uppercase tracking-widest">Plan Anual</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-900 dark:text-white text-5xl font-black tracking-tighter">$120</span>
                      <span className="text-slate-500 text-lg font-medium">/año</span>
                    </div>
                    <p className="text-[#135bec]/80 text-sm font-semibold mt-2">Ahorra un 33% comparado al plan mensual.</p>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="flex flex-col gap-4 flex-grow">
                    {['Facturación Ilimitada Premium', 'Soporte Prioritario 24/7', '5GB Almacenamiento Seguro', 'Gestión de Inventario Web', 'App Móvil Completa'].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm font-medium">
                        <span className="material-symbols-outlined text-[#135bec] font-bold text-lg">check_circle</span>
                        {feat}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handlePlanSelect('YEARLY')} className="w-full flex items-center justify-center rounded-xl h-12 bg-[#135bec] text-white font-bold hover:shadow-lg hover:shadow-[#135bec]/30 transition-all">
                    Obtener Oferta
                  </button>
                </div>

                {/* Plan Semestral */}
                <div className="flex flex-col gap-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-slate-600 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">Plan Semestral</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-slate-900 dark:text-white text-5xl font-black tracking-tighter">$75</span>
                      <span className="text-slate-500 text-lg font-medium">/6 meses</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">Flexibilidad y control para negocios en crecimiento.</p>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="flex flex-col gap-4 flex-grow">
                    {['Facturación Ilimitada', 'Soporte 24/7 vía Chat', 'Almacenamiento en la Nube', 'Firma Electrónica Incluida'].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm">
                        <span className="material-symbols-outlined text-[#135bec] font-bold text-lg">check_circle</span>
                        {feat}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handlePlanSelect('SEMIANNUAL')} className="w-full flex items-center justify-center rounded-xl h-12 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Suscribirse Ahora
                  </button>
                </div>
              </div>

              {/* Payment Methods Info */}
              <div className="mt-10 flex flex-col gap-8 bg-white dark:bg-slate-900 rounded-2xl p-8 lg:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">Métodos de Pago Seguros</h2>
                    <p className="text-slate-500 text-sm mt-1">Transacciones encriptadas con seguridad SSL de nivel bancario.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">lock</span>
                    <span className="material-symbols-outlined text-slate-400 text-2xl">verified_user</span>
                    <span className="material-symbols-outlined text-slate-400 text-2xl">shield</span>
                  </div>
                </div>
                <div className="flex justify-center items-center gap-6 mt-4 opacity-60 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aceptamos:</span>
                  <div className="flex gap-4 items-center grayscale">
                    <img alt="PayPal" className="h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgY_uKrF4r9IIIemXjN0rV_VCF9nfY4-bobqcfhmUsyGmTxRqpHaoL0TjaWKiV_ZpYbKXwrzpoxpZ1Zy-btK6Lh35lq-pxVgRfM3zDf7cUSN9T-LrsbQeiBjpebvM2W0AmRkTzgVl5o49RUxxCA2LEbAa0oP1qDJuXaYKRRTRdf16DDK1WMR7qKdpDIHyREKDM-UFFxIUfa9P--HY4WrCFwjt0-FY9ROIdxmDV7D1g1ih0_xuWakWix4QNfnViMbL4MOFRt_blJgs" />
                    <img alt="Visa" className="h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUmRQquXFMTDsqpof-qCuy0ple9Y0BvSM7nQnigfZzT94kavm4y5xMl4PQncz952Ehlkv2_dwTexCPOdQ7zqacKfpCsLjtaTHiJeX1xThqDrjTPLCzIoJvskoNPZNc_AaVuCyIcuzhMaV0Due_ZceTcmlklNsD8OM6sjIrMsfVMgpLJG-wy5_GeARdS5_U1aaGl0zmSNk7RCZkWdXay_au2yZZbWfdTe36KZFa5As-M1qCf8lcqbcakEu-RqCcnebq49HSIpvNM2s" />
                    <img alt="Mastercard" className="h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmJfNbJqAwDYRwXL9fSKXS_5UukcGgGUawaey18zINdrnGMKBqW5HBTK05MuDa4dh1b8HQtx1vFNwRw_kq0DWs_1OwigP1p_L0c46RwA6QSmUhmXm5ItTsG39bMQRzSw7mS55rOKEks-IqAHVB_RVKNbKfb_-HS_i5XygOpkFF8ONeAWN_ULN7QLfCEzqUIYTTx9I3eIy-LE2dWlAXyapu4vhRX-MvBrwY21gFVRANRxIonXxhRUXj14IChDm5vfBRBz7_xTcEZnA" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Registration Form */
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-6">
                  <button onClick={() => setStep('plans')} className="text-sm text-slate-500 hover:text-[#135bec] mb-4 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Volver a planes
                  </button>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Crea tu cuenta de Empresa</h2>
                  <p className="text-slate-500 text-sm">Ingresa los datos para tu facturación electrónica.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Razón Social / Nombre</label>
                    <input name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="Ej. Mi Empresa S.A." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">RUC</label>
                    <input name="ruc" value={formData.ruc} onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec] ${formData.ruc && !isValidRuc(formData.ruc) ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      placeholder="179..." maxLength={13}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="099..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="Dirección completa" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="tu.nombre@email.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec] pr-10 ${formData.password && !isValidPassword(formData.password) ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700'
                          }`}
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {formData.password && !isValidPassword(formData.password) && <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres, una mayúscula y un número.</p>}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Método de Pago</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setPaymentMethod('PAYPAL')}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'PAYPAL' ? 'border-[#135bec] bg-[#135bec]/5' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <span className="material-symbols-outlined text-[#135bec]">payments</span>
                      <div>
                        <p className="font-bold text-sm dark:text-white">PayPal / Tarjeta</p>
                        <p className="text-xs text-slate-500">Activación inmediata</p>
                      </div>
                    </div>
                    <div
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'TRANSFER' ? 'border-[#135bec] bg-[#135bec]/5' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <span className="material-symbols-outlined text-[#135bec]">account_balance</span>
                      <div>
                        <p className="font-bold text-sm dark:text-white">Transferencia</p>
                        <p className="text-xs text-slate-500">Vía WhatsApp</p>
                      </div>
                    </div>
                  </div>
                </div>

                {paymentMethod === 'PAYPAL' ? (
                  <div className="mt-4">
                    {!isFormValid ? (
                      <div className="w-full py-4 px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-500 text-sm font-medium">
                        ⚠️ Complete todos los campos correctamente para pagar
                      </div>
                    ) : (
                      <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID }}>
                        <PayPalButtons
                          style={{ layout: "vertical" }}
                          createOrder={(data, actions) => {
                            const price = selectedPlan === 'MONTHLY' ? '15.00' : selectedPlan === 'SEMIANNUAL' ? '75.00' : '120.00';
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [{
                                amount: { currency_code: "USD", value: price }
                              }]
                            });
                          }}
                          onApprove={async (data, actions) => {
                            if (actions.order) {
                              const details = await actions.order.capture();
                              handleRegister(details.id);
                            }
                          }}
                        />
                      </PayPalScriptProvider>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleWhatsAppTransfer}
                    disabled={loading || !isFormValid}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl h-12 font-bold transition-colors ${loading || !isFormValid
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-[#25D366] text-white hover:bg-[#20bd5a]'
                      }`}
                  >
                    {loading ? 'Procesando...' : 'Finalizar en WhatsApp'}
                  </button>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:w-80">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 sticky top-24">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Resumen del Pedido</h3>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Plan Seleccionado</span>
                    <span className="font-medium dark:text-white">
                      {selectedPlan === 'MONTHLY' ? 'Mensual' : selectedPlan === 'SEMIANNUAL' ? 'Semestral' : 'Anual'}
                    </span>
                  </div>
                  <div className="flex justify-between mb-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Precio</span>
                    <span className="font-medium dark:text-white">
                      ${selectedPlan === 'MONTHLY' ? '15.00' : selectedPlan === 'SEMIANNUAL' ? '75.00' : '120.00'}
                    </span>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700 mb-4" />
                  <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span>${selectedPlan === 'MONTHLY' ? '15.00' : selectedPlan === 'SEMIANNUAL' ? '75.00' : '120.00'}</span>
                  </div>
                  <div className="mt-4 text-xs text-slate-500 text-center">
                    Al suscribirte aceptas nuestros términos y condiciones de servicio.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Notice */}
          <div className="text-center text-slate-400 text-xs flex flex-col gap-2">
            <p>Precios expresados en dólares estadounidenses (USD) e incluyen IVA.</p>
            <p>© 2024 EcuaFact Pro - Facturación Electrónica Autorizada por el SRI.</p>
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border animate-in slide-in-from-right-10 flex items-start gap-4 text-white ${toast.type === 'error' ? 'bg-red-500/90 border-red-500/50' : 'bg-[#135bec]/90 border-[#135bec]/50'
              }`}
          >
            <span className="text-2xl">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <p className="font-black text-sm leading-tight mt-1">{toast.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;