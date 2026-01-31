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
  });