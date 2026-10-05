import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optimizeRoutes, haversineKm, type DeliveryStop } from "../lib/routing";
import { BadRequestError, NotFoundError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

export const routesRouter = Router();
routesRouter.use(requireAuth);

// Velocidad promedio rural y tiempo de atención por parada (para ETAs)
const AVG_SPEED_KMH = 30;
const SERVICE_MIN_PER_STOP = 5;

// Estados de pedido que aún pueden entrar a una ruta de entrega
const ROUTABLE_STATUSES = ["CONFIRMED", "PREPARING"];

interface SequenceEntry {
  orderId: string;
  lat: number;
  lng: number;
  municipio?: string;
  legKm: number;
  cumulativeKm: number;
  etaMin: number;
}

function depotFromEnv(): { lat: number; lng: number } | undefined {
  const lat = Number(process.env.DEPOT_LAT);
  const lng = Number(process.env.DEPOT_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { lat, lng };
  }
  return undefined;
}

/** Construye las entradas de secuencia con distancia por tramo y ETA acumulada. */
function buildSequence(
  depot: { lat: number; lng: number },
  stops: DeliveryStop[]
): SequenceEntry[] {
  const entries: SequenceEntry[] = [];
  let prev = depot;
  let cumulativeKm = 0;
  stops.forEach((s, i) => {
    const legKm = haversineKm(prev, s);
    cumulativeKm += legKm;
    entries.push({
      orderId: s.orderId,
      lat: s.lat,
      lng: s.lng,
      municipio: s.municipio,
      legKm: Math.round(legKm * 100) / 100,
      cumulativeKm: Math.round(cumulativeKm * 100) / 100,
      etaMin: Math.round((cumulativeKm / AVG_SPEED_KMH) * 60 + i * SERVICE_MIN_PER_STOP),
    });
    prev = s;
  });
  return entries;
}

// ═══════════════════════════════════════════
// POST /api/routes/optimize — genera rutas optimizadas (VRP)
// ═══════════════════════════════════════════
const optimizeSchema = z.object({
  orderIds: z.array(z.string()).optional(),
  vehicles: z.number().int().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  depot: z.object({ lat: z.number(), lng: z.number() }).optional(),
  date: z.string().optional(), // ISO; por defecto hoy
  persist: z.boolean().optional(), // por defecto true
});

routesRouter.post("/optimize", async (req, res, next) => {
  try {
    const body = optimizeSchema.parse(req.body ?? {});

    // 1) Seleccionar pedidos
    const where = body.orderIds?.length
      ? { id: { in: body.orderIds } }
      : { status: { in: ROUTABLE_STATUSES }, routeId: null };

    const orders = await prisma.order.findMany({
      where,
      include: { deliveryAddress: true },
    });

    if (orders.length === 0) {
      throw new BadRequestError("No hay pedidos disponibles para optimizar");
    }

    // 2) Construir paradas con coordenadas válidas
    const stops: DeliveryStop[] = [];
    const skipped: string[] = [];
    for (const o of orders) {
      const a = o.deliveryAddress;
      if (a && Number.isFinite(a.latitude) && Number.isFinite(a.longitude) && !(a.latitude === 0 && a.longitude === 0)) {
        stops.push({
          orderId: o.id,
          lat: a.latitude,
          lng: a.longitude,
          municipio: a.municipio,
        });
      } else {
        skipped.push(o.id);
      }
    }

    if (stops.length === 0) {
      throw new BadRequestError("Ningún pedido tiene coordenadas de entrega válidas");
    }

    // 3) Optimizar (VRP)
    const depot = body.depot ?? depotFromEnv();
    const result = optimizeRoutes(stops, {
      depot,
      vehicles: body.vehicles,
      capacity: body.capacity ?? 12,
    });

    const routeDate = body.date ? new Date(body.date) : new Date();
    const shouldPersist = body.persist !== false;

    // 4) Persistir rutas y asociar pedidos
    const persisted: Array<{
      id: string;
      zoneLabel: string;
      stopCount: number;
      distanceKm: number;
      sequence: SequenceEntry[];
    }> = [];

    for (const route of result.routes) {
      const sequence = buildSequence(result.depot, route.sequence);
      let routeId = "";
      if (shouldPersist) {
        const saved = await prisma.deliveryRoute.create({
          data: {
            date: routeDate,
            zoneLabel: route.zoneLabel,
            sequenceJson: JSON.stringify(sequence),
            totalDistanceKm: Math.round(route.distanceKm * 100) / 100,
            status: "PLANNED",
          },
        });
        routeId = saved.id;
        await prisma.order.updateMany({
          where: { id: { in: route.sequence.map((s) => s.orderId) } },
          data: { routeId: saved.id },
        });
      }
      persisted.push({
        id: routeId,
        zoneLabel: route.zoneLabel,
        stopCount: route.stopCount,
        distanceKm: Math.round(route.distanceKm * 100) / 100,
        sequence,
      });
    }

    res.status(201).json({
      depot: result.depot,
      routeCount: persisted.length,
      orderCount: stops.length,
      skippedOrderIds: skipped,
      metrics: {
        totalDistanceKm: Math.round(result.totalDistanceKm * 100) / 100,
        naiveDistanceKm: Math.round(result.naiveDistanceKm * 100) / 100,
        nearestNeighborDistanceKm: Math.round(result.nearestNeighborDistanceKm * 100) / 100,
        savingsVsNaivePct: result.savingsVsNaivePct,
      },
      routes: persisted,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// GET /api/routes — listar rutas planificadas
// ═══════════════════════════════════════════
routesRouter.get("/", async (req, res, next) => {
  try {
    const q = z
      .object({
        courierId: z.string().optional(),
        status: z.string().optional(),
      })
      .parse(req.query);

    const where: Record<string, unknown> = {};
    if (q.courierId) where.courierId = q.courierId;
    if (q.status) where.status = q.status;

    const routes = await prisma.deliveryRoute.findMany({
      where,
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    });

    res.json(
      routes.map((r) => ({
        id: r.id,
        date: r.date,
        zoneLabel: r.zoneLabel,
        status: r.status,
        totalDistanceKm: r.totalDistanceKm,
        courier: r.courier,
        orderCount: r._count.orders,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════
// GET /api/routes/:id — detalle de una ruta
// ═══════════════════════════════════════════
routesRouter.get("/:id", async (req, res, next) => {
  try {
    const route = await prisma.deliveryRoute.findUnique({
      where: { id: req.params.id },
      include: {
        courier: { select: { id: true, name: true, phone: true } },
        orders: {
          include: { deliveryAddress: true },
        },
      },
    });
    if (!route) throw new NotFoundError("Ruta no encontrada");

    let sequence: SequenceEntry[] = [];
    try {
      sequence = JSON.parse(route.sequenceJson) as SequenceEntry[];
    } catch {
      sequence = [];
    }

    res.json({
      id: route.id,
      date: route.date,
      zoneLabel: route.zoneLabel,
      status: route.status,
      totalDistanceKm: route.totalDistanceKm,
      courier: route.courier,
      sequence,
      orders: route.orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        address: o.deliveryAddress,
      })),
    });
  } catch (err) {
    next(err);
  }
});
