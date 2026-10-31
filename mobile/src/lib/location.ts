import * as Location from "expo-location";

const RECENT_MS = 2 * 60_000;
const GPS_TIMEOUT_MS = 12_000;

/**
 * Dónde está el celular, sin dejar al usuario esperando para siempre: si hay
 * una ubicación reciente se usa de una; si no, se espera el GPS hasta 12 s y,
 * si no responde (dentro de una casa pasa), se usa la última conocida aunque
 * sea vieja. Sin ninguna, falla y quien llama usa el municipio escrito.
 * Supone que el permiso ya está concedido.
 */
export async function currentPosition(): Promise<Location.LocationObjectCoords> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_MS }).catch(() => null);
  if (recent) return recent.coords;

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS));
  const fix = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
    timeout,
  ]);
  if (fix) return fix.coords;

  const stale = await Location.getLastKnownPositionAsync().catch(() => null);
  if (stale) return stale.coords;
  throw new Error("Sin ubicación");
}
