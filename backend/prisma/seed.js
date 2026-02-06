const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos (Seeding)...');

  // 1. Crear Empresa Demo
  // Usamos upsert para crearla si no existe, o actualizarla si ya está
  const business = await prisma.business.upsert({
    where: { ruc: '1790000000001' },
    update: {
        // Aseguramos que tenga los permisos habilitados
        features: { 
            inventory: true, 
            accounting: true, 
            billing: true,
            reports: true 
        }
    },
    create: {
      name: 'EMPRESA DEMO S.A.',
      ruc: '1790000000001',
      email: 'admin@empresa.com',
      address: 'Av. Amazonas y Naciones Unidas, Quito',
      phone: '0999999999',
      plan: 'ENTERPRISE',
      isActive: true,
      features: { 
        inventory: true, 
        accounting: true, 
        billing: true,
        reports: true 
      },
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 año de suscripción
      subscriptionStatus: 'ACTIVE',
      establishmentCode: '001',
      emissionPointCode: '001',
      isAccountingObliged: true,
      isProduction: false
    },
  });

  console.log(`🏢 Empresa lista: ${business.name}`);

  // 2. Crear Usuario Admin para la Empresa
  const passwordHash = await bcrypt.hash('123456', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {
        password: passwordHash,
        businessId: business.id
    },
    create: {
      email: 'admin@empresa.com',
      password: passwordHash,
      role: 'ADMIN',
      businessId: business.id
    },
  });

  console.log(`👤 Usuario Admin: ${user.email} (Pass: 123456)`);

  // 3. Crear un Cliente para probar el Portal de Clientes
  const client = await prisma.client.upsert({
    where: {
        identification_businessId: { // Nombre de la restricción única compuesta
            identification: '1712345678001',
            businessId: business.id
        }
    },
    update: {},
    create: {
        name: 'CLIENTE PRUEBA S.A.',
        identification: '1712345678001',
        email: 'cliente@prueba.com',
        address: 'Calle Pruebas 123',
        phone: '0990000000',
        type: 'CLIENTE',
        businessId: business.id
    }
  });

  console.log(`👤 Cliente Portal: ${client.identification} (Pass: ${client.identification})`);

  // 4. Crear Usuario Super Admin (Dueño del SaaS)
  const superAdminPass = await bcrypt.hash('superadmin123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@admin.com' },
    update: {
        password: superAdminPass,
        role: 'SUPERADMIN',
        businessId: null // El Super Admin no pertenece a una empresa específica
    },
    create: {
      email: 'superadmin@admin.com',
      password: superAdminPass,
      role: 'SUPERADMIN',
      businessId: null
    },
  });

  console.log(`🦸 Super Admin: ${superAdmin.email} (Pass: superadmin123)`);
  console.log('✅ Datos de prueba insertados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });