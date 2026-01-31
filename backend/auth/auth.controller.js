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
        if (user.role !== 'SUPERADMIN' && !user.businessId) {
            console.error('⛔ Acceso denegado: Usuario regular sin empresa.');
            return res.status(403).json({
                message: 'Su cuenta no tiene una empresa asignada. Contacte soporte.'
            });
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
                businessId: user.businessId
            }
        });

    } catch (error) {
        console.error('🔥 Error Crítico en Login:', error);
        res.status(500).json({ message: 'Error interno en el servidor' });
    }
};

module.exports = { login };