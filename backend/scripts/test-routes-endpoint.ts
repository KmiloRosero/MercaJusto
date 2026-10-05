// Prueba end-to-end del endpoint POST /api/routes/optimize.
// Crea pedidos de prueba con coordenadas, optimiza, verifica y limpia.
// Uso: npm run test:routes (requiere el servidor corriendo en :4000)
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const BASE = "http://localhost:4000/api";

async function api(path: string, opts: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function login(phone: string): Promise<string> {
  await api("/auth/otp", { method: "POST", body: JSON.stringify({ phone }) });
  const { json } = await api("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code: "123456" }),
  });
  if (!json?.token) throw new Error("login falló: " + JSON.stringify(json));
  return json.token;
}

async function main() {
  const buyerPhone = "+573001234567"; // María Rodríguez (BUYER, del seed)
  const token = await login(buyerPhone);
  const me = await api("/users/me", { token });
  const buyerId = me.json.id;
  console.log("✔ comprador:", me.json.name);

  // Un producto con stock suficiente
  const prods = await api("/products?limit=1");
  const productId = prods.json.products[0].id;
  const stockAntes = prods.json.products[0].stock;
  console.log("✔ producto:", prods.json.products[0].name, "stock", stockAntes);

  // 8 direcciones alrededor de Pasto (dos grupos: norte y sur) para que el
  // clustering forme 2 zonas claras
  const coords = [
    { lat: 1.245, lng: -77.29, mun: "Pasto" },
    { lat: 1.252, lng: -77.3, mun: "Pasto" },
    { lat: 1.238, lng: -77.283, mun: "Pasto" },
    { lat: 1.26, lng: -77.305, mun: "Pasto" },
    { lat: 1.09, lng: -77.62, mun: "Túquerres" },
    { lat: 1.095, lng: -77.63, mun: "Túquerres" },
    { lat: 1.085, lng: -77.61, mun: "Túquerres" },
    { lat: 1.1, lng: -77.625, mun: "Túquerres" },
  ];

  const addressIds: string[] = [];
  const orderIds: string[] = [];

  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const addr = await api("/users/me/addresses", {
      method: "POST",
      token,
      body: JSON.stringify({
        label: `Prueba ${i}`,
        municipio: c.mun,
        vereda: `Vereda ${i}`,
        detail: `Calle prueba ${i}`,
        latitude: c.lat,
        longitude: c.lng,
      }),
    });
    addressIds.push(addr.json.id);

    // vaciar carrito y agregar 1 unidad
    await api("/cart", { method: "DELETE", token });
    await api("/cart/items", {
      method: "POST",
      token,
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const order = await api("/orders", {
      method: "POST",
      token,
      body: JSON.stringify({ deliveryAddressId: addr.json.id, paymentMethod: "NEQUI" }),
    });
    if (order.status !== 201) throw new Error("crear pedido falló: " + JSON.stringify(order.json));
    orderIds.push(order.json.id);
  }
  console.log(`✔ creados ${orderIds.length} pedidos de prueba`);

  // ── Optimizar (persistir) ──
  const opt = await api("/routes/optimize", {
    method: "POST",
    token,
    body: JSON.stringify({ orderIds, vehicles: 2, capacity: 12, persist: true }),
  });
  console.log("\n📊 optimize status:", opt.status);
  console.log("   depot:", JSON.stringify(opt.json.depot));
  console.log("   rutas:", opt.json.routeCount, "| pedidos:", opt.json.orderCount);
  console.log("   métricas:", JSON.stringify(opt.json.metrics));
  for (const r of opt.json.routes) {
    console.log(`     - ${r.zoneLabel}: ${r.stopCount} paradas, ${r.distanceKm} km`);
  }

  const routeIds = opt.json.routes.map((r: any) => r.id).filter(Boolean);

  // ── Verificar detalle de la primera ruta ──
  if (routeIds[0]) {
    const detail = await api(`/routes/${routeIds[0]}`, { token });
    console.log("\n🔎 detalle ruta status:", detail.status);
    console.log("   secuencia (primeras 3):", JSON.stringify(detail.json.sequence.slice(0, 3)));
    console.log("   pedidos asociados:", detail.json.orders.length);
  }

  // ── Verificar listado ──
  const list = await api("/routes", { token });
  console.log("\n📋 GET /routes status:", list.status, "| total rutas en BD:", list.json.length);

  // ── Aserciones básicas ──
  const m = opt.json.metrics;
  if (!(m.totalDistanceKm <= m.nearestNeighborDistanceKm + 1e-9))
    throw new Error("2-opt no mejoró al NN");
  if (opt.json.orderCount !== coords.length)
    throw new Error("no se cubrieron todos los pedidos");
  if (opt.json.routeCount > 2) throw new Error("más rutas que vehículos solicitados");
  console.log("\n✅ aserciones end-to-end correctas");

  // ── Limpieza ──
  await prisma.deliveryRoute.deleteMany({ where: { id: { in: routeIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.address.deleteMany({ where: { id: { in: addressIds } } });
  // restaurar stock descontado
  await prisma.product.update({
    where: { id: productId },
    data: { stock: { increment: orderIds.length } },
  });
  const after = await prisma.product.findUnique({ where: { id: productId } });
  console.log(
    `\n🧹 limpieza lista. Stock restaurado: ${after?.stock} (esperado ${stockAntes})`
  );
}

main()
  .catch((e) => {
    console.error("❌ ERROR:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
