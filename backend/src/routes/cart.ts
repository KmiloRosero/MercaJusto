import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

export const cartRouter = Router();
cartRouter.use(requireAuth);

// GET /api/cart
cartRouter.get("/", async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          include: {
            producer: { select: { id: true, name: true, rating: true, avatarUrl: true } },
          },
        },
      },
    });

    const subtotal = items.reduce((acc, it) => acc + it.product.price * it.quantity, 0);

    res.json({ items, subtotal, count: items.length });
  } catch (err) {
    next(err);
  }
});

const addSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().max(1000),
});

// POST /api/cart/items
cartRouter.post("/items", async (req, res, next) => {
  try {
    const { productId, quantity } = addSchema.parse(req.body);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) throw new NotFoundError("Producto no disponible");
    if (product.stock < quantity) {
      throw new BadRequestError(`Stock insuficiente. Disponible: ${product.stock} ${product.unit}`);
    }

    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_productId: { userId: req.user!.userId, productId },
      },
    });

    const item = existing
      ? await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + quantity },
        })
      : await prisma.cartItem.create({
          data: { userId: req.user!.userId, productId, quantity },
        });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cart/items/:id
cartRouter.patch("/items/:id", async (req, res, next) => {
  try {
    const { quantity } = z.object({ quantity: z.number().int().min(0) }).parse(req.body);

    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item || item.userId !== req.user!.userId) throw new NotFoundError();

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
      return res.json({ ok: true, removed: true });
    }

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart
cartRouter.delete("/", async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user!.userId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
