import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

// El ahorro solo se calcula con precios de plaza reales (traditionalPrice).
// Las líneas sin precio de referencia no suman ahorro ni entran al porcentaje:
// nunca se estima una cifra que el productor no reportó.

const round1 = (n: number) => Math.round(n * 10) / 10;

interface CategoryBucket {
  categoryId: string;
  name: string;
  icon: string;
  itemsCount: number;
  mercaJustoTotal: number;
  traditionalTotal: number;
  savingsTotal: number;
}

interface ProductBucket {
  productId: string;
  name: string;
  unit: string;
  price: number;
  traditionalPrice: number | null;
  unitsSold: number;
  savingsTotal: number;
  savingsPct: number;
}

// ═══════════════════════════════════════════
// GET /api/metrics/fair-price — dashboard de "precio justo"
// Compara lo pagado al productor frente al precio de plaza de mercado /
// tienda tradicional, por pedido, categoría y producto.
// Query: from, to (rango ISO), buyerId, producerId
// ═══════════════════════════════════════════
metricsRouter.get("/fair-price", async (req, res, next) => {
  try {
    const q = z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        buyerId: z.string().optional(),
        producerId: z.string().optional(),
      })
      .parse(req.query);

    // Cada usuario solo ve sus propias cifras (compras o ventas)
    const me = req.user!;
    if (me.role === "BUYER") {
      q.buyerId = me.userId;
    } else if (me.role === "PRODUCER") {
      q.producerId = me.userId;
    }

    const createdAt: Record<string, Date> = {};
    if (q.from) createdAt.gte = new Date(q.from);
    if (q.to) createdAt.lte = new Date(q.to);

    const orders = await prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(q.buyerId ? { buyerId: q.buyerId } : {}),
        ...(q.producerId
          ? { items: { some: { product: { producerId: q.producerId } } } }
          : {}),
        ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    let mercaJustoTotal = 0;
    // Solo líneas con precio de plaza: base honesta para el porcentaje.
    let comparedMercaTotal = 0;
    let traditionalTotal = 0;
    let itemsCount = 0;
    let platformFees = 0;
    let deliveryFees = 0;
    let buyerPaidTotal = 0;
    let surplusUnits = 0;

    const categories = new Map<string, CategoryBucket>();
    const products = new Map<string, ProductBucket>();

    for (const order of orders) {
      platformFees += order.platformFee;
      deliveryFees += order.deliveryFee;
      buyerPaidTotal += order.total;

      for (const item of order.items) {
        const p = item.product;
        const lineMerca = item.subtotal;
        const hasReference = !!p.traditionalPrice && p.traditionalPrice > 0;
        const lineTraditional = hasReference ? p.traditionalPrice! * item.quantity : 0;
        const lineSavings = hasReference ? Math.max(0, lineTraditional - lineMerca) : 0;

        mercaJustoTotal += lineMerca;
        if (hasReference) {
          comparedMercaTotal += lineMerca;
          traditionalTotal += lineTraditional;
        }
        itemsCount += item.quantity;
        if (p.isSurplus) surplusUnits += item.quantity;

        const cat = categories.get(p.categoryId) ?? {
          categoryId: p.categoryId,
          name: p.category.name,
          icon: p.category.icon,
          itemsCount: 0,
          mercaJustoTotal: 0,
          traditionalTotal: 0,
          savingsTotal: 0,
        };
        cat.itemsCount += item.quantity;
        cat.mercaJustoTotal += lineMerca;
        cat.traditionalTotal += lineTraditional;
        cat.savingsTotal += lineSavings;
        categories.set(p.categoryId, cat);

        const prod = products.get(p.id) ?? {
          productId: p.id,
          name: p.name,
          unit: p.unit,
          price: p.price,
          traditionalPrice: p.traditionalPrice,
          unitsSold: 0,
          savingsTotal: 0,
          savingsPct: 0,
        };
        prod.unitsSold += item.quantity;
        prod.savingsTotal += lineSavings;
        if (p.traditionalPrice && p.traditionalPrice > 0) {
          prod.savingsPct = round1(
            ((p.traditionalPrice - p.price) / p.traditionalPrice) * 100
          );
        }
        products.set(p.id, prod);
      }
    }

    const savingsTotal = Math.max(0, traditionalTotal - comparedMercaTotal);

    res.json({
      generatedAt: new Date().toISOString(),
      filters: q,
      ordersCount: orders.length,
      itemsCount,
      totals: {
        buyerPaidTotal,
        producerRevenue: mercaJustoTotal,
        platformFees,
        deliveryFees,
        traditionalTotal,
        buyerSavingsTotal: savingsTotal,
        buyerSavingsPct:
          traditionalTotal > 0 ? round1((savingsTotal / traditionalTotal) * 100) : 0,
        avgTicket: orders.length > 0 ? Math.round(buyerPaidTotal / orders.length) : 0,
        surplusUnits,
      },
      byCategory: [...categories.values()]
        .map((c) => ({
          ...c,
          savingsPct:
            c.traditionalTotal > 0
              ? round1((c.savingsTotal / c.traditionalTotal) * 100)
              : 0,
        }))
        .sort((a, b) => b.savingsTotal - a.savingsTotal),
      topProducts: [...products.values()]
        .filter((p) => p.traditionalPrice !== null)
        .sort((a, b) => b.savingsPct - a.savingsPct)
        .slice(0, 6),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// GET /api/metrics/impact — "Mi impacto" (comprador) y "Mis ventas" (productor)
// Series semanales de las últimas 8 semanas y totales, solo con pedidos
// reales (sin cancelados ni pagos en línea pendientes). El ahorro, igual que
// arriba, solo cuenta líneas con precio de plaza reportado.
// ═══════════════════════════════════════════
const WEEKS = 8;
const DAY_MS = 24 * 3600 * 1000;

/** Lunes 00:00 (hora local del servidor) de la semana de `d`. */
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // lunes = 0
  x.setTime(x.getTime() - dow * DAY_MS);
  return x;
}

metricsRouter.get("/impact", async (req, res, next) => {
  try {
    const me = req.user!;
    if (me.role !== "BUYER" && me.role !== "PRODUCER") {
      res.json({ role: me.role, weeks: [], totals: null });
      return;
    }
    const isBuyer = me.role === "BUYER";
    const firstWeek = weekStart(new Date(Date.now() - (WEEKS - 1) * 7 * DAY_MS));

    const orders = await prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        NOT: { paymentMethod: "WOMPI", paymentStatus: { not: "PAID" } },
        ...(isBuyer ? { buyerId: me.userId } : { items: { some: { product: { producerId: me.userId } } } }),
      },
      include: { items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: "asc" },
    });

    const weeks = Array.from({ length: WEEKS }, (_, i) => ({
      start: new Date(firstWeek.getTime() + i * 7 * DAY_MS).toISOString(),
      // Comprador: ahorro frente a la plaza. Productor: lo que recibió.
      value: 0,
    }));

    let total = 0; // gastado (comprador) o recibido (productor)
    let savings = 0;
    let traditional = 0;
    let compared = 0;
    let surplusUnits = 0;
    let unitsSold = 0;
    const people = new Set<string>(); // productores apoyados o compradores atendidos
    const byCategory = new Map<string, { name: string; value: number }>();
    const byProduct = new Map<string, { name: string; unit: string; value: number; units: number }>();

    for (const o of orders) {
      const lines = isBuyer ? o.items : o.items.filter((it) => it.product.producerId === me.userId);
      if (lines.length === 0) continue;
      if (!isBuyer) people.add(o.buyerId);
      const w = Math.floor((weekStart(o.createdAt).getTime() - firstWeek.getTime()) / (7 * DAY_MS));

      for (const it of lines) {
        const p = it.product;
        if (isBuyer) people.add(p.producerId);
        const hasRef = !!p.traditionalPrice && p.traditionalPrice > 0;
        const lineSavings = hasRef ? Math.max(0, p.traditionalPrice! * it.quantity - it.subtotal) : 0;
        total += it.subtotal;
        unitsSold += it.quantity;
        if (p.isSurplus) surplusUnits += it.quantity;
        if (hasRef) {
          traditional += p.traditionalPrice! * it.quantity;
          compared += it.subtotal;
          savings += lineSavings;
        }
        const weekValue = isBuyer ? lineSavings : it.subtotal;
        if (w >= 0 && w < WEEKS) weeks[w].value += weekValue;

        const cat = byCategory.get(p.categoryId) ?? { name: p.category.name, value: 0 };
        cat.value += isBuyer ? lineSavings : it.subtotal;
        byCategory.set(p.categoryId, cat);

        const prod = byProduct.get(p.id) ?? { name: p.name, unit: p.unit, value: 0, units: 0 };
        prod.value += it.subtotal;
        prod.units += it.quantity;
        byProduct.set(p.id, prod);
      }
    }

    res.json({
      role: me.role,
      weeks,
      totals: {
        ordersCount: orders.length,
        total,
        savings,
        savingsPct: traditional > 0 ? round1(((traditional - compared) / traditional) * 100) : 0,
        surplusUnits,
        unitsSold,
        people: people.size,
      },
      byCategory: [...byCategory.values()].filter((c) => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 6),
      topProducts: [...byProduct.values()].sort((a, b) => b.value - a.value).slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});
