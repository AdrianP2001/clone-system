
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos (Seeding)...');

  // --------------------------------------------------------
  // 1. EMPRESA SAAS (SUPER ADMIN)
  // --------------------------------------------------------
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

  // USUARIO SUPER ADMIN
  // Email: superadmin@admin.com | Pass: superadmin123
  const superAdminPass = await bcrypt.hash('superadmin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@admin.com' },
    update: {
      password: superAdminPass,
      role: 'SUPERADMIN',
      businessId: saasCompany.id,
      isActive: true
    },
    create: {
      email: 'superadmin@admin.com',
      password: superAdminPass,
      role: 'SUPERADMIN',
      businessId: saasCompany.id,
      isActive: true
    },
  });
  console.log(`🦸 Super Admin: ${superAdmin.email} (Pass: superadmin123)`);

  // --------------------------------------------------------
  // 2. EMPRESA DEMO (Para usuario 'empresa' y 'vendedor')
  // --------------------------------------------------------
  const business = await prisma.business.upsert({
    where: { ruc: '1790000000001' },
    update: {
      email: 'empresa@gmail.com', // Actualizamos email de contacto
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
      email: 'empresa@gmail.com',
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
  console.log(`🏢 Empresa Demo: ${business.name}`);

  // USUARIO EMPRESA (ADMIN)
  // Email: empresa@gmail.com | Pass: Leon2017
  const empresaPass = await bcrypt.hash('Leon2017', 10);
  const empresaUser = await prisma.user.upsert({
    where: { email: 'empresa@gmail.com' },
    update: {
      password: empresaPass,
      role: 'ADMIN',
      businessId: business.id,
      isActive: true
    },
    create: {
      email: 'empresa@gmail.com',
      password: empresaPass,
      role: 'ADMIN',
      businessId: business.id,
      isActive: true
    },
  });
  console.log(`👤 Usuario Empresa: ${empresaUser.email} (Pass: Leon2017)`);

  // USUARIO VENDEDOR
  // Email: vendedor@gmail.com | Pass: 1423
  const vendedorPass = await bcrypt.hash('1423', 10);
  const vendedorUser = await prisma.user.upsert({
    where: { email: 'vendedor@gmail.com' },
    update: {
      password: vendedorPass,
      role: 'USER', // Rol de vendedor
      businessId: business.id,
      isActive: true
    },
    create: {
      email: 'vendedor@gmail.com',
      password: vendedorPass,
      role: 'USER',
      businessId: business.id,
      isActive: true
    },
  });
  console.log(`👤 Usuario Vendedor: ${vendedorUser.email} (Pass: 1423)`);

  // --------------------------------------------------------
  // 3. SECUENCIALES
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 4. CLIENTE
  // RUC: 0953443769 | Pass: 123456
  // --------------------------------------------------------
  const clientePass = await bcrypt.hash('123456', 10);
  
  // Buscamos si existe el cliente por RUC
  const existingClient = await prisma.client.findFirst({
    where: { ruc: '0953443769' }
  });

  const clientData = {
    name: 'CLIENTE VIP',
    ruc: '0953443769',
    email: 'cliente@vip.com',
    address: 'Guayaquil, Ecuador',
    phone: '0953443769',
    type: 'CLIENTE',
    businessId: business.id,
    password: clientePass
  };

  if (existingClient) {
    await prisma.client.update({
      where: { id: existingClient.id },
      data: { password: clientePass, businessId: business.id }
    });
    console.log(`👤 Cliente actualizado: ${clientData.ruc} (Pass: 123456)`);
  } else {
    await prisma.client.create({
      data: clientData
    });
    console.log(`👤 Cliente creado: ${clientData.ruc} (Pass: 123456)`);
  }

  console.log('✅ Sembrado de datos completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });