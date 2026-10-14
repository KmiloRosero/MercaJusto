// Reglas de precio — espejan backend/src/lib/pricing.ts
export const PLATFORM_FEE_PCT = 0.05; // 5% comisión MercaJusto
export const BASE_DELIVERY_FEE = 3500;

/** Precio que realmente paga el comprador (aplica descuento de excedente). */
export function effectivePrice(p: { price: number; isSurplus: boolean; discountPct: number }): number {
  if (p.isSurplus && p.discountPct > 0) {
    return Math.round(p.price * (1 - p.discountPct / 100));
  }
  return p.price;
}

export function orderTotals(subtotal: number) {
  const platformFee = Math.round(subtotal * PLATFORM_FEE_PCT);
  return {
    subtotal,
    deliveryFee: BASE_DELIVERY_FEE,
    platformFee,
    total: subtotal + BASE_DELIVERY_FEE + platformFee,
  };
}
