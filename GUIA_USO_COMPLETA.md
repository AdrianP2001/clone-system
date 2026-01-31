# 🚀 Guía de Uso Completa - Sistema de Facturación Electrónica SRI

## ✅ Estado del Sistema

### Servicios Activos
- **Frontend**: http://localhost:3000 ✅
- **Backend Proxy**: http://localhost:3001 ✅
- **SRI Test**: Conectado a celcer.sri.gob.ec ✅

## 📋 Pasos para Facturar

### 1️⃣ Acceder al Sistema
```
http://localhost:3000
```

### 2️⃣ Configurar Negocio
En la sección **Dashboard**:
- Nombre del negocio
- RUC (13 dígitos)
- Dirección
- Teléfono
- Email
- **Ambiente**: Pruebas (para testing) o Producción

### 3️⃣ Cargar Certificado Digital (Opcional para pruebas)
1. Ir a la sección de **Firma Digital**
2. Cargar archivo `.p12` (certificado digital)
3. Ingresar contraseña del certificado
4. El sistema validará el certificado

> **Nota**: En ambiente de pruebas, el SRI acepta documentos sin firma para testing

### 4️⃣ Crear Factura
1. Ir a **Nueva Factura**
2. Completar datos del cliente:
   - Identificación (Cédula/RUC)
   - Nombre
   - Email
   - Dirección
   - Teléfono

3. Agregar productos/servicios:
   - Descripción
   - Cantidad
   - Precio unitario
   - IVA (0% o 15%)
   - Descuento (opcional)

4. Verificar totales:
   - Subtotal
   - IVA 15%
   - Total

### 5️⃣ Autorizar con el SRI
1. Click en **"Autorizar con SRI"**
2. El sistema ejecutará:
   - ✅ Generación del XML según estándar v1.1.0
   - 🔐 Firma digital (si hay certificado)
   - 📡 Envío a Recepción SRI
   - 🔍 Consulta de Autorización

3. Ver progreso en tiempo real
4. Al finalizar:
   - **AUTORIZADO**: Factura válida, listo para entregar
   - **DEVUELTA**: Revisar errores y corregir
   - **NO AUTORIZADO**: Verificar datos

### 6️⃣ Descargar Documentos
Una vez autorizada:
- **Descargar RIDE**: PDF de la factura con código QR
- **Descargar XML**: Archivo firmado para enviar al cliente

## 🔧 Configuración Técnica

### Variables de Entorno

#### Frontend (.env)
```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_API_KEY=tu-clave-api-super-secreta-cambiar-en-produccion
```

#### Backend (backend/.env)
```bash
PORT=3001
NODE_ENV=development
API_KEY=tu-clave-api-super-secreta-cambiar-en-produccion
FRONTEND_URL=http://localhost:3000
```

## 📡 Endpoints del Backend

### 1. Firmar XML
```bash
POST http://localhost:3001/api/sri/sign-xml
Content-Type: application/json
X-API-Key: tu-clave-api-super-secreta-cambiar-en-produccion

{
  "xml": "<factura>...</factura>",
  "p12Base64": "MIIJmQIBAz...",
  "password": "contraseña123"
}
```

### 2. Enviar a Recepción SRI
```bash
POST http://localhost:3001/api/sri/recepcion
Content-Type: application/json
X-API-Key: tu-clave-api-super-secreta-cambiar-en-produccion

{
  "xml": "<factura>...</factura>",
  "endpoint": "https://celcer.sri.gob.ec/..."
}
```

### 3. Consultar Autorización
```bash
POST http://localhost:3001/api/sri/autorizacion
Content-Type: application/json
X-API-Key: tu-clave-api-super-secreta-cambiar-en-produccion

{
  "claveAcceso": "0101202401099999999999100010012345678901234567890",
  "endpoint": "https://celcer.sri.gob.ec/..."
}
```

### 4. Health Check
```bash
GET http://localhost:3001/health
```

## 🛡️ Seguridad

### Características Implementadas
- ✅ Autenticación con API Key
- ✅ Rate limiting (100 solicitudes por 15 minutos)
- ✅ CORS configurado
- ✅ Helmet para seguridad HTTP
- ✅ Validación de certificados
- ✅ Logging de todas las operaciones

