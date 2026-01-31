# 🇪🇨 Backend Proxy SRI Ecuador

Backend Node.js/Express que actúa como proxy entre el frontend y los Web Services del SRI de Ecuador.

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y ajustar valores:

```bash
cp .env.example .env
```

### 3. Iniciar el servidor

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

El servidor estará disponible en: **http://localhost:3001**

## 📋 Endpoints Disponibles

### 1. **Firmar XML** 
`POST /api/sri/sign-xml`

Firma un XML con certificado digital .p12

**Body:**
```json
{
  "xml": "<factura>...</factura>",
  "p12Base64": "MIIK...",
  "password": "certificado123",
  "claveAcceso": "2912202501179123456700120010010000000011234567818"
}
```

**Respuesta:**
```json
{
  "success": true,
  "signedXml": "<factura>...<ds:Signature>...</ds:Signature></factura>",
  "certificateInfo": {
    "subject": "CN=EMPRESA SA, O=EMPRESA",
    "validFrom": "01/01/2024",
    "validTo": "31/12/2025"
  }
}
```

### 2. **Enviar a Recepción SRI**
`POST /api/sri/recepcion`

Envía el comprobante firmado al SRI para validación

**Body:**
```json
{
  "xmlSigned": "<factura>...<ds:Signature>...</ds:Signature></factura>",
  "isProduction": false
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "estado": "RECIBIDA",
  "claveAcceso": "2912202501179123456700120010010000000011234567818",
  "mensaje": "Comprobante recibido correctamente por el SRI"
}
```

### 3. **Consultar Autorización**
`POST /api/sri/autorizacion`

Consulta el estado de autorización de un comprobante

**Body:**
```json
{
  "claveAcceso": "2912202501179123456700120010010000000011234567818",
  "isProduction": false
}
```

**Respuesta Autorizada:**
```json
{
  "success": true,
  "estado": "AUTORIZADO",
  "numeroAutorizacion": "2912202501179123456700120010010000000011234567818",
  "fechaAutorizacion": "2024-12-29T10:30:00.000Z",
  "mensaje": "Comprobante autorizado exitosamente por el SRI"
}
```

### 4. **Health Check**
`GET /health`

Verifica que el servidor esté funcionando

**Respuesta:**
```json
{
  "status": "OK",
  "message": "Proxy SRI funcionando correctamente",
  "timestamp": "2024-12-29T10:00:00.000Z",
  "environment": "development"
}
```

### 5. **Información del Servidor**
`GET /api/info`

Devuelve información sobre el servidor y endpoints disponibles

## 🔐 Autenticación

En **producción**, todos los endpoints bajo `/api/sri/` requieren el header:

```
X-API-Key: tu-clave-secreta
```

Configurar en `.env`:
```
API_KEY=tu-clave-secreta
NODE_ENV=production
```

En **desarrollo**, la autenticación está deshabilitada.

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3001` |
| `NODE_ENV` | Entorno (development/production) | `development` |
| `FRONTEND_URL` | URL del frontend para CORS | `http://localhost:3000` |
| `API_KEY` | Clave de autenticación (producción) | - |
| `LOG_LEVEL` | Nivel de logs | `info` |

## 🛡️ Seguridad

- ✅ Helmet para headers de seguridad
- ✅ Rate limiting (100 requests por 15 minutos)
- ✅ CORS configurado
- ✅ Body parser con límite de 10MB
- ✅ Validación de certificados digitales
- ✅ Logs de todas las operaciones

## 📊 Logs

El servidor registra todas las operaciones:

```
📝 Firmando XML con certificado digital...
✅ XML firmado correctamente
📡 Conectando a Recepción SRI (PRUEBAS)...
📤 Enviando comprobante al SRI...
📋 Estado recepción: RECIBIDA
✅ Comprobante RECIBIDO por el SRI
```

## 🐛 Debugging

### Verificar que el servidor esté funcionando:

```bash
curl http://localhost:3001/health
```

### Ver información del servidor:

```bash
curl http://localhost:3001/api/info
```

### Probar endpoint de firma (con curl):

```bash
curl -X POST http://localhost:3001/api/sri/sign-xml \
  -H "Content-Type: application/json" \
  -d '{
    "xml": "<factura>...</factura>",
    "p12Base64": "...",
    "password": "...",
    "claveAcceso": "..."
  }'
```

## 🚀 Deploy en Producción

### Opción 1: PM2 (VPS)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar servidor
pm2 start server.js --name "sri-proxy"

# Ver logs
pm2 logs sri-proxy

# Reiniciar
pm2 restart sri-proxy

# Configurar inicio automático
pm2 startup
pm2 save
```

### Opción 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
docker build -t sri-proxy .
docker run -p 3001:3001 --env-file .env sri-proxy
```

### Opción 3: Heroku

```bash
# Crear Procfile
echo "web: node server.js" > Procfile

# Deploy
git push heroku main
```

## 📝 Notas Importantes

1. **Certificados SSL:** El servidor acepta certificados autofirmados del SRI en pruebas
2. **Timeouts:** Los requests SOAP tienen timeout de 30 segundos
3. **Rate Limiting:** 100 requests cada 15 minutos por IP
4. **CORS:** Solo el frontend configurado puede hacer requests
5. **Logs:** Todos los errores se registran en consola

## 🔄 Flujo Completo

```
Frontend → POST /api/sri/sign-xml → Backend firma XML
Backend → POST /api/sri/recepcion → Envía a SRI
Backend → POST /api/sri/autorizacion → Consulta SRI
Backend → Respuesta → Frontend muestra resultado
```

## 🆘 Problemas Comunes

### Error: "ECONNREFUSED"
- Verificar que el SRI esté disponible
- Revisar conexión a internet
- Probar con endpoint de pruebas primero

### Error: "Invalid password"
- Verificar contraseña del certificado .p12
- Probar el certificado con otra herramienta

### Error: "Certificado expirado"
- Renovar certificado digital
- Verificar fecha del sistema

### Error: "CORS blocked"
- Verificar `FRONTEND_URL` en `.env`
- Agregar dominio al array de CORS si es necesario

## 📚 Referencias

- [SRI Ecuador - Facturación Electrónica](https://www.sri.gob.ec/facturacion-electronica)
- [Web Services SRI](https://cel.sri.gob.ec/comprobantes-electronicos-ws/)
- [Express.js Documentation](https://expressjs.com/)
- [Node SOAP Library](https://www.npmjs.com/package/soap)

---

**Desarrollado para integración con SRI Ecuador**
**Versión: 1.0.0**
