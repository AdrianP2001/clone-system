
import { Client, Product, PaymentMethod } from './types';

export const TAX_RATES = [
  { label: 'IVA 15% (General)', value: 15 },
  { label: 'IVA 5% (Feriados/Canasta)', value: 5 },
  { label: 'IVA 0%', value: 0 },
  { label: 'Exento', value: -1 },
];

export const PRODUCT_CATEGORIES = [
  'Electrónica', 'Ropa y Accesorios', 'Hogar', 'Servicios Profesionales', 'Alimentos', 'Salud', 'Otros'
];

export const SRI_PAYMENT_METHODS: PaymentMethod[] = [
  { code: '01', label: 'Sin utilización del sistema financiero' },
  { code: '16', label: 'Tarjeta de Débito' },
  { code: '19', label: 'Tarjeta de Crédito' },
  { code: '20', label: 'Transferencia / Otros' },
  { code: '17', label: 'Dinero Electrónico' },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'cf', ruc: '9999999999999', name: 'CONSUMIDOR FINAL', email: '', address: '', phone: '', type: 'CLIENTE' },
  { id: '1', ruc: '1790011223001', name: 'Corporación Favorita', email: 'contabilidad@favorita.com', address: 'Av. Amazonas N21', phone: '022334455', type: 'AMBOS' },
  { id: '2', ruc: '1755889966001', name: 'Juan Pérez', email: 'juan.perez@gmail.com', address: 'Quito, Sector Carolina', phone: '0998877665', type: 'CLIENTE' },
];

export const MOCK_PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    code: 'SRV-001', 
    description: 'Consultoría TI Senior', 
    price: 85.00, 
    // Fixed: Added missing wholesalePrice and distributorPrice
    wholesalePrice: 75.00,
    distributorPrice: 65.00,
    taxRate: 15, 
    stock: 999, 
    minStock: 0,
    type: 'SERVICIO',
    category: 'Servicios Profesionales',
    imageUrl: 'https://images.unsplash.com/photo-1454165833767-027ffea9e778?q=80&w=400&h=300&auto=format&fit=crop'
  },
  { 
    id: 'p2', 
    code: 'PROD-010', 
    description: 'Laptop Workstation Pro', 
    price: 1850.00, 
    // Fixed: Added missing wholesalePrice and distributorPrice
    wholesalePrice: 1650.00,
    distributorPrice: 1550.00,
    taxRate: 15, 
    stock: 12, 
    minStock: 5,
    type: 'FISICO',
    category: 'Electrónica',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=400&h=300&auto=format&fit=crop'
  }
];
