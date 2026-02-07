
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Datos de Prueba (Mocks)
const MOCK_CLIENTS = [
  { identification: '9999999999999', name: 'CONSUMIDOR FINAL', email: 'consumidor@ejemplo.com', address: 'Ecuador', phone: '999999999', type: 'CLIENTE' },
  { identification: '1790011223001', name: 'Corporación Favorita', email: 'contabilidad@favorita.com', address: 'Av. Amazonas N21', phone: '022334455', type: 'AMBOS' },
  { identification: '1755889966001', name: 'Juan Pérez', email: 'juan.perez@gmail.com', address: 'Quito, Sector Carolina', phone: '0998877665', type: 'CLIENTE' },
];

const MOCK_PRODUCTS = [
  {
    code: 'SRV-001',
    description: 'Consultoría TI Senior',
    price: 85.00,
    taxRate: 15,
    stock: 999,
    type: 'SERVICIO',
    category: 'Servicios Profesionales'
  },
  {
    code: 'PROD-010',
    description: 'Laptop Workstation Pro',
    price: 1850.00,
    taxRate: 15,
    stock: 12,
    type: 'BIEN',
    category: 'Electrónica'
  }
];

async function main() {
  console.log('🌱 Iniciando sembrado de datos (Seeding)...');

  // 0. Crear Empresa SaaS (Dueña del Sistema - Super Admin Corp)
  const saasCompany = await prisma.business.upsert({
    where: { ruc: '9999999999999' },
    update: {},
    create: {
      name: 'ECUAFACT SAAS GLOBAL',
      ruc: '9999999999999',
      email: 'gerencia@ecuafact.com',
      address: 'Nube - Servidor Central',
      phone: '0999999999',
      plan: 'UNLIMITED',
      isActive: true,
      features: { inventory: true, accounting: true, billing: true, reports: true },
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 100)), // 100 años
      subscriptionStatus: 'ACTIVE',
      establishmentCode: '001',
      emissionPointCode: '001',
      isAccountingObliged: true,
      isProduction: true,
      themeColor: '#1e293b'
    }
  });
  console.log(`🏢 Empresa SaaS creada: ${saasCompany.name}`);

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

  // 3. Crear Secuenciales
  const existingSeq = await prisma.sequence.findFirst({
    where: {
      type: '01',
      businessId: business.id
    }
  });

  if (!existingSeq) {
    await prisma.sequence.create({
      data: {
        type: '01',
        establishmentCode: '001',
        emissionPointCode: '001',
        currentValue: 1,
        businessId: business.id
      }
    });
    console.log('🔢 Secuenciales inicializados.');
  }

  // 4. Crear Usuario Super Admin (Dueño del SaaS)
  const superAdminPass = await bcrypt.hash('superadmin123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@admin.com' },
    update: {
      password: superAdminPass,
      role: 'SUPERADMIN',
      businessId: saasCompany.id // Asignado a la empresa SaaS
    },
    create: {
      email: 'superadmin@admin.com',
      password: superAdminPass,
      role: 'SUPERADMIN',
      businessId: saasCompany.id // Asignado a la empresa SaaS
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