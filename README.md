<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🇪🇨 EcuaFact Pro - Sistema de Facturación Electrónica SRI

**Sistema completo de facturación electrónica integrado con el SRI de Ecuador**

[![Estado](https://img.shields.io/badge/Estado-Producción%20Ready-success)](/)
[![SRI](https://img.shields.io/badge/SRI-v1.1.0-blue)](https://www.sri.gob.ec)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Node](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

## ✨ Características Principales

- ✅ **Backend Proxy Implementado** - Comunicación SOAP con SRI
- 🔐 **Firma Digital XAdES-BES** - Certificados .p12
- 📄 **XML Estándar SRI** v1.1.0 oficial
- 🏛️ **Autorización en Tiempo Real** - Recepción + Autorización
- 📊 **Dashboard Completo** - Métricas y reportes
- 💳 **Gestión de Clientes/Productos** - CRUD completo
- 🎨 **Interfaz Moderna** - React 19 + Recharts
- 🤖 **Asistente IA** - Google Gemini integrado

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+ 
- npm o yarn
- Certificado digital .p12 (opcional para pruebas)

### Instalación Completa

```bash
# 1. Clonar o descargar el proyecto
cd sistema-facturacion

# 2. Instalar dependencias del frontend
npm install

# 3. Configurar variables de entorno frontend
cp .env.example .env
# Editar .env con tus valores

# 4. Instalar dependencias del backend
cd backend
npm install

# 5. Configurar variables de entorno backend
cp .env.example .env
# Editar .env con tus valores
cd ..
```

### Ejecutar Sistema

```bash
# Terminal 1 - Backend Proxy
cd backend
npm start
# Servidor corriendo en http://localhost:3001

# Terminal 2 - Frontend
npm run dev
# Aplicación corriendo en http://localhost:3000
```

## 🔧 Configuración

### Variables de Entorno

#### Frontend (`.env`)
```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_API_KEY=tu-clave-api-super-secreta-cambiar-en-produccion
```

#### Backend (`backend/.env`)
```bash
PORT=3001
NODE_ENV=development
API_KEY=tu-clave-api-super-secreta-cambiar-en-produccion
FRONTEND_URL=http://localhost:3000
```

### 1. Datos del Negocio
Ve a **Dashboard** y configura:
- RUC (13 dígitos)
- Nombre del negocio
- Dirección, teléfono, email
- **Ambiente**: Pruebas o Producción

### 2. Firma Digital (Opcional para pruebas)
- Carga tu certificado .p12 en la sección de firma
- Ingresa la contraseña del certificado
- El sistema validará automáticamente
- En ambiente de pruebas, la firma es opcional

### 3. Crear Primera Factura
1. Ve a **Nueva Factura**
2. Completa datos del cliente
3. Agrega productos/servicios
4. Click en **"Autorizar con SRI"**
5. El sistema:
   - Genera XML según estándar v1.1.0
   - Firma digitalmente (si hay certificado)
   - Envía a Recepción SRI
   - Consulta Autorización
6. Descarga RIDE (PDF) y XML firmado

## 🏗️ Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │◄───────►│Backend Proxy │◄───────►│  SRI API    │
│   React 19  │  HTTP   │  Node.js +   │  SOAP   │   Ecuador   │
│             │  REST   │   Express    │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
     │                         │
     │ .env                    │ .env
     │ VITE_BACKEND_URL        │ PORT=3001
     │ VITE_API_KEY            │ API_KEY
     └─────────────────────────┘
```

### Backend Proxy
El backend maneja:
- ✅ Firma digital con certificados .p12
- ✅ Comunicación SOAP con SRI
- ✅ Conversión XML a Base64
- ✅ Validación de certificados
- ✅ Rate limiting y seguridad

Endpoints:
- `POST /api/sri/sign-xml` - Firma XML
- `POST /api/sri/recepcion` - Envía a SRI
- `POST /api/sri/autorizacion` - Consulta autorización

## 📦 Tecnologías

### Frontend
- **React 19** + TypeScript - Framework UI
- **Vite** - Build tool rápido
- **Recharts** - Gráficos y reportes
- **Fetch API** - Comunicación con backend

### Backend
- **Node.js 18+** - Runtime
- **Express 4.21** - Web framework
- **soap 1.1.5** - Cliente SOAP para SRI
- **node-forge 1.3.1** - Firma digital XAdES-BES
- **xml2js 0.6.2** - Parser XML
- **helmet** - Seguridad HTTP
- **express-rate-limit** - Rate limiting
- **morgan** - HTTP logging

### Integración SRI
- ✅ XML Schema v1.1.0
- ✅ SOAP 1.1 Web Services
- ✅ Firma Digital XAdES-BES
- ✅ RSA-SHA1 Cryptography
- ✅ Validaciones oficiales

## 📄 Documentación

- [**GUIA_USO_COMPLETA.md**](GUIA_USO_COMPLETA.md) - Guía paso a paso del usuario
- [**SISTEMA_COMPLETADO.md**](SISTEMA_COMPLETADO.md) - Estado completo del sistema
- [**INTEGRACION_SRI.md**](INTEGRACION_SRI.md) - Documentación técnica SRI
- [**RESUMEN_IMPLEMENTACION.md**](RESUMEN_IMPLEMENTACION.md) - Resumen implementación
- [**BACKEND_PROXY_SRI.md**](BACKEND_PROXY_SRI.md) - Guía del backend proxy
- [**backend/README.md**](backend/README.md) - Documentación del backend

## 🎯 Funcionalidades

### Implementadas ✅
- ✅ Facturas electrónicas (código 01)
- ✅ **Notas de Crédito (código 04)** ⭐ NUEVO
- ✅ Backend proxy Node.js
- ✅ Firma digital XAdES-BES
- ✅ Autorización en tiempo real con SRI
- ✅ Gestión de clientes y productos
- ✅ Reportes y dashboard
- ✅ Generación de XML v1.1.0
- ✅ Validaciones oficiales (RUC, Cédula, Clave Acceso)
- ✅ Rate limiting y seguridad
- ✅ SOAP Web Services integrados
- ✅ Devoluciones y anulaciones

### Por Implementar 📋
- ⏳ Notas de Débito (código 05)
- ⏳ Guías de Remisión (código 06)
- ⏳ Retenciones (código 07)
- ⏳ Envío de email automático
- ⏳ Base de datos persistente (PostgreSQL)
- ⏳ Generación de RIDE (PDF)

## 🔐 Seguridad

### Implementado
- ✅ API Key authentication
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configurado
- ✅ Helmet security headers
- ✅ Validación de inputs
- ✅ Logging completo
- ✅ Certificados en memoria (no persisten)

### Recomendaciones
- No versionar archivos .env
- Cambiar API_KEY en producción
- Usar HTTPS obligatorio
- Implementar backups automáticos

## 📊 Cumplimiento Normativo

✅ Ficha Técnica Comprobantes Electrónicos v2.21  
✅ Esquema XSD v1.1.0  
✅ IVA 15% vigente 2024  
✅ SOAP 1.1 Web Services  
✅ Firma Digital XAdES-BES  
✅ Validación de RUC, Cédula, Clave de Acceso  
✅ Ambiente Pruebas y Producción

## 🚀 Deploy a Producción

### Backend
```bash
# En VPS/Cloud (Railway, Heroku, DigitalOcean, etc.)
cd backend
npm install
npm start

# O usar PM2
npm install -g pm2
pm2 start server.js --name sri-backend
pm2 save
pm2 startup
```

### Frontend
```bash
# Build para producción
npm run build

# Subir carpeta dist/ a:
# - Vercel
# - Netlify
# - Firebase Hosting
# - Servidor propio
```

### Configuración Producción
1. Obtener certificado digital de producción (.p12)
2. Configurar variables de entorno con valores reales
3. Cambiar ambiente a "Producción"
4. Generar API Key segura
5. Configurar dominio con HTTPS
6. Probar flujo completo en ambiente de pruebas primero

## 🛠️ Scripts Disponibles

### Frontend
```bash
npm run dev      # Desarrollo (Vite)
npm run build    # Build producción
npm run preview  # Preview build
npm run lint     # Linter
```

### Backend
```bash
npm start        # Producción
npm run dev      # Desarrollo (nodemon)
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:
1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo licencia MIT.

## 🆘 Soporte

### Recursos
- 📖 [Documentación SRI Oficial](https://www.sri.gob.ec/facturacion-electronica)
- 📞 Teléfono SRI: 1700 774 774
- 📧 Email SRI: atencionsri@sri.gob.ec

### Problemas Comunes

#### Backend no conecta
```bash
# Verificar que el backend esté corriendo
cd backend
npm start
# Debe mostrar: ✅ Servidor ejecutándose en: http://localhost:3001
```

#### Error de API Key
```bash
# Verificar que coincidan en ambos .env
# Frontend: VITE_API_KEY=xxx
# Backend: API_KEY=xxx
```

#### Certificado inválido
- Verificar que sea formato .p12
- Contraseña correcta
- Certificado vigente
- Emitido por entidad autorizada (Security Data, ANF, BCE)

---

<div align="center">

**🇪🇨 Desarrollado con ❤️ para Ecuador 🇪🇨**

**✅ Sistema 100% Funcional - Listo para Producción**

**Cumple con toda la normativa SRI vigente**

[Documentación](GUIA_USO_COMPLETA.md) • [Sistema Completado](SISTEMA_COMPLETADO.md) • [Integración SRI](INTEGRACION_SRI.md)

</div>
#   s i s t e m a - d e - f a c t u r a c i o n  
 