import { prisma } from "./prisma";
import { haversineKm, optimizeRoutes, type DeliveryStop, type GeoPoint } from "./routing";

// Ruta en vivo del repartidor: cada vez que se despacha un pedido, se vuelven a
// ordenar todas sus entregas en camino con el VRP (vecino más cercano + 2-opt)
// saliendo desde la finca del pedido despachado. Así el comprador ve en qué
// parada va su pedido y el repartidor el orden óptimo de entrega.

// Velocidad promedio rural y tiempo de atención por parada (para ETAs)
export const AVG_SPEED_KMH = 30;
export const SERVICE_MIN_PER_STOP = 5;

export interface SequenceEntry {
  orderId: string;
  lat: number;
  lng: number;
  municipio?: string;
  legKm: number;
  cumulativeKm: number;
  etaMin: number;
}

/** Entradas de secuencia con distancia por tramo y ETA acumulada. */
export function buildSequence(depot: GeoPoint, stops: DeliveryStop[]): SequenceEntry[] {
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

const validPoint = (lat?: number | null, lng?: number | null) =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

/**
 * Reordena las entregas en camino de un repartidor y guarda la ruta.
 * `depot` es el punto de salida (la finca del pedido que se acaba de despachar).
 */
export async function planCourierRoute(courierId: string, depot: GeoPoint): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { courierId, status: "IN_TRANSIT" },
    include: { deliveryAddress: true },
  });

  const stops: DeliveryStop[] = [];
  for (const o of orders) {
    const a = o.deliveryAddress;
    if (a && validPoint(a.latitude, a.longitude)) {
      stops.push({ orderId: o.id, lat: a.latitude, lng: a.longitude, municipio: a.municipio });
    }
  }
  if (stops.length === 0) return;

  const result = optimizeRoutes(stops, { depot, vehicles: 1 });
  const route = result.routes[0];
  if (!route) return;

  const sequence = buildSequence(result.depot, route.sequence);
  const saved = await prisma.deliveryRoute.create({
    data: {
      courierId,
      date: new Date(),
      zoneLabel: route.zoneLabel,
      sequenceJson: JSON.stringify(sequence),
      totalDistanceKm: Math.round(route.distanceKm * 100) / 100,
      status: "IN_PROGRESS",
    },
  });
  await prisma.order.updateMany({
    where: { id: { in: route.sequence.map((s) => s.orderId) } },
    data: { routeId: saved.id },
  });
}

export interface DeliveryView {
  /** Posición de este pedido en la ruta (1 = la primera entrega). */
  position: number;
  stopCount: number;
  /** Minutos estimados desde la salida hasta esta entrega. */
  etaMin: number;
  /** Kilómetros recorridos hasta esta entrega. */
  kmToStop: number;
  zoneLabel: string;
  totalDistanceKm: number;
  /**
   * Paradas de la ruta en orden. El comprador solo recibe la suya: las
   * direcciones de los demás clientes nunca salen hacia otro comprador.
   */
  stops: Array<{ lat: number; lng: number; municipio?: string; mine: boolean }>;
}

/** Vista de la ruta de un pedido según quién la pide. */
export function deliveryViewFor(
  orderId: string,
  route: { zoneLabel: string; totalDistanceKm: number; sequenceJson: string } | null,
  fullRoute: boolean
): DeliveryView | null {
  if (!route) return null;
  let sequence: SequenceEntry[] = [];
  try {
    sequence = JSON.parse(route.sequenceJson) as SequenceEntry[];
  } catch {
    return null;
  }
  const index = sequence.findIndex((s) => s.orderId === orderId);
  if (index < 0) return null;
  const mine = sequence[index];
  return {
    position: index + 1,
    stopCount: sequence.length,
    etaMin: mine.etaMin,
    kmToStop: mine.cumulativeKm,
    zoneLabel: route.zoneLabel,
    totalDistanceKm: route.totalDistanceKm,
    stops: (fullRoute ? sequence : [mine]).map((s) => ({
      lat: s.lat,
      lng: s.lng,
      municipio: s.municipio,
      mine: s.orderId === orderId,
    })),
  };
}

export interface LiveTracking {
  /** Última posición del repartidor y cuándo la envió. */
  courier: { lat: number; lng: number; at: string };
  /** Kilómetros que le faltan hasta esta entrega (pasando por las paradas que tiene antes). */
  remainingKm: number;
  etaMin: number;
  /** Entregas pendientes antes de esta. */
  stopsBefore: number;
}

/** Posición del repartidor tan vieja ya no se muestra como "en vivo". */
const LIVE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Seguimiento en vivo de un pedido en camino: dónde va el repartidor y cuánto
 * le falta hasta esta dirección, contando las entregas que hace antes.
 */
export async function liveTrackingFor(order: {
  id: string;
  courierId: string | null;
  deliveryAddress: { latitude: number; longitude: number } | null;
  route: { sequenceJson: string } | null;
}): Promise<LiveTracking | null> {
  if (!order.courierId || !order.deliveryAddress) return null;
  const courier = await prisma.user.findUnique({
    where: { id: order.courierId },
    select: { lastLat: true, lastLng: true, lastLocationAt: true },
  });
  if (!courier?.lastLat || !courier.lastLng || !courier.lastLocationAt) return null;
  if (Date.now() - courier.lastLocationAt.getTime() > LIVE_MAX_AGE_MS) return null;

  // Paradas que el repartidor todavía tiene antes de esta, en el orden de la ruta.
  let before: { lat: number; lng: number }[] = [];
  if (order.route) {
    try {
      const sequence = JSON.parse(order.route.sequenceJson) as SequenceEntry[];
      const mine = sequence.findIndex((s) => s.orderId === order.id);
      const earlier = mine > 0 ? sequence.slice(0, mine) : [];
      const pending = await prisma.order.findMany({
        where: { id: { in: earlier.map((s) => s.orderId) }, status: "IN_TRANSIT" },
        select: { id: true },
      });
      const pendingIds = new Set(pending.map((p) => p.id));
      before = earlier.filter((s) => pendingIds.has(s.orderId));
    } catch {
      before = [];
    }
  }

  const path = [{ lat: courier.lastLat, lng: courier.lastLng }, ...before, { lat: order.deliveryAddress.latitude, lng: order.deliveryAddress.longitude }];
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversineKm(path[i - 1], path[i]);
  return {
    courier: { lat: courier.lastLat, lng: courier.lastLng, at: courier.lastLocationAt.toISOString() },
    remainingKm: Math.round(km * 10) / 10,
    etaMin: Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60 + before.length * SERVICE_MIN_PER_STOP)),
    stopsBefore: before.length,
  };
}
