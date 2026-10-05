// Seed con datos realistas de Nariño.
// Ejecutar: npm run db:seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Limpiando base de datos...");
  // Orden importa por foreign keys
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.deliveryRoute.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  console.log("👥 Creando usuarios...");

  // ═══════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════

  const buyer = await prisma.user.create({
    data: {
      phone: "+573001234567",
      name: "María Rodríguez",
      role: "BUYER",
      email: "maria@example.com",
      avatarUrl: null,
      rating: 4.9,
      ratingCount: 23,
    },
  });

  const producer1 = await prisma.user.create({
    data: {
      phone: "+573104567890",
      name: "José Tulio Enríquez",
      role: "PRODUCER",
      email: "donjose@example.com",
      rating: 4.8,
      ratingCount: 145,
    },
  });

  const producer2 = await prisma.user.create({
    data: {
      phone: "+573156789012",
      name: "Rosa Amelia Chávez",
      role: "PRODUCER",
      rating: 5.0,
      ratingCount: 89,
    },
  });

  const producer3 = await prisma.user.create({
    data: {
      phone: "+573207890123",
      name: "Luis Alberto Burbano",
      role: "PRODUCER",
      rating: 4.6,
      ratingCount: 51,
    },
  });

  const producer4 = await prisma.user.create({
    data: {
      phone: "+573258901234",
      name: "Carmen Inés Jojoa",
      role: "PRODUCER",
      rating: 4.9,
      ratingCount: 203,
    },
  });

  const courier = await prisma.user.create({
    data: {
      phone: "+573011112222",
      name: "Wilson López",
      role: "COURIER",
      rating: 4.7,
      ratingCount: 312,
    },
  });

  console.log("📍 Creando direcciones...");

  // ═══════════════════════════════════════════
  // DIRECCIONES (coordenadas reales aproximadas)
  // ═══════════════════════════════════════════

  const buyerAddr = await prisma.address.create({
    data: {
      userId: buyer.id,
      label: "Casa",
      municipio: "Pasto",
      departamento: "Nariño",
      vereda: null,
      detail: "Calle 18 #35-42, Barrio Lorenzo de Aldana",
      latitude: 1.2136,
      longitude: -77.2811,
      isDefault: true,
    },
  });

  const addrProducer1 = await prisma.address.create({
    data: {
      userId: producer1.id,
      label: "Finca",
      municipio: "Túquerres",
      vereda: "La Vega",
      detail: "Finca Santa Rosa, vía a Guaitarilla",
      latitude: 1.0869,
      longitude: -77.6200,
      isDefault: true,
    },
  });

  const addrProducer2 = await prisma.address.create({
    data: {
      userId: producer2.id,
      label: "Finca",
      municipio: "Guaitarilla",
      vereda: "El Rosal",
      detail: "Finca La Esperanza",
      latitude: 0.9836,
      longitude: -77.6833,
      isDefault: true,
    },
  });

  const addrProducer3 = await prisma.address.create({
    data: {
      userId: producer3.id,
      label: "Finca",
      municipio: "Buesaco",
      vereda: "San Ignacio",
      detail: "Finca El Cafetal",
      latitude: 1.2000,
      longitude: -77.1500,
      isDefault: true,
    },
  });

  const addrProducer4 = await prisma.address.create({
    data: {
      userId: producer4.id,
      label: "Finca",
      municipio: "Ipiales",
      vereda: "Las Lajas",
      detail: "Vereda Las Lajas, sector La Huerta",
      latitude: 0.8283,
      longitude: -77.6439,
      isDefault: true,
    },
  });

  console.log("🏷️ Creando categorías...");

  // ═══════════════════════════════════════════
  // CATEGORÍAS
  // ═══════════════════════════════════════════

  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Tubérculos", icon: "🥔", slug: "tuberculos" } }),
    prisma.category.create({ data: { name: "Verduras", icon: "🥬", slug: "verduras" } }),
    prisma.category.create({ data: { name: "Frutas", icon: "🍎", slug: "frutas" } }),
    prisma.category.create({ data: { name: "Granos", icon: "🫘", slug: "granos" } }),
    prisma.category.create({ data: { name: "Lácteos y huevos", icon: "🥚", slug: "lacteos-huevos" } }),
    prisma.category.create({ data: { name: "Café y cacao", icon: "☕", slug: "cafe-cacao" } }),
    prisma.category.create({ data: { name: "Hierbas", icon: "🌿", slug: "hierbas" } }),
  ]);

  const [catTuberculos, catVerduras, catFrutas, catGranos, catLacteos, catCafe, catHierbas] = categories;

  console.log("🌾 Creando productos...");

  // ═══════════════════════════════════════════
  // PRODUCTOS — precios en COP reales del sur de Nariño (2026)
  // ═══════════════════════════════════════════

  await prisma.product.createMany({
    data: [
      // Don José — Túquerres (papa)
      {
        producerId: producer1.id,
        categoryId: catTuberculos.id,
        name: "Papa criolla",
        description: "Papa criolla recién cosechada, ideal para sudados y ajiaco. Cultivada a 3.000 m.s.n.m. sin pesticidas.",
        price: 8500,
        unit: "kg",
        stock: 120,
        photoUrl: null,
        isSurplus: false,
        discountPct: 0,
        harvestDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        vereda: "La Vega",
        municipio: "Túquerres",
        latitude: 1.0869,
        longitude: -77.6200,
        isActive: true,
      },
      {
        producerId: producer1.id,
        categoryId: catTuberculos.id,
        name: "Papa pastusa",
        description: "Papa pastusa de primera, tamaño uniforme. Bulto de 50 kg o venta por kilo.",
        price: 3800,
        unit: "kg",
        stock: 480,
        isSurplus: true,
        discountPct: 20,
        harvestDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        vereda: "La Vega",
        municipio: "Túquerres",
        latitude: 1.0869,
        longitude: -77.6200,
        isActive: true,
      },
      {
        producerId: producer1.id,
        categoryId: catTuberculos.id,
        name: "Mashua",
        description: "Mashua morada, tubérculo andino tradicional. Propiedades medicinales.",
        price: 12000,
        unit: "kg",
        stock: 25,
        harvestDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        vereda: "La Vega",
        municipio: "Túquerres",
        latitude: 1.0869,
        longitude: -77.6200,
        isActive: true,
      },
      {
        producerId: producer1.id,
        categoryId: catTuberculos.id,
        name: "Oca roja",
        description: "Oca roja de altura, dulce y harinosa. Cosecha de temporada.",
        price: 9500,
        unit: "kg",
        stock: 40,
        harvestDate: new Date(Date.now() - 4 * 24 * 3600 * 1000),
        vereda: "La Vega",
        municipio: "Túquerres",
        latitude: 1.0869,
        longitude: -77.6200,
        isActive: true,
      },

      // Doña Rosa — Guaitarilla (cebolla, verduras)
      {
        producerId: producer2.id,
        categoryId: catVerduras.id,
        name: "Cebolla de hoja",
        description: "Cebolla larga fresca, manojos de 500g. Cultivada en el valle de Guaitarilla.",
        price: 2500,
        unit: "manojo",
        stock: 200,
        harvestDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },
      {
        producerId: producer2.id,
        categoryId: catVerduras.id,
        name: "Zanahoria",
        description: "Zanahoria dulce, calibre mediano. Ideal para jugos.",
        price: 3200,
        unit: "kg",
        stock: 90,
        isSurplus: true,
        discountPct: 15,
        harvestDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },
      {
        producerId: producer2.id,
        categoryId: catVerduras.id,
        name: "Remolacha",
        description: "Remolacha roja intensa, tamaño uniforme.",
        price: 4500,
        unit: "kg",
        stock: 35,
        harvestDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },
      {
        producerId: producer2.id,
        categoryId: catVerduras.id,
        name: "Cilantro",
        description: "Cilantro fresco en manojos grandes.",
        price: 1500,
        unit: "manojo",
        stock: 150,
        harvestDate: new Date(),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },

      // Luis Alberto — Buesaco (café)
      {
        producerId: producer3.id,
        categoryId: catCafe.id,
        name: "Café pergamino seco",
        description: "Café variedad Castillo, altura 1.800 m.s.n.m. Tostión media.",
        price: 24000,
        unit: "kg",
        stock: 80,
        harvestDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        vereda: "San Ignacio",
        municipio: "Buesaco",
        latitude: 1.2000,
        longitude: -77.1500,
        isActive: true,
      },
      {
        producerId: producer3.id,
        categoryId: catCafe.id,
        name: "Café molido artesanal",
        description: "Café tostado y molido, presentación 500g. Notas de cacao y panela.",
        price: 18000,
        unit: "bolsa 500g",
        stock: 45,
        harvestDate: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        vereda: "San Ignacio",
        municipio: "Buesaco",
        latitude: 1.2000,
        longitude: -77.1500,
        isActive: true,
      },
      {
        producerId: producer3.id,
        categoryId: catFrutas.id,
        name: "Plátano hartón",
        description: "Plátano verde, racimos de 10-12 unidades.",
        price: 4800,
        unit: "unidad",
        stock: 60,
        isSurplus: true,
        discountPct: 10,
        harvestDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        vereda: "San Ignacio",
        municipio: "Buesaco",
        latitude: 1.2000,
        longitude: -77.1500,
        isActive: true,
      },

      // Carmen Inés — Ipiales (huevos, lácteos, granos)
      {
        producerId: producer4.id,
        categoryId: catLacteos.id,
        name: "Huevos de campo",
        description: "Huevos de gallina criolla criada en pastoreo. Docena.",
        price: 14500,
        unit: "docena",
        stock: 100,
        harvestDate: new Date(),
        vereda: "Las Lajas",
        municipio: "Ipiales",
        latitude: 0.8283,
        longitude: -77.6439,
        isActive: true,
      },
      {
        producerId: producer4.id,
        categoryId: catLacteos.id,
        name: "Queso campesino",
        description: "Queso fresco elaborado con leche de la mañana. Pieza de 500g.",
        price: 12000,
        unit: "pieza 500g",
        stock: 30,
        harvestDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        vereda: "Las Lajas",
        municipio: "Ipiales",
        latitude: 0.8283,
        longitude: -77.6439,
        isActive: true,
      },
      {
        producerId: producer4.id,
        categoryId: catLacteos.id,
        name: "Leche cruda",
        description: "Leche de vaca recién ordeñada, sin pasteurizar. Solo para consumo cocinado.",
        price: 3500,
        unit: "litro",
        stock: 50,
        harvestDate: new Date(),
        vereda: "Las Lajas",
        municipio: "Ipiales",
        latitude: 0.8283,
        longitude: -77.6439,
        isActive: true,
      },
      {
        producerId: producer4.id,
        categoryId: catGranos.id,
        name: "Frijol bola roja",
        description: "Frijol bola roja de cosecha reciente. Bulto de 25 kg.",
        price: 220000,
        unit: "bulto 25kg",
        stock: 8,
        harvestDate: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        vereda: "Las Lajas",
        municipio: "Ipiales",
        latitude: 0.8283,
        longitude: -77.6439,
        isActive: true,
      },
      {
        producerId: producer4.id,
        categoryId: catGranos.id,
        name: "Arroz de meseta",
        description: "Arroz blanco, libra.",
        price: 4200,
        unit: "lb",
        stock: 200,
        vereda: "Las Lajas",
        municipio: "Ipiales",
        latitude: 0.8283,
        longitude: -77.6439,
        isActive: true,
      },

      // Extra de frutas
      {
        producerId: producer3.id,
        categoryId: catFrutas.id,
        name: "Lulo andino",
        description: "Lulo de altura, caja de 5 kg.",
        price: 22000,
        unit: "caja 5kg",
        stock: 20,
        harvestDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        vereda: "San Ignacio",
        municipio: "Buesaco",
        latitude: 1.2000,
        longitude: -77.1500,
        isActive: true,
      },
      {
        producerId: producer3.id,
        categoryId: catFrutas.id,
        name: "Maracuyá",
        description: "Maracuyá dulce, malla de 3 kg.",
        price: 15000,
        unit: "malla 3kg",
        stock: 25,
        isSurplus: true,
        discountPct: 25,
        harvestDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        vereda: "San Ignacio",
        municipio: "Buesaco",
        latitude: 1.2000,
        longitude: -77.1500,
        isActive: true,
      },
      {
        producerId: producer2.id,
        categoryId: catHierbas.id,
        name: "Albahaca",
        description: "Albahaca fresca en manojo grande.",
        price: 2000,
        unit: "manojo",
        stock: 60,
        harvestDate: new Date(),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },
      {
        producerId: producer2.id,
        categoryId: catHierbas.id,
        name: "Hierbabuena",
        description: "Hierbabuena para aromáticas y mojitos.",
        price: 1800,
        unit: "manojo",
        stock: 80,
        harvestDate: new Date(),
        vereda: "El Rosal",
        municipio: "Guaitarilla",
        latitude: 0.9836,
        longitude: -77.6833,
        isActive: true,
      },
    ],
  });

  console.log("🛒 Creando carrito demo para María...");

  const papaCriolla = await prisma.product.findFirst({ where: { name: "Papa criolla" } });
  const huevos = await prisma.product.findFirst({ where: { name: "Huevos de campo" } });

  if (papaCriolla && huevos) {
    await prisma.cartItem.createMany({
      data: [
        { userId: buyer.id, productId: papaCriolla.id, quantity: 3 },
        { userId: buyer.id, productId: huevos.id, quantity: 2 },
      ],
    });
  }

  console.log("📦 Creando pedido histórico de ejemplo...");

  const cebolla = await prisma.product.findFirst({ where: { name: "Cebolla de hoja" } });
  if (cebolla && buyerAddr) {
    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        courierId: courier.id,
        status: "DELIVERED",
        subtotal: 10000,
        deliveryFee: 3500,
        platformFee: 800,
        total: 14300,
        paymentMethod: "NEQUI",
        paymentStatus: "PAID",
        deliveryAddressId: buyerAddr.id,
        deliveredAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        items: {
          create: [
            { productId: cebolla.id, quantity: 4, unitPrice: 2500, subtotal: 10000 },
          ],
        },
      },
    });

    await prisma.review.create({
      data: {
        orderId: order.id,
        fromUserId: buyer.id,
        toUserId: producer2.id,
        rating: 5,
        comment: "La cebolla llegó fresquísima y Doña Rosa fue muy amable. ¡Volveré a comprar!",
      },
    });
  }

  console.log("✅ Seed completado");
  console.log("");
  console.log("👤 Credenciales demo:");
  console.log(`   Comprador:  ${buyer.phone}  (OTP dev: 123456)`);
  console.log(`   Productor:  ${producer1.phone}  (Don José - Túquerres)`);
  console.log(`   Repartidor: ${courier.phone}`);
  console.log("");
  console.log(`📊 Total: ${await prisma.user.count()} usuarios, ${await prisma.product.count()} productos, ${await prisma.order.count()} pedidos`);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