### Cambiar API Key
1. Editar `backend/.env`
2. Editar `.env` (frontend)
3. Reiniciar ambos servicios

```bash
# Generar nueva API Key segura
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Validaciones del SRI

### RUC (13 dígitos)
- Primeros 10: cédula
- Dígito 11-12: establecimiento
- Dígito 13: verificador (módulo 11)

### Cédula (10 dígitos)
- Primeros 2: provincia (01-24)
- Dígito 3: menor a 6
- Dígito 10: verificador (módulo 10)

### Clave de Acceso (49 dígitos)
```
[fecha 8][tipo 2][ruc 13][ambiente 1][serie 6][secuencial 9][código numérico 8][tipo emisión 1][dígito verificador 1]
```

Ejemplo:
```
01012024 01 0999999999001 1 001001 000000001 12345678 1 2
```

## 🐛 Solución de Problemas

### Error: "Cannot connect to backend"
```bash
# Verificar que el backend esté corriendo
cd backend
npm start
```

### Error: "Invalid API Key"
```bash
# Verificar que la API Key coincida en ambos .env
# Frontend: VITE_API_KEY
# Backend: API_KEY
```

### Error: "SOAP Error"
```bash
# Verificar conectividad con SRI
curl https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl
```

### Error: "Comprobante DEVUELTO"
- Verificar formato del XML
- Revisar clave de acceso
- Validar dígito verificador
- Comprobar secuencial único

### Error: "Certificado inválido"
- Verificar que sea .p12
- Contraseña correcta
- Certificado vigente
- Emitido por entidad autorizada

## 📈 Próximos Pasos

### Funcionalidades Pendientes
- [ ] Notas de Crédito (código 04)
- [ ] Guías de Remisión (código 06)
- [ ] Retenciones (código 07)
- [ ] Descarga masiva de RIDE
- [ ] Integración con base de datos
- [ ] Reportes de ventas
- [ ] Dashboard de métricas

### Producción
1. Obtener certificado digital de producción
2. Cambiar ambiente a "Producción"
3. Configurar dominio en FRONTEND_URL
4. Cambiar API_KEY con clave segura
5. Configurar HTTPS
6. Desplegar backend en VPS/Cloud
7. Configurar PM2 para auto-restart

## 📞 Recursos

### Documentación Oficial SRI
- [Facturación Electrónica](https://www.sri.gob.ec/facturacion-electronica)
- [Ficha Técnica v2.21](https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/435ca226-b48d-4080-bb12-bf03a54527fd/FICHA%20T%c3%89CNICA%20COMPROBANTES%20ELECTR%c3%93NICOS%20ESQUEMA%20OFFLINE%20V%202.21.pdf)
- [XSD Factura v1.1.0](https://celcer.sri.gob.ec/comprobantes-electronicos-ws/schemas/factura_v1.1.0.xsd)

### Soporte Técnico
- Email: atencionsri@sri.gob.ec
- Teléfono: 1700 774 774

## 🎯 Flujo Completo

```
┌─────────────┐
│   Usuario   │
│  (Frontend) │
└──────┬──────┘
       │ 1. Crear Factura
       ▼
┌─────────────────┐
│ Generar XML SRI │
│   (Estándar)    │
└──────┬──────────┘
       │ 2. XML sin firma
       ▼
┌─────────────────┐
│ Backend Proxy   │◄────── 3. Firmar XML
│  (Node.js)      │        (Certificado .p12)
└──────┬──────────┘
       │ 4. XML firmado
       ▼
┌─────────────────┐
│  SRI Recepción  │◄────── 5. SOAP validarComprobante
│  (Web Service)  │
└──────┬──────────┘
       │ 6. RECIBIDA
       ▼
┌─────────────────┐
│ SRI Autorización│◄────── 7. SOAP autorizacionComprobante
│  (Web Service)  │
└──────┬──────────┘
       │ 8. AUTORIZADO
       ▼
┌─────────────────┐
│   Descargar     │
│ RIDE + XML      │
└─────────────────┘
```

## ✨ ¡Listo para Facturar!

Tu sistema está completamente configurado y listo para emitir facturas electrónicas válidas ante el SRI de Ecuador.

**Comandos para iniciar:**

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

Luego acceder a: **http://localhost:3000**
