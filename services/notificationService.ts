import { NotificationSettings, Document } from '../types';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string;
    encoding: string;
  }[];
}

export interface SMSData {
  to: string;
  message: string;
}

export interface WhatsAppData {
  to: string;
  message: string;
  mediaUrl?: string;
}

// Enviar email con RIDE
export async function sendRideEmail(
  document: Document,
  settings: NotificationSettings,
  rideBase64: string,
  recipientEmail?: string
): Promise<boolean> {
  if (!settings.emailEnabled) return false;

  const email: EmailData = {
    to: recipientEmail || document.entityEmail || '',
    subject: `Factura Electrónica ${document.number}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Factura Electrónica Autorizada</h2>
        <p>Estimado/a cliente,</p>
        <p>Se adjunta su factura electrónica autorizada por el SRI.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Número de Factura:</strong> ${document.number}</p>
          <p><strong>Fecha de Emisión:</strong> ${new Date(document.issueDate).toLocaleDateString()}</p>
          <p><strong>Total:</strong> $${document.total.toFixed(2)}</p>
          <p><strong>Clave de Acceso:</strong> ${document.accessKey}</p>
        </div>
        <p>Gracias por su preferencia.</p>
      </div>
    `,
    attachments: [{
      filename: `RIDE_${document.number}.pdf`,
      content: rideBase64,
      encoding: 'base64'
    }]
  };

  try {
    const response = await fetch('http://localhost:3001/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, settings })
    });
    return response.ok;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
}

// Enviar SMS de notificación
export async function sendSMS(
  data: SMSData,
  settings: NotificationSettings
): Promise<boolean> {
  if (!settings.smsEnabled) return false;

  try {
    const response = await fetch('http://localhost:3001/api/notifications/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sms: data, settings })
    });
    return response.ok;
  } catch (error) {
    console.error('Error enviando SMS:', error);
    return false;
  }
}

// Enviar mensaje de WhatsApp
export async function sendWhatsApp(
  data: WhatsAppData,
  settings: NotificationSettings
): Promise<boolean> {
  if (!settings.whatsappEnabled) return false;

  try {
    const response = await fetch('http://localhost:3001/api/notifications/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp: data, settings })
    });
    return response.ok;
  } catch (error) {
    console.error('Error enviando WhatsApp:', error);
    return false;
  }
}

// Enviar recordatorio de pago
export async function sendPaymentReminder(
  document: Document,
  settings: NotificationSettings,
  daysOverdue: number
): Promise<boolean> {
  if (!settings.paymentRemindersEnabled) return false;

  const message = `Recordatorio de pago: Factura ${document.number} por $${document.total.toFixed(2)}. Vence en ${daysOverdue} días.`;

  const promises: Promise<boolean>[] = [];

  // Email
  if (settings.emailEnabled && document.entityEmail) {
    promises.push(sendRideEmail(document, settings, '', document.entityEmail));
  }

  // SMS
  if (settings.smsEnabled && document.entityPhone) {
    promises.push(sendSMS({ to: document.entityPhone, message }, settings));
  }

  // WhatsApp
  if (settings.whatsappEnabled && document.entityPhone) {
    promises.push(sendWhatsApp({ to: document.entityPhone, message }, settings));
  }

  const results = await Promise.all(promises);
  return results.some(result => result);
}

// Generar mensaje para diferentes tipos de notificación
export function generateNotificationMessage(
  document: Document,
  type: 'authorized' | 'reminder' | 'overdue'
): string {
  switch (type) {
    case 'authorized':
      return `Su factura ${document.number} ha sido autorizada por el SRI. Total: $${document.total.toFixed(2)}`;
    case 'reminder':
      return `Recordatorio: Factura ${document.number} pendiente de pago. Total: $${document.total.toFixed(2)}`;
    case 'overdue':
      return `URGENTE: Factura ${document.number} vencida. Por favor, regularice su pago de $${document.total.toFixed(2)}`;
    default:
      return '';
  }
}
