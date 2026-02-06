import { client } from '../src/api/client';

export interface UserWithBusiness {
  id: number;
  email: string;
  role: string;
  businessId: number | null;
  business: {
    id: number;
    name: string;
    isActive: boolean;
    subscriptionEnd: string | null;
  } | null;
}

/**
 * Obtiene la lista de usuarios con información de su empresa y suscripción.
 */
export const getAllUsers = async (): Promise<UserWithBusiness[]> => {
  return client.get<UserWithBusiness[]>('/users');
};

/**
 * Agrega tiempo a la suscripción de una empresa.
 * @param businessId ID de la empresa
 * @param months Cantidad de meses a agregar
 */
export const addSubscriptionTime = async (businessId: number, months: number) => {
  return client.post('/subscriptions/add-time', { businessId, months });
};

// Interfaz para el historial
export interface SubscriptionHistoryItem {
  id: string;
  date: string;
  action: string;
  details: string;
  amount?: string;
  status: 'completed' | 'pending' | 'failed';
}

// Obtener historial (Simulado para demostración)
export const getSubscriptionHistory = async (businessId: number): Promise<SubscriptionHistoryItem[]> => {
  // Aquí conectarías con tu endpoint real: return client.get(`/subscriptions/${businessId}/history`);
  return [
    { id: '1', date: new Date().toISOString(), action: 'Ajuste Manual', details: 'Ajuste por Superadmin', amount: '-', status: 'completed' },
    { id: '2', date: new Date(Date.now() - 86400000 * 30).toISOString(), action: 'Renovación Mensual', details: 'Pago vía Transferencia', amount: '$29.99', status: 'completed' },
    { id: '3', date: new Date(Date.now() - 86400000 * 60).toISOString(), action: 'Activación Inicial', details: 'Plan Pro - 1 Mes', amount: '$0.00', status: 'completed' },
  ];
};