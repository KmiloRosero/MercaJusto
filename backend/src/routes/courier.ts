import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { ConflictError, NotFoundError } from "../middleware/errorHandler";
import { haversineKm } from "../lib/routing";
import { type SequenceEntry } from "../lib/courierRoute";
import { sendPushToUser } from "../lib/push";

// Apartado del repartidor. Solo ve los pedidos que puede hacer:
// - "Mi ruta": los suyos en camino, en el orden que calculó el VRP.
// - "Por recoger": los que tomó y aún debe recoger en la finca.
// - "Disponibles": listos para salir y sin repartidor. Antes de tomarlos solo
//   ve municipios y distancia; la dirección y el teléfono del cliente aparecen
//   cuando el pedido ya es suyo.

export const courierRouter = Router();
courierRouter.use(requireAuth, requireRole("COURIER"));

/** Estados en que un pedido puede tomarse: ya pagado (o efectivo) y aún sin salir. */
const TAKEABLE = ["CONFIRMED", "PREPARING"];
const paidOrCash = { NOT: { paymentMethod: "WOMPI", paymentStatus: { not: "PAID" } } };

const orderInclude = {
  items: {
    include: {
      product: {
        select: {
          name: true,
          unit: true,
          municipio: true,
          vereda: true,
          latitude: true,
          longitude: true,
          producer: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  },
  buyer: { select: { id: true, name: true, phone: true } },
  deliveryAddress: true,
  route: { select: { sequenceJson: true } },
} as const;

type FullOrder = Awaited<ReturnType<typeof loadOrders>>[number];

function loadOrders(where: object) {
  return prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "asc" } });
}

/** Finca de donde sale el pedido (la del primer producto). */
function farmOf(o: FullOrder) {
  const p = o.items[0]?.product;
  return p
    ? { municipio: p.municipio, vereda: p.vereda, lat: p.latitude, lng: p.longitude, producer: p.producer }
    : null;
}

const itemsSummary = (o: FullOrder) => o.items.map((it) => `${it.quantity} ${it.product.unit} ${it.product.name}`).join(", ");
/** Lo que el repartidor cobra al entregar: el total si es contraentrega sin pagar. */
const cashToCollect = (o: FullOrder) => (o.paymentMethod === "CASH" && o.paymentStatus !== "PAID" ? o.total : 0);

/** Pedido propio: con todo lo necesario para entregarlo. */
function ownOrder(o: FullOrder) {
  const farm = farmOf(o);
  const a = o.deliveryAddress;
  return {
    id: o.id,
    status: o.status,
    total: o.total,
    cashToCollect: cashToCollect(o),
    paymentMethod: o.paymentMethod,
    items: itemsSummary(o),
    notes: o.notes,
    buyer: o.buyer,
    address: a
      ? { label: a.label, detail: a.detail, vereda: a.vereda, municipio: a.municipio, lat: a.latitude, lng: a.longitude }
      : null,
    farm: farm ? { municipio: farm.municipio, vereda: farm.vereda, lat: farm.lat, lng: farm.lng, producer: farm.producer } : null,
  };
}

// ═══════════════════════════════════════════
// GET /api/courier/board — todo lo que el repartidor necesita hoy
// ═══════════════════════════════════════════
courierRouter.get("/board", async (req, res, next) => {
  try {
    const me = req.user!.userId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [inRoute, toPickUp, available, deliveredToday] = await Promise.all([
      loadOrders({ courierId: me, status: "IN_TRANSIT" }),
      loadOrders({ courierId: me, status: { in: TAKEABLE }, ...paidOrCash }),
      loadOrders({ courierId: null, status: { in: TAKEABLE }, ...paidOrCash }),
      prisma.order.findMany({
        where: { courierId: me, status: "DELIVERED", deliveredAt: { gte: startOfDay } },
        select: { total: true, paymentMethod: true },
      }),
    ]);

    // Orden de entrega: el de la ruta más reciente que incluye estos pedidos.
    const sequence = (() => {
      const withRoute = inRoute.find((o) => o.route?.sequenceJson);
      if (!withRoute) return [] as SequenceEntry[];
      try {
        return JSON.parse(withRoute.route!.sequenceJson) as SequenceEntry[];
      } catch {
        return [] as SequenceEntry[];
      }
    })();
    const position = (id: string) => {
      const i = sequence.findIndex((s) => s.orderId === id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const route = [...inRoute]
      .sort((a, b) => position(a.id) - position(b.id))
      .map((o) => {
        const entry = sequence.find((s) => s.orderId === o.id);
        return { ...ownOrder(o), etaMin: entry?.etaMin ?? null, kmFromStart: entry?.cumulativeKm ?? null };
      });

    res.json({
      stats: {
        deliveredToday: deliveredToday.length,
        inRoute: route.length,
        cashToCollect: route.reduce((acc, o) => acc + o.cashToCollect, 0),
      },
      route,
      toPickUp: toPickUp.map(ownOrder),
      available: available.map((o) => {
        const farm = farmOf(o);
        const a = o.deliveryAddress;
        const km = farm && a ? haversineKm({ lat: farm.lat, lng: farm.lng }, { lat: a.latitude, lng: a.longitude }) : null;
        // Sin dirección exacta ni teléfono hasta que lo tome.
        return {
          id: o.id,
          status: o.status,
          total: o.total,
          cashToCollect: cashToCollect(o),
          itemsCount: o.items.length,
          items: itemsSummary(o),
          from: farm ? { municipio: farm.municipio, vereda: farm.vereda, producerName: farm.producer.name } : null,
          to: a ? { municipio: a.municipio } : null,
          distanceKm: km !== null ? Math.round(km * 10) / 10 : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/courier/orders/:id/take — tomar un pedido disponible
// ═══════════════════════════════════════════
courierRouter.post("/orders/:id/take", async (req, res, next) => {
  try {
    const me = req.user!.userId;
    // Atómico: si otro repartidor lo tomó un instante antes, no se pisa.
    const { count } = await prisma.order.updateMany({
      where: { id: req.params.id, courierId: null, status: { in: TAKEABLE }, ...paidOrCash },
      data: { courierId: me },
    });
    if (count === 0) {
      const exists = await prisma.order.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!exists) throw new NotFoundError("Pedido no encontrado");
      throw new ConflictError("Otro repartidor ya tomó este pedido o ya no está disponible");
    }
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { select: { product: { select: { producerId: true } } } } },
    });
    const courier = await prisma.user.findUnique({ where: { id: me }, select: { name: true } });
    for (const producerId of new Set(order!.items.map((it) => it.product.producerId))) {
      void sendPushToUser(producerId, {
        title: "🛵 Repartidor asignado",
        body: `${courier?.name ?? "Un repartidor"} recogerá el pedido en tu finca.`,
        data: { orderId: order!.id },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
