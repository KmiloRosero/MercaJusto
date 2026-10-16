import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler";
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
  // El correo no se cambia aquí: es con el que se entra.
  phone: z.string().regex(/^\+573\d{9}$/, "Escribe un celular colombiano de 10 dígitos").optional(),
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
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            fromUser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    if (!user) throw new NotFoundError();

    if (user.role === "PRODUCER") {
      // Solo el municipio/vereda de las fincas: nunca la dirección exacta
      const products = await prisma.product.findMany({
        where: { producerId: user.id, isActive: true },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      });
      const municipios = [...new Set(products.map((p) => p.municipio))];
      return res.json({ ...user, products, municipios });
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
    const used = await prisma.order.count({ where: { deliveryAddressId: existing.id } });
    if (used > 0) {
      throw new BadRequestError("Esta dirección tiene pedidos asociados y no se puede eliminar");
    }
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// PUSH TOKENS (notificaciones Expo)
// ═══════════════════════════════════════════

const pushTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android", "web", "unknown"]).optional(),
});

// POST /api/users/me/push-token — registra el token Expo del dispositivo
usersRouter.post("/me/push-token", requireAuth, async (req, res, next) => {
  try {
    const { token, platform } = pushTokenSchema.parse(req.body);
    // Upsert por token: si ya existe (de otro usuario o del mismo), lo reasignamos
    const saved = await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user!.userId, platform: platform || "unknown" },
      create: { userId: req.user!.userId, token, platform: platform || "unknown" },
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me/push-token — desregistra el token (logout)
usersRouter.delete("/me/push-token", requireAuth, async (req, res, next) => {
  try {
    const token = req.query.token as string | undefined;
    if (token) {
      await prisma.pushToken.deleteMany({ where: { token, userId: req.user!.userId } });
    } else {
      await prisma.pushToken.deleteMany({ where: { userId: req.user!.userId } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
