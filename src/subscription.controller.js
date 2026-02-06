const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Agregar tiempo a la suscripción de una empresa
const addSubscriptionTime = async (req, res) => {
    try {
        const { businessId, months } = req.body;

        if (!businessId || !months) {
            return res.status(400).json({ message: 'Se requiere el ID de la empresa y la cantidad de meses.' });
        }

        // Verificar que la empresa existe
        const business = await prisma.business.findUnique({
            where: { id: parseInt(businessId) }
        });

        if (!business) {
            return res.status(404).json({ message: 'Empresa no encontrada.' });
        }

        // Calcular la nueva fecha de vencimiento
        const now = new Date();
        let currentEnd = business.subscriptionEnd ? new Date(business.subscriptionEnd) : now;

        // Si la suscripción ya venció, comenzamos desde hoy
        if (currentEnd < now) {
            currentEnd = now;
        }

        // Sumar los meses
        const newEndDate = new Date(currentEnd);
        newEndDate.setMonth(newEndDate.getMonth() + parseInt(months));

        // Actualizar la empresa
        const updatedBusiness = await prisma.business.update({
            where: { id: parseInt(businessId) },
            data: {
                subscriptionEnd: newEndDate,
                isActive: true // Asegurar que la empresa esté activa
            }
        });

        res.json({ success: true, message: 'Suscripción actualizada correctamente.', subscriptionEnd: updatedBusiness.subscriptionEnd });

    } catch (error) {
        console.error('Error al agregar suscripción:', error);
        res.status(500).json({ message: 'Error interno al actualizar la suscripción' });
    }
};

module.exports = { addSubscriptionTime };