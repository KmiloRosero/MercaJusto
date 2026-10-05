import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

// Cuando un producto no tiene precio de referencia cargado, estimamos el
// precio de plaza con el ahorro histórico del modelo (35% sobre el precio
// MercaJusto). Es un fallback: la mayoría del catálogo sí tiene traditionalPrice.
const FALLBACK_SAVINGS_PCT = 0.35;

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
        const lineTraditional = p.traditionalPrice
          ? p.traditionalPrice * item.quantity
          : lineMerca + Math.round(lineMerca * FALLBACK_SAVINGS_PCT);
        const lineSavings = lineTraditional - lineMerca;

        mercaJustoTotal += lineMerca;
        traditionalTotal += lineTraditional;
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

    const savingsTotal = traditionalTotal - mercaJustoTotal;

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
