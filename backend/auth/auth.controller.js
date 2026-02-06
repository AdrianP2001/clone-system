// UBICACIÓN: backend/auth/auth.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_temporal_123';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log(`🔍 Intentando login para: ${email}`);

        // 1. Buscamos el usuario por email
        const user = await prisma.user.findUnique({ where: { email } });

        // 2. Si no existe
        if (!user) {
            console.log('❌ Usuario no encontrado en DB');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // 3. 🔐 VALIDACIÓN DE CONTRASEÑA (HÍBRIDA)
        // Esto soporta tanto usuarios viejos (texto plano) como nuevos (encriptados)
        let passwordValida = false;

        // A. Intento 1: ¿Coinciden como texto plano? (Ej. Dev seeds)
        if (user.password === password) {
            passwordValida = true;
        } 
        // B. Intento 2: ¿Coinciden usando Bcrypt? (Producción)
        else {
            passwordValida = await bcrypt.compare(password, user.password);
        }

        if (!passwordValida) {
            console.log('❌ Contraseña incorrecta');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // 4. 🛑 VERIFICACIÓN DE EMPRESA (SaaS)
        // Si no es Superadmin y no tiene empresa, LO BLOQUEAMOS.
        let businessFeatures = {};

        if (user.role !== 'SUPERADMIN') {
            if (!user.businessId) {
                console.error('⛔ Acceso denegado: Usuario regular sin empresa.');
                return res.status(403).json({
                    message: 'Su cuenta no tiene una empresa asignada. Contacte soporte.'
                });
            }
            // Verificar estado de la empresa y cargar permisos
            const business = await prisma.business.findUnique({ where: { id: user.businessId } });
            if (!business || !business.isActive) {
                return res.status(403).json({ message: 'Su empresa está inactiva. Contacte a administración.' });
            }

            // Verificar vigencia de suscripción
            if (business.subscriptionEnd && new Date() > new Date(business.subscriptionEnd)) {
                console.error('⛔ Acceso denegado: Suscripción vencida.');
                return res.status(403).json({ message: 'Su suscripción ha vencido. Por favor realice el pago para continuar.' });
            }

            businessFeatures = business.features || {};
        }

        // 5. Generamos el token INCLUYENDO businessId
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                businessId: user.businessId // ¡CRÍTICO PARA QUE FUNCIONE!
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        console.log(`✅ Login exitoso: ${user.email} (Empresa: ${user.businessId || 'Superadmin'})`);

        // 6. Respondemos
        res.json({
            success: true,
            token,
            user: { 
                id: user.id,
                email: user.email, 
                role: user.role,
                businessId: user.businessId,
                features: businessFeatures // Enviamos los permisos al frontend
            }
        });

    } catch (error) {
        console.error('🔥 Error Crítico en Login:', error);
        res.status(500).json({ message: 'Error interno en el servidor' });
    }
};

const clientLogin = async (req, res) => {
    try {
        // Login para clientes: Usuario y Contraseña son la Cédula/RUC
        const { identification, password } = req.body;

        console.log(`🔍 Intentando login de CLIENTE: ${identification}`);

        // Buscamos en la tabla CLIENT, no en USER
        const client = await prisma.client.findFirst({
            where: { 
                identification: identification,
            }
        });

        if (!client) {
            return res.status(401).json({ message: 'Cliente no encontrado' });
        }

        // Lógica de contraseña:
        // 1. Si tiene contraseña configurada, la validamos con bcrypt
        // 2. Si NO tiene (es nuevo), validamos que password == identification
        let isValid = false;
        let requirePasswordChange = false;

        if (client.password) {
            isValid = await bcrypt.compare(password, client.password);
        } else if (password === identification) {
            isValid = true;
            requirePasswordChange = true; // Forzar cambio si usa la por defecto
        }

        if (!isValid) {
            return res.status(401).json({ message: 'Credenciales incorrectas.' });
        }

        // Generamos token con rol especial 'CLIENT'
        const token = jwt.sign(
            { 
                id: client.id, 
                email: client.email, 
                role: 'CLIENT',
                businessId: client.businessId 
            },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { ...client, role: 'CLIENT' },
            requirePasswordChange 
        });

    } catch (error) {
        console.error('🔥 Error Client Login:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

// ============================================
// RECUPERACIÓN DE CONTRASEÑA (Solo Usuarios con Password)
// ============================================

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'El email es requerido' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Por seguridad, no revelamos si el usuario existe o no
            return res.status(404).json({ message: 'No existe un usuario con este correo.' });
        }

        // Generamos un token de un solo uso.
        // Usamos la contraseña actual como parte del secreto. 
        // Si el usuario cambia la contraseña, este token se invalida automáticamente.
        const secret = JWT_SECRET + user.password;
        const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '15m' });

        // Enlace que se enviaría por correo (ajusta la URL a tu frontend)
        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${user.id}/${token}`;

        console.log(`📧 [SIMULACIÓN] Enlace de recuperación para ${email}: ${link}`);

        // Aquí deberías llamar a tu servicio de envío de emails (ej. SendGrid/Nodemailer)
        // Por ahora devolvemos el link para pruebas
        res.json({ 
            success: true, 
            message: 'Se ha generado el enlace de recuperación.',
            link: link // Quitar esto en producción
        });

    } catch (error) {
        console.error('🔥 Error Forgot Password:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { id, token, password } = req.body;

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) || id } });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Verificar token con el secreto compuesto
        const secret = JWT_SECRET + user.password;
        try {
            jwt.verify(token, secret);
        } catch (err) {
            return res.status(400).json({ message: 'El enlace ha expirado o es inválido' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('🔥 Error Reset Password:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

// ============================================
// GESTIÓN DE CONTRASEÑA DE CLIENTES
// ============================================

const changeClientPassword = async (req, res) => {
    try {
        const { clientId, newPassword } = req.body;
        // En producción, validar que req.user.id === clientId
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.client.update({
            where: { id: clientId },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error cambiando password cliente:', error);
        res.status(500).json({ message: 'Error al actualizar contraseña' });
    }
};

const clientForgotPassword = async (req, res) => {
    try {
        const { identification, email } = req.body;
        
        const client = await prisma.client.findFirst({
            where: { identification, email }
        });

        if (!client) {
            return res.status(404).json({ message: 'No coinciden los datos del cliente.' });
        }

        // Generar token temporal (usando el secreto + password actual o id si es null)
        const secret = JWT_SECRET + (client.password || client.identification);
        const token = jwt.sign({ id: client.id, identification: client.identification }, secret, { expiresIn: '15m' });

        // Link para el frontend (debes crear esta ruta en React)
        const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/reset-password/${client.id}/${token}`;

        console.log(`📧 [SIMULACIÓN CLIENTE] Recuperar pass para ${client.name}: ${link}`);

        res.json({ 
            success: true, 
            message: 'Enlace de recuperación generado (ver consola)',
            link // Solo para desarrollo
        });

    } catch (error) {
        console.error('Error client forgot password:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

// Nota: clientResetPassword sería muy similar a resetPassword pero buscando en prisma.client

module.exports = { login, clientLogin, forgotPassword, resetPassword, changeClientPassword, clientForgotPassword };