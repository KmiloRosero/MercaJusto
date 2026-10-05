import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { NotFoundError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();

// GET /api/users/me
usersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        addresses: true,
        ...(req.user!.role === "PRODUCER"
          ? { products: { where: { isActive: true }, include: { category: true } } }
          : {}),
      },
    });
    if (!user) throw new NotFoundError();
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me
const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});

usersRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const data = updateMeSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — perfil público (para ver detalle del productor)
usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        rating: true,
        ratingCount: true,
        role: true,
        createdAt: true,
        addresses: {
          select: { municipio: true, departamento: true, vereda: true },
        },
      },
    });
    if (!user) throw new NotFoundError();

    if (user.role === "PRODUCER") {
      const products = await prisma.product.findMany({
        where: { producerId: user.id, isActive: true },
        include: { category: true },
      });
      return res.json({ ...user, products });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// DIRECCIONES
// ═══════════════════════════════════════════

const addressSchema = z.object({
  label: z.string().min(1).max(30).optional(),
  municipio: z.string(),
  departamento: z.string().optional(),
  vereda: z.string().optional(),
  detail: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().optional(),
});

usersRouter.post("/me/addresses", requireAuth, async (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { ...data, userId: req.user!.userId },
    });
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

usersRouter.delete("/me/addresses/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.userId) throw new NotFoundError();
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
