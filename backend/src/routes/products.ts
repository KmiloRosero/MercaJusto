import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

export const productsRouter = Router();

// ═══════════════════════════════════════════
// GET /api/products — catálogo con filtros
// Query params: category, municipio, surplus, search, minPrice, maxPrice, sort, limit
// ═══════════════════════════════════════════
productsRouter.get("/", async (req, res, next) => {
  try {
    const q = z.object({
      category: z.string().optional(),
      municipio: z.string().optional(),
      producerId: z.string().optional(),
      surplus: z.enum(["true", "false"]).optional(),
      search: z.string().optional(),
      minPrice: z.coerce.number().int().optional(),
      maxPrice: z.coerce.number().int().optional(),
      sort: z.enum(["recent", "price_asc", "price_desc", "rating"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }).parse(req.query);

    const where: Record<string, unknown> = { isActive: true };

    if (q.category) where.category = { slug: q.category };
    if (q.municipio) where.municipio = q.municipio;
    if (q.producerId) where.producerId = q.producerId;
    if (q.surplus === "true") where.isSurplus = true;
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.price = {};
      if (q.minPrice !== undefined) (where.price as Record<string, number>).gte = q.minPrice;
      if (q.maxPrice !== undefined) (where.price as Record<string, number>).lte = q.maxPrice;
    }
    if (q.search) {
      where.OR = [
        { name: { contains: q.search } },
        { description: { contains: q.search } },
      ];
    }

    const orderBy: Record<string, string> =
      q.sort === "price_asc" ? { price: "asc" } :
      q.sort === "price_desc" ? { price: "desc" } :
      { createdAt: "desc" };

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        producer: {
          select: { id: true, name: true, rating: true, ratingCount: true, phone: true },
        },
      },
      orderBy,
      take: q.limit || 40,
    });

    res.json({ count: products.length, products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
productsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        producer: {
          select: { id: true, name: true, rating: true, ratingCount: true, avatarUrl: true },
        },
        reviews: {
          where: { productId: req.params.id },
          include: { fromUser: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!product) throw new NotFoundError("Producto no encontrado");
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// POST /api/products — publicar cosecha (solo PRODUCER)
// ═══════════════════════════════════════════
const createProductSchema = z.object({
  categoryId: z.string(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  price: z.number().int().positive(),
  // Precio de referencia en plaza/tienda tradicional (opcional): alimenta el
  // dashboard de precio justo y el ahorro que ve el comprador.
  traditionalPrice: z.number().int().positive().optional(),
  unit: z.string().min(1).max(20),
  stock: z.number().int().nonnegative(),
  photoUrl: z.string().url().optional(),
  isSurplus: z.boolean().optional(),
  discountPct: z.number().int().min(0).max(70).optional(),
  harvestDate: z.string().datetime().optional(),
  vereda: z.string().optional(),
  municipio: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

productsRouter.post("/", requireAuth, requireRole("PRODUCER"), async (req, res, next) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...data,
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : undefined,
        producerId: req.user!.userId,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id — actualizar (dueño)
productsRouter.patch("/:id", requireAuth, requireRole("PRODUCER"), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError("Producto no encontrado");
    if (existing.producerId !== req.user!.userId) {
      throw new BadRequestError("No puedes editar un producto de otro productor");
    }

    const allowed = createProductSchema.partial();
    const data = allowed.parse(req.body);

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        harvestDate: data.harvestDate ? new Date(data.harvestDate) : undefined,
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id — desactivar (soft delete)
productsRouter.delete("/:id", requireAuth, requireRole("PRODUCER"), async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError();
    if (existing.producerId !== req.user!.userId) {
      throw new BadRequestError("No puedes eliminar un producto de otro productor");
    }
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
