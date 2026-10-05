// ═══════════════════════════════════════════════════════════════════
// Motor de ruteo MercaJusto — VRP simplificado
// ───────────────────────────────────────────────────────────────────
// Diferenciador técnico de la tesis. Agrupa los pedidos por cercanía
// geográfica (k-means) y, para cada grupo, resuelve un TSP abierto con
// depósito usando vecino más cercano + mejora 2-opt.
//
// Es 100% agnóstico de la base de datos: solo opera sobre coordenadas
// (lat/lng), así que funciona igual con SQLite hoy y con PostGIS mañana.
// ═══════════════════════════════════════════════════════════════════

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DeliveryStop {
  orderId: string;
  lat: number;
  lng: number;
  /** Metadato opcional para etiquetar la zona (ej. municipio dominante). */
  municipio?: string;
}

export interface OptimizedRoute {
  zoneLabel: string;
  centroid: GeoPoint;
  sequence: DeliveryStop[];
  /** Distancia total de la ruta: depósito → paradas → depósito (km). */
  distanceKm: number;
  stopCount: number;
}

export interface OptimizeResult {
  depot: GeoPoint;
  routes: OptimizedRoute[];
  totalDistanceKm: number;
  /** Distancia si un solo vehículo visitara todo en orden arbitrario (peor caso de referencia). */
  naiveDistanceKm: number;
  /** Distancia usando solo vecino más cercano, sin 2-opt (para medir la ganancia del 2-opt). */
  nearestNeighborDistanceKm: number;
  savingsVsNaivePct: number;
}

export interface OptimizeOptions {
  depot?: GeoPoint;
  /** Número máximo de paradas por vehículo (capacidad). */
  capacity?: number;
  /** Número fijo de vehículos/zonas. Si se omite, se deriva de la capacidad. */
  vehicles?: number;
  /** Semilla para el PRNG de k-means++ (reproducibilidad en pruebas). */
  seed?: number;
  maxIterations?: number;
}

// ───────────────────────────────────────────────
// Distancia geográfica
// ───────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia de círculo máximo entre dos puntos (fórmula del haversine). */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ───────────────────────────────────────────────
// PRNG determinista (mulberry32) para k-means++
// ───────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────────────────────────
// Longitudes de ruta
// ───────────────────────────────────────────────

/** Distancia depot → paradas (en el orden dado) → depot. */
export function routeDistanceKm(depot: GeoPoint, route: DeliveryStop[]): number {
  if (route.length === 0) return 0;
  let d = haversineKm(depot, route[0]);
  for (let i = 0; i < route.length - 1; i++) {
    d += haversineKm(route[i], route[i + 1]);
  }
  d += haversineKm(route[route.length - 1], depot);
  return d;
}

// ───────────────────────────────────────────────
// TSP: vecino más cercano
// ───────────────────────────────────────────────

export function nearestNeighborRoute(
  depot: GeoPoint,
  stops: DeliveryStop[]
): DeliveryStop[] {
  const remaining = [...stops];
  const route: DeliveryStop[] = [];
  let current: GeoPoint = depot;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, remaining[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push(next);
    current = next;
  }
  return route;
}

// ───────────────────────────────────────────────
// TSP: mejora 2-opt
// ───────────────────────────────────────────────

/**
 * Aplica 2-opt sobre una ruta (invierte sub-tramos mientras reduzca la
 * distancia total incluyendo el depósito). Devuelve una ruta igual o mejor.
 */
export function twoOpt(depot: GeoPoint, inputRoute: DeliveryStop[]): DeliveryStop[] {
  let route = [...inputRoute];
  let improved = true;
  let best = routeDistanceKm(depot, route);

  // Tope de iteraciones para evitar ciclos patológicos en instancias grandes
  let guard = 0;
  const maxGuard = 1000;

  while (improved && guard < maxGuard) {
    improved = false;
    guard++;
    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const candidate =
          route.slice(0, i).concat(route.slice(i, j + 1).reverse(), route.slice(j + 1));
        const candDist = routeDistanceKm(depot, candidate);
        if (candDist < best - 1e-9) {
          route = candidate;
          best = candDist;
          improved = true;
        }
      }
    }
  }
  return route;
}

// ───────────────────────────────────────────────
// Clustering: k-means++ sobre lat/lng
// ───────────────────────────────────────────────

