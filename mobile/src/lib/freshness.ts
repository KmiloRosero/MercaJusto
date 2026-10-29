// "¿Se va a dañar pronto?": el productor elige en cuántos días y la app guarda
// la fecha límite (al final de ese día) y sugiere una oferta según la urgencia.

/** Opciones de "se daña en": 0 = hoy. */
export const SPOIL_DAYS = [0, 1, 2, 3, 5] as const;

/** Descuentos que se pueden poner cuando se va a dañar (0 = sin oferta). */
export const SPOIL_DISCOUNTS = [0, 10, 20, 30, 40, 50] as const;

export function spoilDayLabel(days: number): string {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/** Entre más pronto se dañe, más descuento para que alcance a venderse. */
export function suggestedDiscount(days: number): number {
  if (days <= 0) return 40;
  if (days === 1) return 30;
  if (days <= 3) return 20;
  return 10;
}

/** Fecha límite: el final del día elegido (23:59 hora del celular). */
export function expiresAtFor(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

/** Para editar: la opción más cercana a una fecha guardada, o null si ya pasó o no hay. */
export function spoilDaysFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (end.getTime() < Date.now()) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(end);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  return SPOIL_DAYS.reduce((best, d) => (Math.abs(d - diff) < Math.abs(best - diff) ? d : best), SPOIL_DAYS[0] as number);
}

/** "Se daña hoy", "Se daña mañana", "Se daña en 3 días"; null si no hay fecha o ya pasó. */
export function spoilsLabel(iso?: string | null): string | null {
  const days = spoilDaysFrom(iso);
  if (days === null || !iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "Se daña hoy";
  if (diff === 1) return "Se daña mañana";
  return `Se daña en ${diff} días`;
}

/** "hoy", "mañana" o "el sábado 31". */
export function untilLabel(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `el ${d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric" }).replace(",", "")}`;
}
