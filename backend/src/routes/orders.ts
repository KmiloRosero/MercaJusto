import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendPushToUser } from "../lib/push";
import { effectivePrice, orderTotals } from "../lib/pricing";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { notifyProducersOfNewOrder } from "../lib/payments";
import { wompiEnabled } from "../lib/wompi";
import { deliveryViewFor, planCourierRoute } from "../lib/courierRoute";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

/** Quién participa en un pedido y con qué papel. */
async function loadParticipation(orderId: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { producerId: true } } } } },
  });
  if (!order) throw new NotFoundError("Pedido no encontrado");
  const producerIds = [...new Set(order.items.map((it) => it.product.producerId))];
  return {
    order,
    producerIds,
    isBuyer: order.buyerId === userId,
    isProducer: producerIds.includes(userId),
    isCourier: order.courierId === userId,
  };
}

// GET /api/orders/mine — pedidos del usuario logueado
ordersRouter.get("/mine", async (req, res, next) => {
  try {
    const role = req.user!.role;
    const where =
      role === "BUYER" ? { buyerId: req.user!.userId } :
      role === "COURIER" ? { courierId: req.user!.userId } :
      { items: { some: { product: { producerId: req.user!.userId } } } };

    const orders = await prisma.order.findMany({
      // Productor y repartidor no ven pedidos en línea hasta que se pagan
      where: role === "BUYER" ? where : { ...where, NOT: { paymentMethod: "WOMPI", paymentStatus: { not: "PAID" } } },
      include: {
        items: { include: { product: { include: { category: true } } } },
        buyer: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        courier: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        deliveryAddress: true,
        // Para saber si el comprador ya calificó (botón "Calificar" en la lista)
        reviews: { select: { fromUserId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — solo comprador, productores del pedido o repartidor
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const p = await loadParticipation(req.params.id, req.user!.userId);
    if (!p.isBuyer && !p.isProducer && !p.isCourier) {
      throw new ForbiddenError("No tienes acceso a este pedido");
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                producer: {
                  select: { id: true, name: true, phone: true, rating: true, ratingCount: true, avatarUrl: true },
                },
              },
            },
          },
        },
        buyer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        courier: {
          select: { id: true, name: true, phone: true, avatarUrl: true, rating: true, ratingCount: true },
        },
        deliveryAddress: true,
        reviews: true,
        route: { select: { zoneLabel: true, totalDistanceKm: true, sequenceJson: true } },
      },
    });
    if (!order) throw new NotFoundError("Pedido no encontrado");
    // La ruta completa es para el repartidor y los productores; el comprador ve su parada.
    const { route, ...rest } = order;
    const delivery =
      order.status === "IN_TRANSIT" ? deliveryViewFor(order.id, route, p.isCourier || p.isProducer) : null;
    res.json({ ...rest, delivery });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/orders — crear pedido desde el carrito
// ═══════════════════════════════════════════
const createOrderSchema = z.object({
  deliveryAddressId: z.string(),
  paymentMethod: z.enum(["WOMPI", "CASH"]),
  notes: z.string().max(300).optional(),
});

ordersRouter.post("/", requireRole("BUYER"), async (req, res, next) => {
  try {
    const { deliveryAddressId, paymentMethod, notes } = createOrderSchema.parse(req.body);
    const userId = req.user!.userId;
    if (paymentMethod === "WOMPI" && !wompiEnabled) {
      throw new BadRequestError("El pago en línea no está disponible. Elige efectivo contraentrega.");
    }
    const online = paymentMethod === "WOMPI";

    const address = await prisma.address.findFirst({
      where: { id: deliveryAddressId, userId },
    });
    if (!address) throw new NotFoundError("Dirección no encontrada");

    // Todo en una transacción: si falta stock de un producto no se crea nada.
    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });
      if (cartItems.length === 0) throw new BadRequestError("El carrito está vacío");

      for (const it of cartItems) {
        if (!it.product.isActive) {
          throw new BadRequestError(`"${it.product.name}" ya no está disponible`);
        }
        // Decremento condicional: falla si otro pedido se llevó el stock.
        const { count } = await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        if (count === 0) {
          throw new BadRequestError(
            `Stock insuficiente de "${it.product.name}". Disponible: ${it.product.stock} ${it.product.unit}`
          );
        }
      }

      const lines = cartItems.map((it) => {
        const unitPrice = effectivePrice(it.product);
        return {
          productId: it.productId,
          quantity: it.quantity,
          unitPrice,
          subtotal: unitPrice * it.quantity,
        };
      });
      const totals = orderTotals(lines.reduce((acc, l) => acc + l.subtotal, 0));

      const created = await tx.order.create({
        data: {
          buyerId: userId,
          deliveryAddressId,
          paymentMethod,
          paymentStatus: "PENDING",
          notes,
          ...totals,
          // En línea: el pedido espera el pago (con el stock reservado). Efectivo: va directo al productor.
          status: online ? "PENDING" : "CONFIRMED",
          items: { create: lines },
        },
        include: { items: { include: { product: true } } },
      });

      await tx.cartItem.deleteMany({ where: { userId } });
      return created;
    });

    // Efectivo: el productor se entera ya. En línea: cuando Wompi apruebe el pago.
    if (!online) void notifyProducersOfNewOrder(order.id);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// PATCH /api/orders/:id/status — avanzar estado
// Productor/repartidor avanzan el flujo; el comprador solo puede cancelar
// antes de que el pedido se empiece a preparar.
// ═══════════════════════════════════════════
const statusSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "IN_TRANSIT", "DELIVERED", "CANCELLED"]),
});

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_PUSH: Record<string, { title: string; body: string }> = {
  CONFIRMED: { title: "✅ Pedido confirmado", body: "El productor recibió tu pedido y lo está alistando." },
  PREPARING: { title: "👨‍🌾 Preparando tu pedido", body: "Están recolectando y empacando tus productos frescos." },
  IN_TRANSIT: { title: "🚚 ¡En camino!", body: "Tu repartidor va hacia tu dirección. Sigue el recorrido en vivo." },
  DELIVERED: { title: "🏠 Pedido entregado", body: "¡Disfruta tu cosecha fresca! No olvides calificar tu experiencia." },
  CANCELLED: { title: "❌ Pedido cancelado", body: "Tu pedido fue cancelado. Si pagaste, el reembolso se verá reflejado pronto." },
};

ordersRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const userId = req.user!.userId;
    const { order, isBuyer, isProducer, isCourier, producerIds } = await loadParticipation(
      req.params.id,
      userId
    );

    if (!isBuyer && !isProducer && !isCourier) {
      throw new ForbiddenError("No tienes acceso a este pedido");
    }

    const current = order.status as OrderStatus;
    if (!NEXT_STATUS[current]?.includes(status)) {
      throw new BadRequestError(`No se puede pasar de ${current} a ${status}`);
    }

    // El repartidor solo dice que recogió el pedido (sale a entregar) y que lo entregó.
    if (isCourier && !isProducer && !isBuyer) {
      const allowed = (current === "PREPARING" && status === "IN_TRANSIT") || (current === "IN_TRANSIT" && status === "DELIVERED");
      if (!allowed) throw new ForbiddenError("El repartidor solo marca el pedido como recogido o entregado");
    }

    // Un pedido en línea sin pagar todavía no es del productor ni del repartidor
    if ((isProducer || isCourier) && !isBuyer && current === "PENDING") {
      throw new BadRequestError("El pedido todavía no está pagado");
    }

    // El comprador solo cancela, y solo antes de que se prepare
    if (!isProducer && !isCourier) {
      if (status !== "CANCELLED" || !["PENDING", "CONFIRMED"].includes(current)) {
        throw new ForbiddenError("Solo puedes cancelar el pedido antes de que se empiece a preparar");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Al cancelar se devuelve el stock reservado
      if (status === "CANCELLED") {
        for (const it of order.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
      }
      // Al despachar sin repartidor asignado, se toma el que tenga menos pedidos en curso
      let courierId = order.courierId;
      if (status === "IN_TRANSIT" && !courierId) {
        const couriers = await tx.user.findMany({
          where: { role: "COURIER" },
          select: {
            id: true,
            _count: { select: { ordersAsCourier: { where: { status: "IN_TRANSIT" } } } },
          },
        });
        couriers.sort((a, b) => a._count.ordersAsCourier - b._count.ordersAsCourier);
        courierId = couriers[0]?.id ?? null;
      }
      return tx.order.update({
        where: { id: order.id },
        data: {
          status,
          courierId,
          deliveredAt: status === "DELIVERED" ? new Date() : order.deliveredAt,
          ...(status === "DELIVERED" && order.paymentMethod === "CASH" ? { paymentStatus: "PAID" } : {}),
        },
      });
    });

    // Al despachar, el VRP reordena todas las entregas en camino del repartidor
    // saliendo desde la finca de este pedido. Si falla, el despacho sigue igual.
    if (status === "IN_TRANSIT" && updated.courierId) {
      const farm = await prisma.product.findFirst({
        where: { id: { in: order.items.map((it) => it.productId) } },
        select: { latitude: true, longitude: true },
      });
      if (farm && Number.isFinite(farm.latitude) && Number.isFinite(farm.longitude)) {
        await planCourierRoute(updated.courierId, { lat: farm.latitude, lng: farm.longitude }).catch((err) =>
          console.error("No se pudo planear la ruta del repartidor", err)
        );
      }
    }

    if (status === "CANCELLED" && order.paymentMethod === "WOMPI" && order.paymentStatus === "PAID") {
      // Wompi no reembolsa solo: se hace desde su panel con este número de transacción.
      console.error(`⚠️ Pedido pagado cancelado ${order.id} (transacción ${order.paymentTransactionId}): reembolsar`);
    }

    // Notificar (fire and forget, no bloquea la respuesta)
    if (isBuyer && !isProducer && !isCourier) {
      for (const producerId of producerIds) {
        void sendPushToUser(producerId, {
          title: "❌ Pedido cancelado",
          body: "El comprador canceló su pedido. El stock volvió a tu inventario.",
          data: { orderId: order.id, status },
        });
      }
    } else {
      const push = STATUS_PUSH[status];
      if (push) {
        void sendPushToUser(order.buyerId, {
          title: push.title,
          body: push.body,
          data: { orderId: order.id, status },
        });
      }
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/orders/:id/reviews — el comprador califica productor/repartidor
// ═══════════════════════════════════════════
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  toUserId: z.string(),
});

ordersRouter.post("/:id/reviews", async (req, res, next) => {
  try {
    const { rating, comment, toUserId } = reviewSchema.parse(req.body);
    const userId = req.user!.userId;
    const { order, isBuyer, producerIds } = await loadParticipation(req.params.id, userId);

    if (!isBuyer) throw new ForbiddenError("Solo el comprador puede calificar este pedido");
    if (order.status !== "DELIVERED") {
      throw new BadRequestError("Solo puedes calificar pedidos entregados");
    }
    if (!producerIds.includes(toUserId) && order.courierId !== toUserId) {
      throw new BadRequestError("Solo puedes calificar a quienes participaron en el pedido");
    }

    const existing = await prisma.review.findFirst({
      where: { orderId: order.id, fromUserId: userId, toUserId },
    });
    if (existing) throw new ConflictError("Ya calificaste a esta persona en este pedido");

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        fromUserId: userId,
        toUserId,
        rating,
        comment,
      },
    });

    // Recalcular rating del usuario calificado
    const stats = await prisma.review.aggregate({
      where: { toUserId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.user.update({
      where: { id: toUserId },
      data: {
        rating: Math.round((stats._avg.rating || 0) * 10) / 10,
        ratingCount: stats._count,
      },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});
