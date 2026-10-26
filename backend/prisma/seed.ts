// Seed con datos realistas de Nariño.
// Ejecutar: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { planCourierRoute } from "../src/lib/courierRoute";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Limpiando base de datos...");
  // Orden importa por foreign keys
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deliveryRoute.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  console.log("👥 Creando usuarios...");

  // ═══════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════

  // Todas las cuentas demo entran con su correo (@example.com) y la contraseña "mercajusto".
  const demoPassword = await hashPassword("mercajusto");

  const buyer = await prisma.user.create({
    data: {
      phone: "+573001234567",
      passwordHash: demoPassword,
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
      passwordHash: demoPassword,
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
      passwordHash: demoPassword,
      name: "Rosa Amelia Chávez",
      email: "rosa@example.com",
      role: "PRODUCER",
      rating: 5.0,
      ratingCount: 89,
    },
  });

  const producer3 = await prisma.user.create({
    data: {
      phone: "+573207890123",
      passwordHash: demoPassword,
      name: "Luis Alberto Burbano",
      email: "luis@example.com",
      role: "PRODUCER",
      rating: 4.6,
      ratingCount: 51,
    },
  });

  const producer4 = await prisma.user.create({
    data: {
      phone: "+573258901234",
      passwordHash: demoPassword,
      name: "Carmen Inés Jojoa",
      email: "carmen@example.com",
      role: "PRODUCER",
      rating: 4.9,
      ratingCount: 203,
    },
  });

  const courier = await prisma.user.create({
    data: {
      phone: "+573011112222",
      passwordHash: demoPassword,
      name: "Wilson López",
      email: "wilson@example.com",
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
        traditionalPrice: 12000,
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
        traditionalPrice: 5500,
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
        traditionalPrice: 16000,
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
        traditionalPrice: 13000,
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
        traditionalPrice: 4000,
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
        traditionalPrice: 4800,
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
        traditionalPrice: 6500,
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
        traditionalPrice: 2500,
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
        traditionalPrice: 32000,
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
        traditionalPrice: 26000,
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
        traditionalPrice: 7000,
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
        traditionalPrice: 19000,
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
        traditionalPrice: 16500,
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
        traditionalPrice: 4800,
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
        traditionalPrice: 290000,
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
        traditionalPrice: 5600,
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
        traditionalPrice: 32000,
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
        traditionalPrice: 21000,
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
        traditionalPrice: 3500,
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
        traditionalPrice: 3000,
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
        platformFee: 500,
        total: 14000,
        paymentMethod: "WOMPI",
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

  console.log("🚜 Creando pedido en curso para la demo del productor...");

  // Pedido confirmado con productos de Don José: desde su cuenta se puede
  // avanzar a "Preparando" → "En camino" → "Entregado" y María lo ve en vivo.
  const papaPastusa = await prisma.product.findFirst({ where: { name: "Papa pastusa" } });
  if (papaPastusa && buyerAddr) {
    const qty = 2;
    const unitPrice = papaPastusa.isSurplus
      ? Math.round(papaPastusa.price * (1 - papaPastusa.discountPct / 100))
      : papaPastusa.price;
    const subtotal = unitPrice * qty;
    const platformFee = Math.round(subtotal * 0.05);
    await prisma.order.create({
      data: {
        buyerId: buyer.id,
        status: "CONFIRMED",
        subtotal,
        deliveryFee: 3500,
        platformFee,
        total: subtotal + 3500 + platformFee,
        paymentMethod: "CASH",
        paymentStatus: "PENDING",
        deliveryAddressId: buyerAddr.id,
        notes: "Dejar con el portero, por favor.",
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
        items: {
          create: [
            { productId: papaPastusa.id, quantity: qty, unitPrice, subtotal },
          ],
        },
      },
    });
    await prisma.product.update({
      where: { id: papaPastusa.id },
      data: { stock: { decrement: qty } },
    });
  }

  console.log("📈 Creando historial de compras de María (últimas semanas)...");

  // Pedidos entregados en las últimas 7 semanas, con los precios del catálogo
  // demo, para que "Mi impacto" (María) y "Mis ventas" (Don José) tengan serie.
  const history: Array<{ daysAgo: number; items: Array<[string, number]> }> = [
    { daysAgo: 47, items: [["Papa criolla", 3], ["Zanahoria", 2]] },
    { daysAgo: 41, items: [["Papa pastusa", 4], ["Huevos de campo", 1]] },
    { daysAgo: 36, items: [["Oca roja", 2], ["Lulo andino", 1]] },
    { daysAgo: 29, items: [["Papa criolla", 2], ["Queso campesino", 1], ["Cilantro", 2]] },
    { daysAgo: 24, items: [["Mashua", 1], ["Plátano hartón", 4]] },
    { daysAgo: 17, items: [["Papa pastusa", 5], ["Leche cruda", 3]] },
    { daysAgo: 12, items: [["Papa criolla", 4], ["Maracuyá", 1], ["Huevos de campo", 2]] },
    { daysAgo: 6, items: [["Oca roja", 3], ["Café molido artesanal", 1]] },
    { daysAgo: 2, items: [["Papa pastusa", 3], ["Zanahoria", 3]] },
  ];
  for (const h of history) {
    const lines: Array<{ productId: string; quantity: number; unitPrice: number; subtotal: number }> = [];
    for (const [name, quantity] of h.items) {
      const p = await prisma.product.findFirst({ where: { name } });
      if (!p) continue;
      const unitPrice = p.isSurplus ? Math.round(p.price * (1 - p.discountPct / 100)) : p.price;
      lines.push({ productId: p.id, quantity, unitPrice, subtotal: unitPrice * quantity });
    }
    if (lines.length === 0) continue;
    const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
    const platformFee = Math.round(subtotal * 0.05);
    const createdAt = new Date(Date.now() - h.daysAgo * 24 * 3600 * 1000);
    await prisma.order.create({
      data: {
        buyerId: buyer.id,
        courierId: courier.id,
        status: "DELIVERED",
        subtotal,
        deliveryFee: 3500,
        platformFee,
        total: subtotal + 3500 + platformFee,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        deliveryAddressId: buyerAddr.id,
        createdAt,
        deliveredAt: new Date(createdAt.getTime() + 5 * 3600 * 1000),
        items: { create: lines },
      },
    });
  }

  console.log("🛵 Creando entregas en camino para la ruta de Wilson...");

  // Dos compradores demo más con pedidos ya despachados a Wilson. Cuando Don José
  // despacha el pedido de María, el VRP reordena las tres entregas y María ve
  // en qué parada va su pedido. Las cuentas existen solo como datos de demostración.
  const oca = await prisma.product.findFirst({ where: { name: "Oca roja" } });
  const mashua = await prisma.product.findFirst({ where: { name: "Mashua" } });
  const routeBuyers = [
    {
      name: "Ana Lucía Benavides",
      email: "ana@example.com",
      phone: "+573013334444",
      address: { municipio: "Pasto", detail: "Carrera 27 #12-30, Barrio San Ignacio", latitude: 1.224, longitude: -77.29 },
      product: oca,
    },
    {
      name: "Carlos Andrés Erazo",
      email: "carlos@example.com",
      phone: "+573015556666",
      address: { municipio: "Yacuanquer", detail: "Calle 5 #4-18, centro", latitude: 1.115, longitude: -77.402 },
      product: mashua,
    },
  ];
  for (const rb of routeBuyers) {
    if (!rb.product) continue;
    const user = await prisma.user.create({
      data: { phone: rb.phone, passwordHash: demoPassword, name: rb.name, email: rb.email, role: "BUYER" },
    });
    const addr = await prisma.address.create({
      data: { userId: user.id, label: "Casa", departamento: "Nariño", isDefault: true, ...rb.address },
    });
    const unitPrice = rb.product.price;
    const platformFee = Math.round(unitPrice * 0.05);
    await prisma.order.create({
      data: {
        buyerId: user.id,
        courierId: courier.id,
        status: "IN_TRANSIT",
        subtotal: unitPrice,
        deliveryFee: 3500,
        platformFee,
        total: unitPrice + 3500 + platformFee,
        paymentMethod: "CASH",
        paymentStatus: "PENDING",
        deliveryAddressId: addr.id,
        createdAt: new Date(Date.now() - 90 * 60 * 1000),
        items: { create: [{ productId: rb.product.id, quantity: 1, unitPrice, subtotal: unitPrice }] },
      },
    });
  }
  // Ruta inicial de Wilson saliendo de la finca de Don José.
  await planCourierRoute(courier.id, { lat: addrProducer1.latitude, lng: addrProducer1.longitude });

  console.log("✅ Seed completado");
  console.log("");
  console.log('👤 Cuentas demo (contraseña "mercajusto"):');
  console.log(`   Comprador:  ${buyer.email}`);
  console.log(`   Productor:  ${producer1.email}  (Don José - Túquerres)`);
  console.log(`   Repartidor: ${courier.email}`);
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