function centroidOf(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/**
 * k-means con inicialización k-means++. Devuelve, para cada punto, el índice
 * del clúster asignado. Reproducible con `seed`.
 */
export function kMeansAssignments(
  points: GeoPoint[],
  k: number,
  opts: { seed?: number; maxIterations?: number } = {}
): number[] {
  const n = points.length;
  if (n === 0) return [];
  const kk = Math.max(1, Math.min(k, n));
  const rand = mulberry32(opts.seed ?? 42);
  const maxIterations = opts.maxIterations ?? 100;

  // ── k-means++ init ──
  const centroids: GeoPoint[] = [];
  centroids.push(points[Math.floor(rand() * n)]);
  while (centroids.length < kk) {
    const dists = points.map((p) =>
      Math.min(...centroids.map((c) => haversineKm(p, c) ** 2))
    );
    const total = dists.reduce((a, b) => a + b, 0);
    if (total === 0) {
      // Todos coinciden con algún centroide: elige uno al azar
      centroids.push(points[Math.floor(rand() * n)]);
      continue;
    }
    let r = rand() * total;
    let idx = 0;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    centroids.push(points[idx]);
  }

  // ── Lloyd's iterations ──
  let assignments = new Array<number>(n).fill(0);
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = haversineKm(points[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    if (!changed) break;

    // Recalcular centroides (los clústers vacíos conservan su centroide anterior)
    for (let c = 0; c < centroids.length; c++) {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length > 0) centroids[c] = centroidOf(members);
    }
  }
  return assignments;
}

// ───────────────────────────────────────────────
// VRP: clustering + TSP por zona
// ───────────────────────────────────────────────

function zoneLabel(stops: DeliveryStop[], index: number): string {
  const counts = new Map<string, number>();
  for (const s of stops) {
    const key = s.municipio?.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  return best ? `Zona ${best}` : `Zona ${index + 1}`;
}

/**
 * Resuelve el VRP simplificado: agrupa las paradas en `k` zonas por cercanía
 * y optimiza el orden de visita de cada una con vecino más cercano + 2-opt.
 */
export function optimizeRoutes(
  stops: DeliveryStop[],
  options: OptimizeOptions = {}
): OptimizeResult {
  const { capacity = 12, vehicles, seed = 42, maxIterations = 100 } = options;

  const cleanStops = stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && !(s.lat === 0 && s.lng === 0)
  );

  // Depósito: explícito o centroide de todas las paradas
  const depot =
    options.depot ?? centroidOf(cleanStops.map((s) => ({ lat: s.lat, lng: s.lng })));

  if (cleanStops.length === 0) {
    return {
      depot,
      routes: [],
      totalDistanceKm: 0,
      naiveDistanceKm: 0,
      nearestNeighborDistanceKm: 0,
      savingsVsNaivePct: 0,
    };
  }

  // Número de zonas: vehículos explícitos o derivados de la capacidad
  const k = Math.max(
    1,
    vehicles ?? Math.ceil(cleanStops.length / Math.max(1, capacity))
  );

  const assignments = kMeansAssignments(
    cleanStops.map((s) => ({ lat: s.lat, lng: s.lng })),
    k,
    { seed, maxIterations }
  );

  // Agrupar paradas por clúster
  const groups: DeliveryStop[][] = Array.from({ length: k }, () => []);
  cleanStops.forEach((stop, i) => {
    groups[assignments[i] ?? 0].push(stop);
  });

  const routes: OptimizedRoute[] = [];
  let totalDistanceKm = 0;
  let nearestNeighborDistanceKm = 0;

  groups.forEach((group, idx) => {
    if (group.length === 0) return;
    const nnRoute = nearestNeighborRoute(depot, group);
    const optimized = twoOpt(depot, nnRoute);
    const distanceKm = routeDistanceKm(depot, optimized);
    nearestNeighborDistanceKm += routeDistanceKm(depot, nnRoute);
    totalDistanceKm += distanceKm;
    routes.push({
      zoneLabel: zoneLabel(group, idx),
      centroid: centroidOf(group.map((s) => ({ lat: s.lat, lng: s.lng }))),
      sequence: optimized,
      distanceKm,
      stopCount: optimized.length,
    });
  });

  // Referencia "peor caso": un solo vehículo visitando todo en orden arbitrario
  const naiveDistanceKm = routeDistanceKm(depot, cleanStops);

  const savingsVsNaivePct =
    naiveDistanceKm > 0
      ? Math.max(0, Math.round(((naiveDistanceKm - totalDistanceKm) / naiveDistanceKm) * 100))
      : 0;

  // Ordenar rutas por distancia descendente para estabilidad en la salida
  routes.sort((a, b) => b.distanceKm - a.distanceKm);

  return {
    depot,
    routes,
    totalDistanceKm,
    naiveDistanceKm,
    nearestNeighborDistanceKm,
    savingsVsNaivePct,
  };
}
