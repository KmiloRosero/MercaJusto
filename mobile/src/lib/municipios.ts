// Cabeceras municipales de Nariño (coordenadas aproximadas). Sirven de
// respaldo cuando el GPS no está disponible o el usuario niega el permiso.
export const MUNICIPIOS_NARINO: Record<string, { lat: number; lng: number }> = {
  Pasto: { lat: 1.2136, lng: -77.2811 },
  Ipiales: { lat: 0.8303, lng: -77.6444 },
  Túquerres: { lat: 1.0864, lng: -77.6175 },
  Tumaco: { lat: 1.8067, lng: -78.7647 },
  Buesaco: { lat: 1.3814, lng: -77.1567 },
  Guaitarilla: { lat: 1.13, lng: -77.55 },
  "La Unión": { lat: 1.6006, lng: -77.1314 },
  Sandoná: { lat: 1.2847, lng: -77.4711 },
  Samaniego: { lat: 1.3381, lng: -77.5947 },
  "La Cruz": { lat: 1.6019, lng: -76.9706 },
  Tangua: { lat: 1.095, lng: -77.394 },
  Yacuanquer: { lat: 1.115, lng: -77.4 },
  Chachagüí: { lat: 1.36, lng: -77.2833 },
  "La Florida": { lat: 1.2975, lng: -77.4064 },
  Cumbal: { lat: 0.9083, lng: -77.7928 },
  Pupiales: { lat: 0.8708, lng: -77.64 },
  Guachucal: { lat: 0.9614, lng: -77.7314 },
  Córdoba: { lat: 0.8536, lng: -77.5172 },
  Funes: { lat: 1.0, lng: -77.45 },
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Coordenadas aproximadas del municipio, o `null` si no lo conocemos. */
export function municipioCoords(name: string): { lat: number; lng: number } | null {
  const key = normalize(name);
  for (const [muni, coords] of Object.entries(MUNICIPIOS_NARINO)) {
    if (normalize(muni) === key) return coords;
  }
  return null;
}

export const DEFAULT_COORDS = MUNICIPIOS_NARINO.Pasto;
