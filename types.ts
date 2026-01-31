
export enum SriStatus {
  PENDING = 'PENDIENTE',
  RECEIVED = 'RECIBIDA',
  AUTHORIZED = 'AUTORIZADA',
  REJECTED = 'RECHAZADA'
}

export enum PaymentStatus {
  PAID = 'PAGADO',
  PENDING = 'PENDIENTE',
  OVERDUE = 'VENCIDO'
}

export enum UserRole {
  ADMIN = 'ADMINISTRADOR',
  SELLER = 'VENDEDOR',
  ACCOUNTANT = 'CONTADOR'
}

export enum DocumentType {
  INVOICE = '01',
  CREDIT_NOTE = '04',
  DEBIT_NOTE = '05',
  RETENTION = '07',
  REMITTANCE = '06'
}

export type BusinessCategory = 'RETAIL' | 'SERVICIOS' | 'ALIMENTOS' | 'TECNOLOGIA' | 'SALUD' | 'TIENDA_ONLINE' | 'PROFESIONAL_LIBRE';

export interface BusinessInfo {
  name: string;
  tradename: string; // Nombre Comercial
  ruc: string;
  address: string; // Matriz
  branchAddress: string; // Establecimiento
  phone: string;
  email: string;
  website?: string;
  category: BusinessCategory;
  logo?: string;
  regime: 'GENERAL' | 'RIMPE_EMPRENDEDOR' | 'RIMPE_POPULAR' | 'ARTESANO';
  isAccountingObliged: boolean;
  specialTaxpayerCode?: string;
  withholdingAgentCode?: string;
  isProduction: boolean;
  themeColor: string;
  establishmentCode: string; // Ej: 001
  emissionPointCode: string; // Ej: 001
  taxpayerType: 'PERSONA_NATURAL' | 'EMPRESA'; // Tipo de contribuyente
  notificationSettings?: NotificationSettings;
}

export interface Product {
  id: string;
  code: string;
  description: string;
  price: number;
  wholesalePrice: number;
  distributorPrice: number;
  taxRate: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
  category?: string;
  type: 'FISICO' | 'SERVICIO';
  isSynced?: boolean;
  lastSync?: string;
}

export interface Client {
  id: string;
  ruc: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  type: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';
}

export interface InvoiceItem {
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  imageUrl?: string;
  type: 'FISICO' | 'SERVICIO';
}

export interface AppNotification {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
  time: Date;
  read: boolean;
}

export interface PaymentMethod {
  code: string;
  label: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  number: string;
  accessKey: string;
  issueDate: string;
  dueDate?: string;
  entityName: string;
  entityRuc?: string;
  entityEmail?: string;
  entityPhone?: string;
  entityAddress?: string;
  total: number;
  status: SriStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  additionalInfo?: string;
  items?: InvoiceItem[];
  source?: 'LOCAL' | 'TIENDA_ONLINE';
  authorizedXml?: string; // XML autorizado por el SRI
  // Para Notas de Crédito
  relatedDocumentNumber?: string; // Factura modificada
  relatedDocumentDate?: string;
  relatedDocumentAccessKey?: string;
  creditNoteReason?: string;

  // Para Retenciones
  taxPeriod?: string;
  sustainingDocType?: string;
  sustainingDocNumber?: string;
  sustainingDocDate?: string;
  sustainingDocTotal?: number;
  retentionTaxes?: RetentionTax[];
}

export interface WebOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerRuc: string;
  customerEmail: string;
  paymentMethod: 'CARD' | 'TRANSFER';
  paymentConfirmed: boolean;
  items: InvoiceItem[];
  total: number;
  date: string;
  transactionId?: string;
}

// ============================================
// RETENCIONES
// ============================================
export interface RetentionTax {
  code: string; // Código del impuesto (1=Renta, 2=IVA, 6=ISD)
  baseImponible: number;
  percentageCode: string; // Código del porcentaje de retención
  percentage: number; // Porcentaje real (ej: 1, 2, 10, 30, etc)
  taxValue: number; // Valor retenido
  fiscalDocCode: string; // Código del documento fiscal (01=Factura, 04=Nota Crédito, etc)
  fiscalDocNumber: string; // Número del documento
}

export interface Retention {
  id: string;
  number: string;
  accessKey: string;
  issueDate: string;
  taxPeriod: string; // MM/YYYY
  supplierRuc: string;
  supplierName: string;
  supplierEmail?: string;
  establishmentCode: string;
  emissionPointCode: string;
  sequential?: string;
  taxes: RetentionTax[];
  totalRetained: number;
  status: SriStatus;
  // Documento sustento
  sustainingDocType: string; // 01=Factura, 04=Nota Crédito, etc
  sustainingDocNumber: string;
  sustainingDocDate: string;
  sustainingDocTotal: number;
}

