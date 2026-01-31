// src/api/client.ts

const BASE_URL = import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api`
    : 'http://localhost:3001/api';

// Esta función es GENÉRICA. <T> significa "el tipo de dato que tú me digas"
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}), // Inyecta token si existe
            ...options.headers,
        },
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/'; // Auto-logout
        }
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Error del servidor');
    }

    return response.json();
}

// Exportamos un objeto simple con los 4 métodos universales
export const client = {
    get: <T>(url: string) => request<T>(url, { method: 'GET' }),
    post: <T>(url: string, body: any) => request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: any) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
    del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};