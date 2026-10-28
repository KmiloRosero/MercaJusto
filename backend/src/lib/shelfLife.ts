// Cuánto aguanta cada categoría en buen estado después de cosechada, sin
// cuarto frío (estimación conservadora para venta en fresco). Con esto se
// calcula hasta cuándo se puede rescatar un excedente antes de que se pierda.

const SHELF_LIFE_DAYS: Record<string, number> = {
  hierbas: 3,
  verduras: 4,
  frutas: 5,
  "lacteos-huevos": 5,
  tuberculos: 10,
  granos: 30,
  "cafe-cacao": 60,
};
const DEFAULT_DAYS = 5;

/** Fecha en que el producto deja de estar bueno para la venta, o null si no se sabe cuándo se cosechó. */
export function losesAt(harvestDate: Date | null, categorySlug?: string | null): Date | null {
  if (!harvestDate) return null;
  const days = SHELF_LIFE_DAYS[categorySlug ?? ""] ?? DEFAULT_DAYS;
  return new Date(harvestDate.getTime() + days * 24 * 3600 * 1000);
}