// ============================================
// GUÍAS DE REMISIÓN
// ============================================
export interface RemittanceRecipient {
  ruc: string;
  name: string;
  address: string;
  reasonForTransfer: string;
  fiscalDocNumber?: string;
  authorizationCode?: string;
  fiscalDocDate?: string;
}

export interface RemittanceItem {
  productCode: string;
  description: string;
  quantity: number;
  additionalDetail?: string;
}

export interface RemittanceGuide {
  id: string;
  number: string;
  accessKey: string;
  issueDate: string;
  startDate: string; // Fecha inicio transporte
  endDate: string; // Fecha fin transporte
  originAddress: string;
  destinationAddress: string;
  carrierRuc: string;
  carrierName: string;
  licensePlate: string;
  establishmentCode: string;
  emissionPointCode: string;
  sequential?: string;
  recipients: RemittanceRecipient[];
  items: RemittanceItem[];
  status: SriStatus;
  route?: string;
}

// ============================================
// LIQUIDACIONES DE COMPRA Y SERVICIOS
// ============================================
export interface SettlementPayment {
  paymentMethodCode: string; // 01=Sin utilización del sistema financiero
  total: number;
  timeUnit?: string; // días, meses
  term?: number; // plazo
}

export interface SettlementReimbursement {
  baseImponible: number;
  taxCode: string;
  taxPercentageCode: string;
  taxRate: number;
  reimbursementValue: number;
}

export interface PurchaseSettlement {
  id: string;
  number: string;
  accessKey: string;
  issueDate: string;
  supplierRuc: string;
  supplierName: string;
  supplierEmail?: string;
  supplierAddress: string;
  establishmentCode: string;
  emissionPointCode: string;
  sequential?: string;
  items: InvoiceItem[];
  subtotal12: number;
  subtotal0: number;
  subtotalNotSubject: number;
  subtotalExempt: number;
  subtotal: number;
  iva: number;
  tip: number;
  total: number;
  payments: SettlementPayment[];
  reimbursements?: SettlementReimbursement[];
  status: SriStatus;
  additionalInfo?: string;
}

// Reportes contables y tributarios
export interface SalesBookEntry {
  date: string;
  documentType: string;
  documentNumber: string;
  authorizationNumber: string;
  clientRuc: string;
  clientName: string;
  subtotal0: number;
  subtotal12: number;
  iva: number;
  total: number;
}

export interface ATSPurchase {
  establishmentType: '01' | '02'; // 01=Propio, 02=Terceros
  idProviderType: '01' | '02' | '03'; // 01=RUC, 02=Cédula, 03=Pasaporte
  providerRuc: string;
  foreignPartyType?: string;
  providerName: string;
  authorizationDate: string;
  documentType: string;
  transactionType: '01' | '02'; // 01=Compra, 02=Reembolso
  documentNumber: string;
  authorizationNumber: string;
  subtotal0: number;
  subtotal12: number;
  iva: number;
  ice: number;
  retentionPercentage: number;
  retentionAmount: number;
}

export interface ATSSale {
  establishmentType: '01' | '02';
  documentType: string;
  documentNumber: string;
  authorizationNumber: string;
  issueDate: string;
  clientIdType: '04' | '05' | '06' | '07'; // RUC, Cédula, Pasaporte, Consumidor Final
  clientId: string;
  clientName: string;
  subtotal0: number;
  subtotal12: number;
  iva: number;
}

export interface Form104Data {
  period: string; // MM/YYYY
  taxableBase0: number;
  taxableBase12: number;
  generatedIva: number;
  purchasesWithCredit: number;
  ivaPurchases: number;
  ivaToPayOrCredit: number;
}

export interface InventoryMovement {
  date: string;
  documentType: string;
  documentNumber: string;
  description: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number;
  totalCost: number;
}

export interface ProductProfitability {
  productId: string;
  productCode: string;
  productName: string;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

// Configuración de notificaciones
export interface NotificationSettings {
  emailEnabled: boolean;
  emailProvider?: 'smtp' | 'sendgrid' | 'mailgun';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  sendgridApiKey?: string;
  mailgunApiKey?: string;
  mailgunDomain?: string;

  smsEnabled: boolean;
  smsProvider?: 'twilio' | 'nexmo';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;

  whatsappEnabled: boolean;
  whatsappProvider?: 'twilio' | 'whatsapp-business';
  whatsappNumber?: string;

  paymentRemindersEnabled: boolean;
  reminderDaysBefore: number[];
}
