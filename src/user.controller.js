const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los usuarios con el estado de su empresa (suscripción)
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                businessId: true,
                business: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        subscriptionEnd: true
                    }
                }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno al obtener usuarios' });
    }
};

module.exports = { getAllUsers };