import type { Coordinate } from "../components/mapTypes";

/** Distancia en km entre dos puntos (fórmula del haversine), igual que el backend. */
export function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "hace 12 s", "hace 3 min". */
export function agoLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  return `hace ${Math.round(s / 60)} min`;
}

/** "hace 12 s" desde una marca de tiempo (ms). */
export function sinceLabel(timestamp: number): string {
  return agoLabel(Date.now() - timestamp);
}
