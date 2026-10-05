import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const PLATFORM_FEE_PCT = 0.05; // 5% comisión MercaJusto
const BASE_DELIVERY_FEE = 3500;

// GET /api/orders/mine — pedidos del usuario logueado
ordersRouter.get("/mine", async (req, res, next) => {
  try {
    const role = req.user!.role;
    const where =
      role === "BUYER" ? { buyerId: req.user!.userId } :
      role === "COURIER" ? { courierId: req.user!.userId } :
      { items: { some: { product: { producerId: req.user!.userId } } } };

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        buyer: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        courier: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        deliveryAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: { include: { producer: { select: { id: true, name: true, phone: true, rating: true } } } },
          },
        },
        buyer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        courier: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        deliveryAddress: true,
        reviews: true,
      },
    });
    if (!order) throw new NotFoundError("Pedido no encontrado");
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/orders — crear pedido desde el carrito
// ═══════════════════════════════════════════
const createOrderSchema = z.object({
  deliveryAddressId: z.string(),
  paymentMethod: z.enum(["NEQUI", "DAVIPLATA", "CASH"]),
  notes: z.string().max(300).optional(),
});

ordersRouter.post("/", requireRole("BUYER"), async (req, res, next) => {
  try {
    const { deliveryAddressId, paymentMethod, notes } = createOrderSchema.parse(req.body);

    const address = await prisma.address.findFirst({
      where: { id: deliveryAddressId, userId: req.user!.userId },
    });
    if (!address) throw new NotFoundError("Dirección no encontrada");

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: { product: true },
    });
    if (cartItems.length === 0) throw new BadRequestError("El carrito está vacío");

    // Verificar stock
    for (const it of cartItems) {
      if (it.product.stock < it.quantity) {
        throw new BadRequestError(
          `Stock insuficiente de "${it.product.name}". Disponible: ${it.product.stock}`
        );
      }
    }

    const subtotal = cartItems.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
    const platformFee = Math.round(subtotal * PLATFORM_FEE_PCT);
    const total = subtotal + BASE_DELIVERY_FEE + platformFee;

    const order = await prisma.order.create({
      data: {
        buyerId: req.user!.userId,
        deliveryAddressId,
        paymentMethod,
        notes,
        subtotal,
        deliveryFee: BASE_DELIVERY_FEE,
        platformFee,
        total,
        status: "CONFIRMED",
        items: {
          create: cartItems.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.product.price,
            subtotal: it.product.price * it.quantity,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // Descontar stock y vaciar carrito en una transacción
    await prisma.$transaction([
      ...cartItems.map((it) =>
        prisma.product.update({
          where: { id: it.productId },
          data: { stock: { decrement: it.quantity } },
        })
      ),
      prisma.cartItem.deleteMany({ where: { userId: req.user!.userId } }),
    ]);

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/orders/:id/status — actualizar estado (courier o productor)
const statusSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "IN_TRANSIT", "DELIVERED", "CANCELLED"]),
});

ordersRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new NotFoundError();

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        deliveredAt: status === "DELIVERED" ? new Date() : order.deliveredAt,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/orders/:id/reviews — calificar
// ═══════════════════════════════════════════
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  toUserId: z.string(),
});

ordersRouter.post("/:id/reviews", async (req, res, next) => {
  try {
    const { rating, comment, toUserId } = reviewSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundError();
    if (order.status !== "DELIVERED") {
      throw new BadRequestError("Solo puedes calificar pedidos entregados");
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        fromUserId: req.user!.userId,
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
        rating: stats._avg.rating || 0,
        ratingCount: stats._count,
      },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});
