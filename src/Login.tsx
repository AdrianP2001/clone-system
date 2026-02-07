import React, { useState } from 'react';

// URL del backend
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetMessage('');
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();
            if (data.success) {
                setResetMessage('✅ ' + (data.message || 'Enlace enviado. Revise su correo.'));
            } else {
                setResetMessage('❌ ' + (data.message || 'Error al solicitar recuperación.'));
            }
        } catch (err) {
            setResetMessage('❌ Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error de autenticación');
            }

            localStorage.setItem('token', data.token);
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            console.log('✅ Login exitoso en Frontend:', data.user);
            onLoginSuccess();

        } catch (err: any) {
            console.error(err);
            setError('Credenciales incorrectas. Intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (view === 'forgot') {
        return (
            <div className="font-display bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-100 h-screen w-full flex items-center justify-center selection:bg-primary selection:text-white relative overflow-hidden">
                <div className="relative z-10 w-full max-w-md px-6">
                    <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 backdrop-blur-sm p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recuperar Contraseña</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                Ingresa tu correo para recibir un enlace de recuperación.
                            </p>
                        </div>

                        {resetMessage && (
                            <div className={`mb-4 p-3 rounded-lg text-xs ${resetMessage.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {resetMessage}
                            </div>
                        )}

                        <form onSubmit={handleForgotPassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
                                    placeholder="usuario@empresa.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70"
                            >
                                {loading ? 'Enviando...' : 'Enviar Enlace'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button onClick={() => setView('login')} className="text-sm text-primary hover:underline font-medium">
                                Volver al Inicio de Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-100 h-screen w-full flex items-center justify-center selection:bg-primary selection:text-white relative overflow-hidden">

            {/* FONDO ANIMADO */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl mix-blend-multiply dark:mix-blend-lighten opacity-70 animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 backdrop-blur-sm">

                    {/* CABECERA */}
                    <div className="pt-10 pb-6 px-8 text-center">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="flex items-baseline tracking-tight">
                                <span className="text-3xl font-bold text-ecua-blue">ECUAFACT</span>
                                <span className="text-3xl font-extrabold text-slate-900 dark:text-white ml-1">PRO</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-gray-500 dark:text-gray-400 mt-1">Enterprise Edition</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bienvenido</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Ingresa tus credenciales para acceder al panel.
                        </p>
                    </div>

                    {/* FORMULARIO */}
                    <div className="px-8 pb-10">
                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* EMAIL INPUT */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="email">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-icons-outlined text-xl">email</span>
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                        placeholder="usuario@empresa.com"
                                    />
                                </div>
                            </div>

                            {/* PASSWORD INPUT */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                                        Contraseña
                                    </label>
                                    <button type="button" onClick={() => setView('forgot')} className="text-xs font-medium text-primary hover:text-blue-600 hover:underline">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <span className="material-icons-outlined text-xl">lock</span>
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-icons-outlined text-xl">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* MENSAJE DE ERROR */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-600 text-xs">
                                    <span className="material-icons-outlined text-sm">error</span>
                                    {error}
                                </div>
                            )}

                            {/* BOTÓN SUBMIT */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:-translate-y-0.5 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Ingresando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-outlined mr-2 text-lg">login</span>
                                            Iniciar Sesión
                                        </>
                                    )}
                                </button>
                                <div className="mt-4 text-center">
                                    <a href="/portal/login" className="text-sm text-gray-500 hover:text-primary transition-colors font-medium">
                                        ¿Eres cliente? <span className="underline">Ingresa al Portal aquí</span>
                                    </a>
                                </div>
                            </div>
                        </form>

                        {/* FOOTER */}
                        <div className="mt-8 relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-surface-dark text-gray-500 dark:text-gray-400">Acceso Seguro</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4 text-center text-xs text-gray-500 dark:text-gray-500">
                            <a className="hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                <span className="material-icons-outlined text-sm">help_outline</span> Soporte
                            </a>
                            <a className="hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                <span className="material-icons-outlined text-sm">security</span> Privacidad
                            </a>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary to-ecua-blue"></div>
                </div>
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-600">
                        © 2024 Corporación EcuaFact. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;