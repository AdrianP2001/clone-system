<<<<<<< HEAD
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
=======
// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// 1. Datos de Prueba (Mocks)
const MOCK_CLIENTS = [
  { ruc: '9999999999999', name: 'CONSUMIDOR FINAL', email: 'consumidor@ejemplo.com', address: 'Ecuador', phone: '999999999', type: 'CLIENTE' },
  { ruc: '1790011223001', name: 'Corporación Favorita', email: 'contabilidad@favorita.com', address: 'Av. Amazonas N21', phone: '022334455', type: 'AMBOS' },
  { ruc: '1755889966001', name: 'Juan Pérez', email: 'juan.perez@gmail.com', address: 'Quito, Sector Carolina', phone: '0998877665', type: 'CLIENTE' },
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
  console.log('🌱 Iniciando siembra de datos SaaS...');

  // --- PASO 1: CREAR LA EMPRESA PRINCIPAL ---
  // Usamos upsert para no duplicar si corres el seed varias veces
  const empresa = await prisma.business.upsert({
    where: { ruc: '1799999999001' },
    update: {},
    create: {
      name: 'Empresa Demo S.A.',
      ruc: '1799999999001',
      tradename: 'EcuaFact Demo',
      address: 'Av. De los Shyris y Suecia',
      phone: '0991234567',
      email: 'info@ecuafact-demo.com',
      plan: 'ENTERPRISE',
      isActive: true,
      // Configuración SRI por defecto
      establishmentCode: '001',
      emissionPointCode: '001',
      isAccountingObliged: true,
      themeColor: '#2563eb'
    }
  });

  console.log(`🏢 Empresa creada: ${empresa.name} (ID: ${empresa.id})`);

  // --- PASO 2: CREAR USUARIO ADMIN ---
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecuafact.com' },
    update: {
      businessId: empresa.id // Aseguramos que esté vinculado si ya existía
    },
    create: {
      email: 'admin@ecuafact.com',
      password: passwordHash,
      role: 'SUPERADMIN',
      businessId: empresa.id // ¡Vinculación Clave!
    }
  });

  console.log('👤 Usuario Admin creado vinculado a la empresa.');

  // --- PASO 3: CREAR SECUENCIALES (FACTURAS) ---
  // Cada empresa necesita sus propios contadores
  await prisma.sequence.upsert({
    where: {
      type_establishmentCode_emissionPointCode_businessId: {
        type: '01', // Factura
        establishmentCode: '001',
        emissionPointCode: '001',
        businessId: empresa.id
      }
    },
    update: {},
    create: {
      type: '01',
      establishmentCode: '001',
      emissionPointCode: '001',
      currentValue: 1,
      businessId: empresa.id
    }
  });
  console.log('🔢 Secuenciales de facturación inicializados.');

  // --- PASO 4: CARGAR CLIENTES ---
  console.log('👥 Cargando clientes...');
  for (const clientData of MOCK_CLIENTS) {
    // Agregamos el businessId a cada cliente
    const dataConBusiness = { ...clientData, businessId: empresa.id };

    await prisma.client.upsert({
      where: {
        ruc_businessId: { // Ahora la clave única es compuesta
          ruc: clientData.ruc,
          businessId: empresa.id
        }
      },
      update: {},
      create: dataConBusiness,
    });
  }

  // --- PASO 5: CARGAR PRODUCTOS ---
  console.log('📦 Cargando productos...');
  for (const prodData of MOCK_PRODUCTS) {
    const dataConBusiness = { ...prodData, businessId: empresa.id };

    await prisma.product.upsert({
      where: {
        code_businessId: {
          code: prodData.code,
          businessId: empresa.id
        }
      },
      update: {},
      create: dataConBusiness,
    });
  }

  console.log('✅ ¡Siembra SaaS completada con éxito!');
  console.log('👉 Login: admin@ecuafact.com / admin123');
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1)
>>>>>>> 901d58ce423c2ddaab87b01448f2d25b65b4ef5a
  });