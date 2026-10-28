import { useEffect, useState } from "react";
import type { Coordinate } from "../components/mapTypes";

// Ruta por carretera entre varios puntos, con el servidor público de OSRM
// (OpenStreetMap). Si no responde (sin señal o sin servicio), se usa la línea
// recta entre los puntos: el mapa nunca se queda vacío.

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const cache = new Map<string, RoadRoute>();

export interface RoadRoute {
  /** Puntos de la línea a dibujar (la carretera, o los puntos en línea recta). */
  path: Coordinate[];
  /** Distancia por carretera en km, si OSRM respondió. */
  km: number | null;
  /** Duración estimada por carretera en minutos, si OSRM respondió. */
  minutes: number | null;
}

const keyOf = (points: Coordinate[]) => points.map((p) => `${p.longitude.toFixed(4)},${p.latitude.toFixed(4)}`).join(";");

export async function fetchRoadRoute(points: Coordinate[]): Promise<RoadRoute> {
  const straight: RoadRoute = { path: points, km: null, minutes: null };
  if (points.length < 2) return straight;
  const key = keyOf(points);
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${OSRM}/${key}?overview=full&geometries=geojson`, { signal: ctrl.signal });
    clearTimeout(timer);
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return straight;
    const road: RoadRoute = {
      path: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      km: Math.round((route.distance / 1000) * 10) / 10,
      minutes: Math.round(route.duration / 60),
    };
    cache.set(key, road);
    return road;
  } catch {
    return straight;
  }
}

/** La ruta por carretera de unos puntos; mientras llega, la línea recta. */
export function useRoadRoute(points: Coordinate[]): RoadRoute {
  const key = keyOf(points);
  const [route, setRoute] = useState<RoadRoute>(() => cache.get(key) ?? { path: points, km: null, minutes: null });
  useEffect(() => {
    let alive = true;
    fetchRoadRoute(points).then((r) => {
      if (alive) setRoute(r);
    });
    return () => {
      alive = false;
    };
    // `key` resume los puntos: se recalcula solo si cambian de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return route;
}
