// Utilidades del cuadro "Rescátalo": cuánto falta para que se pierda y cómo
// nombrar lo que queda.

/** Milisegundos que faltan hasta la fecha (negativo si ya pasó). */
export function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now();
}

/** "06:59:12" si falta menos de dos días; si no, "7 días". */
export function countdownLabel(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s >= 48 * 3600) return `${Math.floor(s / 86400)} días`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

const MEASURES = new Set(["kg", "g", "lb", "l"]);

/** "90 kg", "60 unidades", "25 mallas 3kg". */
export function unitCount(n: number, unit: string): string {
  if (MEASURES.has(unit.toLowerCase()) || n === 1) return `${n} ${unit}`;
  const [first, ...rest] = unit.split(" ");
  const plural = /[aeiouáéó]$/i.test(first) ? `${first}s` : `${first}es`;
  return [n, plural, ...rest].join(" ");
}

/** "hoy", "hace 3 h", "ayer", "hace 4 días". */
export function ageLabel(iso: string): string {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "hoy";
  if (h < 24) return `hace ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
