
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Client, Product, InvoiceItem, SriStatus, DocumentType, Document, PaymentStatus, BusinessInfo, NotificationSettings } from '../types';
import { SRI_PAYMENT_METHODS } from '../constants';
import { generateAccessKey } from '../utils/sri';
import { buildInvoiceXml, authorizeWithSRI } from '../services/sriService';
import { getLocalDateISO } from '../utils/date';
import RideViewer from './RideViewer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceFormProps {
  clients: Client[];
  products: Product[];
  businessInfo: BusinessInfo;
  signatureFile: File | null;
  signaturePassword: string;
  notificationSettings: NotificationSettings;
  onNotify: (msg: string, type?: any) => void;
  onAuthorize: (doc: Document, items: InvoiceItem[]) => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ clients, products, businessInfo, signatureFile, signaturePassword, notificationSettings, onNotify, onAuthorize }) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('01');
  const [priceTier, setPriceTier] = useState<'price' | 'wholesalePrice' | 'distributorPrice'>('price');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState('');
  const [authLogs, setAuthLogs] = useState<string[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [lastDocument, setLastDocument] = useState<Document | null>(null);
  const [showRide, setShowRide] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  // Función auxiliar para generar PDF en Base64
  const generatePdfBase64 = async (doc: Document, docItems: InvoiceItem[]): Promise<string | null> => {
    try {
      console.log('🔄 Iniciando generación de PDF...');
      console.log('📦 Items a incluir:', docItems.length);
      
      if (!docItems || docItems.length === 0) {
        console.error('❌ No hay items para incluir en el PDF');
        return null;
      }
      
      console.log('🔄 Importando QRCode...');
      const QRCode = await import('qrcode');
      console.log('✅ QRCode importado');
      
      // Generar QR como imagen base64
      console.log('🔄 Generando código QR para:', doc.accessKey);
      const qrCodeDataUrl = await QRCode.toDataURL(doc.accessKey, { 
        margin: 1, 
        width: 200, 
        color: { dark: '#000000', light: '#ffffff' } 
      });
      console.log('✅ Código QR generado, longitud:', qrCodeDataUrl.length);

      // Crear PDF (jsPDF ya está importado estáticamente)
      console.log('🔄 Creando documento PDF...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      console.log('✅ Documento PDF creado');
      
      // Verificar que autoTable esté disponible
      if (typeof autoTable !== 'function') {
        console.error('❌ ERROR: autoTable no está importado correctamente!');
        return null;
      } else {
        console.log('✅ autoTable está disponible como función');
      }

      // Calcular totales
      const pdfSub15 = docItems.reduce((a, b) => b.taxRate > 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const pdfSub0 = docItems.reduce((a, b) => b.taxRate === 0 ? a + (b.quantity * b.unitPrice - (b.discount || 0)) : a, 0);
      const pdfTax = docItems.reduce((a, b) => b.taxRate > 0 ? a + ((b.quantity * b.unitPrice - (b.discount || 0)) * (b.taxRate / 100)) : a, 0);
      const totalDiscount = docItems.reduce((acc, item) => acc + (item.discount || 0), 0);

      console.log('💰 Totales calculados:', { 
        sub15: pdfSub15.toFixed(2), 
        sub0: pdfSub0.toFixed(2), 
        tax: pdfTax.toFixed(2), 
        discount: totalDiscount.toFixed(2),
        total: doc.total.toFixed(2)
      });

      let yPos = 15;

      // SECCIÓN 1: Información de la empresa y autorización (lado a lado)
      // Cuadro izquierdo: Datos de la empresa
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, yPos, 90, 40);
      
      // Agregar logo si existe
      if (businessInfo.logo) {
        try {
          console.log('🔄 Agregando logo al PDF...');
          
          // Obtener dimensiones de la imagen para mantener proporciones
          const imgProps = pdf.getImageProperties(businessInfo.logo);
          const imgWidth = imgProps.width;
          const imgHeight = imgProps.height;
          const aspectRatio = imgWidth / imgHeight;
          
          // Definir tamaño máximo y calcular dimensiones proporcionales
          const maxLogoHeight = 15;
          const maxLogoWidth = 20;
          
          let logoWidth, logoHeight;
          if (aspectRatio > 1) {
            // Imagen horizontal
            logoWidth = Math.min(maxLogoWidth, maxLogoHeight * aspectRatio);
            logoHeight = logoWidth / aspectRatio;
          } else {
            // Imagen vertical o cuadrada
            logoHeight = maxLogoHeight;
            logoWidth = logoHeight * aspectRatio;
          }
          
          console.log(`📐 Logo dimensions: ${logoWidth.toFixed(2)}x${logoHeight.toFixed(2)}mm (aspect ratio: ${aspectRatio.toFixed(2)})`);
          
          pdf.addImage(businessInfo.logo, 'PNG', 12, yPos + 5, logoWidth, logoHeight);
          console.log('✅ Logo agregado');
          
          // Texto al lado del logo
          const textStartX = 12 + logoWidth + 3; // Logo + margen
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          
          // Dividir el nombre si es muy largo
          const maxWidth = 90 - textStartX - 2;
          const nameLines = pdf.splitTextToSize(businessInfo.name, maxWidth);
          let textY = yPos + 8;
          nameLines.forEach((line: string) => {
            pdf.text(line, textStartX, textY);
            textY += 4;
          });
          
          // Información adicional debajo del logo
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          const infoY = yPos + 22;
          pdf.text(`Dirección: ${businessInfo.address}`, 12, infoY, { maxWidth: 86 });
          pdf.text(`RUC: ${businessInfo.ruc}`, 12, infoY + 7);
          
          const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
          pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, infoY + 12);
        } catch (error) {
          console.error('⚠️ Error agregando logo:', error);
          // Si falla el logo, continuar sin él
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          const nameLines = pdf.splitTextToSize(businessInfo.name, 86);
          let textY = yPos + 7;
          nameLines.forEach((line: string) => {
            pdf.text(line, 12, textY);
            textY += 4;
          });
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Dirección: ${businessInfo.address}`, 12, yPos + 20, { maxWidth: 86 });
          pdf.text(`RUC: ${businessInfo.ruc}`, 12, yPos + 28);
          const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
          pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, yPos + 34);
        }
      } else {
        // Sin logo - diseño centrado con texto ajustado
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const nameLines = pdf.splitTextToSize(businessInfo.name, 86);
        let textY = yPos + 7;
        nameLines.forEach((line: string) => {
          pdf.text(line, 12, textY);
          textY += 4;
        });
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Dirección: ${businessInfo.address}`, 12, yPos + 20, { maxWidth: 86 });
        pdf.text(`RUC: ${businessInfo.ruc}`, 12, yPos + 28);
        const accountingText = businessInfo.isAccountingObliged ? 'SI' : 'NO';
        pdf.text(`Obligado a llevar contabilidad: ${accountingText}`, 12, yPos + 34);
      }

      // Cuadro derecho: Datos de autorización
      pdf.rect(105, yPos, 95, 40);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`R.U.C.: ${businessInfo.ruc}`, 150, yPos + 7, { align: 'center' });
      pdf.text('FACTURA', 150, yPos + 12, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`No. ${doc.number}`, 107, yPos + 17);
      pdf.text('NÚMERO DE AUTORIZACIÓN', 107, yPos + 21);
      pdf.setFontSize(7);
      pdf.text(doc.accessKey, 107, yPos + 25);
      pdf.setFontSize(8);
      pdf.text('FECHA Y HORA DE AUTORIZACIÓN', 107, yPos + 29);
      pdf.text(new Date().toLocaleString(), 107, yPos + 33);
      pdf.text(`AMBIENTE: ${businessInfo.isProduction ? 'PRODUCCIÓN' : 'PRUEBAS'}`, 107, yPos + 37);

      yPos += 45;

      // SECCIÓN 2: Información del cliente
      pdf.rect(10, yPos, 190, 20);
      pdf.setFontSize(9);
      pdf.text(`Razón Social / Nombres y Apellidos: ${doc.entityName}`, 12, yPos + 6);
      pdf.text(`Identificación: ${doc.entityRuc || '9999999999999'}`, 12, yPos + 11);
      pdf.text(`Fecha Emisión: ${doc.issueDate}`, 12, yPos + 16);

      yPos += 25;

      // SECCIÓN 3: Tabla de productos
      console.log('🔄 Agregando tabla de productos...');
      const productData = docItems.map((item, idx) => [
        item.productId || `ITM-${idx + 1}`,
        item.quantity.toString(),
        item.description,
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.discount || 0).toFixed(2)}`,
        `$${(item.quantity * item.unitPrice - (item.discount || 0)).toFixed(2)}`
      ]);

      console.log('📊 Datos de productos:', productData.length, 'filas');

      // Usar autoTable como función (versión 5.x)
      try {
        autoTable(pdf, {
          startY: yPos,
          head: [['Cod. Principal', 'Cant.', 'Descripción', 'Precio Unitario', 'Descuento', 'Precio Total']],
          body: productData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 70 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
          }
        });
        console.log('✅ Tabla de productos agregada exitosamente');
      } catch (error) {
        console.error('❌ ERROR agregando tabla de productos:', error);
        throw error;
      }

      yPos = (pdf as any).lastAutoTable.finalY + 5;
      console.log('✅ Tabla de productos agregada. Nueva posición Y:', yPos);

      // SECCIÓN 4: Información adicional y totales (lado a lado)
      // Cuadro izquierdo: Información adicional
      pdf.rect(10, yPos, 100, 50);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Información Adicional', 12, yPos + 6);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Email: ${doc.entityEmail || 'N/A'}`, 12, yPos + 12);
      pdf.text(`Teléfono: ${doc.entityPhone || 'N/A'}`, 12, yPos + 17);
      pdf.text(`Dirección: ${doc.entityAddress || 'N/A'}`, 12, yPos + 22, { maxWidth: 95 });

      pdf.setFont('helvetica', 'bold');
      pdf.text('Forma de Pago', 12, yPos + 32);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${doc.paymentMethod || 'SIN UTILIZACION DEL SISTEMA FINANCIERO'}: $${doc.total.toFixed(2)}`, 12, yPos + 37);

      // Cuadro derecho: Totales
      console.log('🔄 Agregando tabla de totales...');
      const totalsData = [
        ['SUBTOTAL 15%', `$${pdfSub15.toFixed(2)}`],
        ['SUBTOTAL 0%', `$${pdfSub0.toFixed(2)}`],
        ['SUBTOTAL No objeto de IVA', '$0.00'],
        ['SUBTOTAL Exento de IVA', '$0.00'],
        ['SUBTOTAL SIN IMPUESTOS', `$${(pdfSub15 + pdfSub0).toFixed(2)}`],
        ['TOTAL Descuento', `$${totalDiscount.toFixed(2)}`],
        ['ICE', '$0.00'],
        ['IVA 15%', `$${pdfTax.toFixed(2)}`],
        ['PROPINA', '$0.00'],
        ['VALOR TOTAL', `$${doc.total.toFixed(2)}`]
      ];

      try {
        autoTable(pdf, {
          startY: yPos,
          body: totalsData,
          margin: { left: 115 },
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35, halign: 'right' }
          },
          didParseCell: (data: any) => {
            if (data.row.index === 9) { // Última fila (VALOR TOTAL)
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
        console.log('✅ Tabla de totales agregada exitosamente');
      } catch (error) {
        console.error('❌ ERROR agregando tabla de totales:', error);
        throw error;
      }
      
      console.log('✅ Tabla de totales agregada');

      // Agregar código QR al final
      console.log('🔄 Agregando código QR al PDF...');
      const qrYPos = yPos + 55;
      
      try {
        pdf.addImage(qrCodeDataUrl, 'PNG', 10, qrYPos, 30, 30);
        console.log('✅ Código QR agregado al PDF');
      } catch (error) {
        console.error('⚠️ Error agregando QR:', error);
      }
      
      pdf.setFontSize(6);
      pdf.text('CLAVE DE ACCESO', 10, qrYPos + 33);
      pdf.setFontSize(5);
      pdf.text(doc.accessKey, 10, qrYPos + 36, { maxWidth: 190 });

      console.log('✅ PDF completado. Preparando conversión a Base64...');
      
      // Verificar que el PDF tenga páginas
      const pageCount = pdf.internal.pages.length - 1; // -1 porque la primera es null
      console.log(`📄 Páginas en el PDF: ${pageCount}`);

      // Convertir a Base64 usando el método más confiable
      console.log('🔄 Convirtiendo PDF a Base64...');
      
      // Obtener el PDF como ArrayBuffer
      const pdfOutput = pdf.output('arraybuffer');
      console.log(`📦 PDF ArrayBuffer size: ${pdfOutput.byteLength} bytes (~${Math.round(pdfOutput.byteLength / 1024)} KB)`);
      
      // Convertir a Base64
      const uint8Array = new Uint8Array(pdfOutput);
      let binaryString = '';
      const chunkSize = 8192; // Procesar en chunks para evitar stack overflow
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const pdfBase64 = btoa(binaryString);
      
      // Verificar que el PDF no esté vacío
      if (!pdfBase64 || pdfBase64.length < 1000) {
        console.error('❌ PDF generado está vacío o es muy pequeño');
        console.error('📊 Datos del PDF:', {
          docItemsLength: docItems.length,
          pdfOutputLength: pdfOutput.byteLength,
          base64Length: pdfBase64.length
        });
        return null;
      }
      
      console.log(`✅ PDF generado correctamente:`);
      console.log(`   - ArrayBuffer: ${pdfOutput.byteLength} bytes`);
      console.log(`   - Base64: ${pdfBase64.length} caracteres (~${Math.round(pdfBase64.length / 1024)} KB)`);
      console.log(`   - Estimado final: ~${Math.round((pdfOutput.byteLength) / 1024)} KB`);
      return pdfBase64;
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      return null;
    }
  };

  // Función para enviar email manualmente
  const handleSendEmail = async () => {
    if (!lastDocument) {
      onNotify('No hay factura autorizada', 'warning');
      return;
    }

    const clientEmail = lastDocument.entityEmail || selectedClient?.email;
    if (!clientEmail) {
      onNotify('No hay email del cliente configurado', 'warning');
      return;
    }

    setSendingEmail(true);
    try {
      onNotify('Generando PDF del RIDE...', 'info');

      const attachments: any[] = [];

      // Adjuntar XML Base64
      if (lastDocument.authorizedXml) {
        attachments.push({
          filename: `factura_${lastDocument.number.replace(/-/g, '_')}.xml`,
          content: btoa(unescape(encodeURIComponent(lastDocument.authorizedXml))),
          type: 'application/xml'
        });
      }

      // Generar PDF usando los items guardados en el documento
      const pdfBase64 = await generatePdfBase64(lastDocument, lastDocument.items || []);
      if (pdfBase64) {
        attachments.push({
          filename: `factura_${lastDocument.number.replace(/-/g, '_')}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        });
      } else {
        onNotify('Advertencia: No se pudo generar PDF', 'warning');
      }

      const response = await fetch('http://localhost:3001/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Factura Electrónica N° ${lastDocument.number} - ${businessInfo.name}`,
          settings: notificationSettings,
          attachments: attachments.length > 0 ? attachments : undefined,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Factura Electrónica Autorizada</h2>
              <p>Estimado/a <strong>${lastDocument.entityName}</strong>,</p>
              <p>Adjunto encontrará su factura electrónica autorizada por el SRI en formato PDF y XML.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p><strong>Número:</strong> ${lastDocument.number}</p>
                <p><strong>Fecha:</strong> ${lastDocument.issueDate}</p>
                <p><strong>Total:</strong> $${lastDocument.total.toFixed(2)}</p>
                <p><strong>Clave de Acceso:</strong> ${lastDocument.accessKey}</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Puede verificar este documento en el portal del SRI usando la clave de acceso.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        onNotify('Correo enviado exitosamente con PDF y XML');
      } else {
        onNotify('Error al enviar el correo', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onNotify('Error al enviar el correo', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // Enviar email al cliente si tiene correo configurado (flujo automático)
  const sendAutoEmail = async (doc: Document, result: any, log: any) => {
    if (selectedClient?.email && result.authorizedXml) {
      log('📧 Enviando factura por correo al cliente...');
      try {
        // Generar PDF para el correo automático
        log('🔄 Generando PDF del RIDE...');
        const pdfBase64 = await generatePdfBase64(doc, items);
        log(pdfBase64 ? '✅ PDF generado correctamente' : '❌ Error generando PDF');

        const attachments = [{
          filename: `factura_${doc.number.replace(/-/g, '_')}.xml`,
          content: btoa(unescape(encodeURIComponent(result.authorizedXml))),
          type: 'application/xml'
        }];

        if (pdfBase64) {
          attachments.push({
            filename: `factura_${doc.number.replace(/-/g, '_')}.pdf`,
            content: pdfBase64,
            type: 'application/pdf'
          });
        } else {
          log('⚠️ No se pudo generar el PDF');
        }

        const emailResponse = await fetch('http://localhost:3001/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedClient.email,
            subject: `Factura Electrónica N° ${doc.number} - ${businessInfo.name}`,
            settings: notificationSettings,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Factura Electrónica Autorizada</h2>
                <p>Estimado/a <strong>${selectedClient.name}</strong>,</p>
                <p>Se ha generado su factura electrónica con los siguientes detalles:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <p><strong>Número:</strong> ${doc.number}</p>
                  <p><strong>Fecha:</strong> ${doc.issueDate}</p>
                  <p><strong>Total:</strong> $${totals.total.toFixed(2)}</p>
                  <p><strong>Clave de Acceso:</strong> ${result.claveAcceso}</p>
                </div>
                <p>El documento XML autorizado se adjunta a este correo.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  Este es un correo automático. Puede verificar este documento en el portal del SRI.
                </p>
              </div>
            `,
            attachments: attachments
          })
        });

        if (emailResponse.ok) {
          log('✅ Correo enviado exitosamente al cliente');
          onNotify('Factura autorizada y enviada por correo al cliente');
        } else {
          log('⚠️ No se pudo enviar el correo al cliente');
          onNotify('Factura autorizada (correo no enviado)');
        }
      } catch (emailError) {
        console.error('Error enviando email:', emailError);
        log('⚠️ Error al intentar enviar correo');
        onNotify('Factura autorizada (correo no enviado)');
      }
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totals = useMemo(() => {
    let sub15 = 0, sub0 = 0, desc = 0, tax = 0;
    items.forEach(i => {
      const base = i.quantity * i.unitPrice - (i.discount || 0);
      const net = Math.max(0, base);
      desc += (i.discount || 0);
      if (i.taxRate > 0) {
        sub15 += net;
        tax += (net * (i.taxRate / 100));
      } else {
        sub0 += net;
      }
    });
    return { sub15, sub0, desc, tax, total: sub15 + sub0 + tax };
  }, [items]);

  const addItem = (product: Product) => {
    const unitPrice = product[priceTier] || product.price;
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      updateItem(product.id, 'quantity', existing.quantity + 1);
    } else {
      setItems([...items, {
        productId: product.id,
        description: product.description,
        quantity: 1,
        unitPrice,
        discount: 0,
        taxRate: product.taxRate,
        total: unitPrice,
        imageUrl: product.imageUrl,
        type: product.type
      }]);
    }
    setShowProductDropdown(false);
    setSearchTerm('');
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(i => {
      if (i.productId === id) {
        const updated = { ...i, [field]: value };
        updated.total = Math.max(0, (updated.quantity * updated.unitPrice) - (updated.discount || 0));
        return updated;
      }
      return i;
    }));
  };

  const handleProcess = async () => {
    setIsSubmitting(true);
    setShowPreview(false);
    setAuthLogs([]);

    const log = (msg: string) => {
      setAuthStep(msg);
      setAuthLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // Generar número secuencial de 9 dígitos
    const sequential = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
    const numericCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');

    // Convertir fecha a formato DDMMYYYY
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString();
    const dateFormatted = `${day}${month}${year}`;

    const accessKey = generateAccessKey(
      dateFormatted,
      '01',
      businessInfo.ruc,
      businessInfo.isProduction ? '2' : '1',
      businessInfo.establishmentCode,
      businessInfo.emissionPointCode,
      sequential,
      numericCode,
      '1'
    );

    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: DocumentType.INVOICE,
      number: `${businessInfo.establishmentCode}-${businessInfo.emissionPointCode}-${sequential}`,
      accessKey: accessKey,
      issueDate: getLocalDateISO(),
      entityName: selectedClient?.name || 'CONSUMIDOR FINAL',
      entityRuc: selectedClient?.ruc || '9999999999999',
      entityEmail: selectedClient?.email || '',
      entityPhone: selectedClient?.phone || '',
      entityAddress: selectedClient?.address || '',
      total: totals.total,
      status: SriStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod,
      items: [...items]
    };

    const xml = buildInvoiceXml(doc, businessInfo, items);

    // Preparar opciones de firma si está disponible
    const signatureOptions = signatureFile && signaturePassword ? {
      p12File: signatureFile,
      password: signaturePassword,
      claveAcceso: accessKey
    } : null;

    const result = await authorizeWithSRI(xml, businessInfo.isProduction, signatureOptions, log);

    if (result.status === SriStatus.AUTHORIZED) {
      const authorizedDoc = {
        ...doc,
        status: SriStatus.AUTHORIZED,
        accessKey: result.claveAcceso || accessKey,
        authorizedXml: result.authorizedXml, // Guardar el XML autorizado
        items: items // IMPORTANTE: Guardar los items para poder generar el PDF después
      };
      setLastDocument(authorizedDoc);
      onAuthorize(authorizedDoc, items);

      // Enviar email al cliente si tiene correo configurado
      if (selectedClient?.email && result.authorizedXml) {
        await sendAutoEmail(authorizedDoc, result, log);
      } else {
        onNotify(result.message);
      }

      setItems([]);
      setSelectedClient(null);
    } else if (result.status === SriStatus.REJECTED) {
      onNotify(result.message, 'error');
    } else {
      onNotify(result.message, 'warning');
    }

    setIsSubmitting(false);
    setAuthStep('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8 animate-in fade-in duration-700 relative">
      <div className="xl:col-span-3 space-y-6">
        {lastDocument && (
          <div className="bg-emerald-600 rounded-[2.5rem] lg:rounded-[3.5rem] p-6 lg:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-emerald-200 print:hidden">
            <div className="flex items-center gap-4 lg:gap-6 text-center md:text-left flex-col md:flex-row">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center text-3xl lg:text-4xl">🏛️</div>
              <div>
                <h3 className="text-xl lg:text-2xl font-black tracking-tighter uppercase">Factura Autorizada</h3>
                <p className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-1">Clave: {lastDocument.accessKey.substring(0, 20)}...</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button onClick={() => setShowRide(true)} className="bg-white text-emerald-600 px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">🖨️ Ver RIDE</button>
              {lastDocument.entityEmail && (
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="bg-white text-blue-600 px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? '📧 Enviando...' : '📧 Enviar Email'}
                </button>
              )}
              <button onClick={() => setLastDocument(null)} className="bg-emerald-700 text-white px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-800 transition-all">Nueva Factura</button>
            </div>
          </div>
        )}

        {!lastDocument && (
          <>
            <div className="bg-white p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-stretch md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cliente Receptor</label>
                <select className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm" onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)} value={selectedClient?.id || ''}>
                  <option value="">Consumidor Final (9999999999999)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.ruc})</option>)}
                </select>
              </div>
              <div className="md:w-64 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Esquema Tarifario</label>
                <select className="w-full bg-blue-50 text-blue-700 p-4 rounded-2xl font-black outline-none border-2 border-blue-100 text-sm" value={priceTier} onChange={e => setPriceTier(e.target.value as any)}>
                  <option value="price">PVP PÚBLICO</option>
                  <option value="wholesalePrice">MAYORISTA</option>
                  <option value="distributorPrice">DISTRIBUIDOR</option>
                </select>
              </div>
            </div>

            <div className="bg-white p-4 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[500px] relative overflow-visible">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Detalle de Productos</h3>
                <div ref={searchRef} className="relative w-full lg:w-96">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</div>
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full bg-slate-100 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all border-2 border-transparent focus:border-blue-400"
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => searchTerm && setShowProductDropdown(true)}
                  />
                  {showProductDropdown && searchTerm && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-blue-200 rounded-2xl mt-2 shadow-2xl z-[100] max-h-96 overflow-y-auto">
                      {products.filter(p =>
                        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.code.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length > 0 ? (
                        <div className="p-2">
                          {products.filter(p =>
                            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.code.toLowerCase().includes(searchTerm.toLowerCase())
                          ).map(p => (
                            <button
                              key={p.id}
                              onClick={() => addItem(p)}
                              className="w-full text-left p-3 hover:bg-blue-50 rounded-xl flex items-center gap-4 transition-colors group"
                            >
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.description} className="w-14 h-14 rounded-lg object-cover border border-slate-200 group-hover:border-blue-400" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">📦</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-800 truncate">{p.description}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-slate-500">{p.code}</span>
                                  <span className="text-xs font-bold text-blue-600">${p[priceTier].toFixed(2)}</span>
                                  <span className="text-xs text-slate-400">Stock: {p.stock}</span>
                                </div>
                              </div>
                              <span className="text-blue-500 text-xl opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-slate-400">
                          <p className="text-3xl mb-2">🔍</p>
                          <p className="font-bold">No se encontraron productos</p>
                          <p className="text-sm">Intenta con otro término de búsqueda</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-50">
                      <th className="py-4 text-left px-4 w-12"></th>
                      <th className="py-4 text-left px-4">Descripción</th>
                      <th className="py-4 text-center w-24">Cantidad</th>
                      <th className="py-4 text-right w-28">Unitario</th>
                      <th className="py-4 text-right w-28">Descuento</th>
                      <th className="py-4 text-right w-28">Total</th>
                      <th className="py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(item => (
                      <tr key={item.productId}>
                        <td className="py-4 px-4">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.description} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xl">📦</div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-bold text-sm text-slate-800">{item.description}</p>
                          <p className="text-xs text-slate-400">{item.type === 'FISICO' ? '📦 Producto' : '⚙️ Servicio'}</p>
                        </td>
                        <td className="py-4 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            className="w-20 p-2 text-center font-black bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:outline-none"
                            onChange={e => updateItem(item.productId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </td>
                        <td className="py-4 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            className="w-24 p-2 text-right font-bold bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:outline-none text-slate-600"
                            onChange={e => updateItem(item.productId, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                          />
                        </td>
                        <td className="py-4 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount || 0}
                            className="w-24 p-2 text-right font-bold bg-amber-50 rounded-xl border-2 border-transparent focus:border-amber-500 focus:outline-none text-amber-600"
                            onChange={e => updateItem(item.productId, 'discount', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-4 text-right font-black text-blue-600 px-4">${item.total.toFixed(2)}</td>
                        <td className="py-4 px-4 text-right">
                          <button onClick={() => setItems(items.filter(i => i.productId !== item.productId))} className="text-slate-300 hover:text-rose-500 text-lg">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {items.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-4xl mb-2">🛒</p>
                    <p className="font-bold">No hay productos agregados</p>
                    <p className="text-sm">Busca y agrega productos para crear la factura</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-6">
        {!lastDocument && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 lg:sticky lg:top-8">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Cálculo de Impuestos</h4>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-xs font-bold text-slate-500"><span>Base Imponible</span><span>${(totals.sub15 + totals.sub0).toFixed(2)}</span></div>
              {totals.desc > 0 && (
                <div className="flex justify-between text-xs font-bold text-amber-600"><span>Descuentos</span><span>-${totals.desc.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between text-xs font-black text-blue-600"><span>IVA (15%)</span><span>${totals.tax.toFixed(2)}</span></div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-4xl font-black text-slate-900 tracking-tighter">${totals.total.toFixed(2)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Comprobante</p>
              </div>
            </div>

            <button
              disabled={items.length === 0 || isSubmitting}
              onClick={() => setShowPreview(true)}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-blue-600 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
              Conectar con SRI
            </button>
          </div>
        )}
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] p-10 max-w-2xl w-full space-y-8 animate-in zoom-in duration-300 shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 border-[6px] border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Protocolo SRI en Curso</h3>
                <p className="text-sm text-slate-500 font-medium">{authStep}</p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 h-64 overflow-y-auto font-mono text-[10px] text-blue-300/80 space-y-1">
              {authLogs.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-600 flex-shrink-0">➜</span>
                  <span>{l}</span>
                </div>
              ))}
              <div className="animate-pulse">_</div>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Confirmar Comprobante</h2>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-rose-500">✕</button>
            </div>
            <div className="p-10 space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ambiente Seleccionado</p>
                <p className={`font-black uppercase text-sm ${businessInfo.isProduction ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {businessInfo.isProduction ? '🚀 PRODUCCIÓN (Servidor Real)' : '🧪 PRUEBAS (Servidor Demo)'}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A pagar</p>
                  <p className="text-4xl font-black text-slate-900">${totals.total.toFixed(2)}</p>
                </div>
                <button
                  onClick={handleProcess}
                  className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all"
                >
                  Autorizar con SRI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRide && lastDocument && (
        <RideViewer document={lastDocument} businessInfo={businessInfo} items={lastDocument.items || []} onClose={() => setShowRide(false)} />
      )}
    </div>
  );
};

export default InvoiceForm;
