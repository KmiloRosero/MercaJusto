import type { CartItem, Order } from "../api/types";

// Cuando un producto no tiene precio de referencia (plaza/tienda), estimamos
// el precio tradicional con el ahorro histórico del modelo: 35% sobre el
// precio MercaJusto. Es el mismo fallback que usa el backend en
// GET /api/metrics/fair-price para que las cifras coincidan.
export const FALLBACK_SAVINGS_PCT = 0.35;

/** Ahorro de una línea: (precio plaza − precio MercaJusto) × cantidad. */
export function lineSavings(
  unitPrice: number,
  traditionalPrice: number | null | undefined,
  quantity: number
): number {
  const traditional =
    traditionalPrice ?? Math.round(unitPrice * (1 + FALLBACK_SAVINGS_PCT));
  return Math.max(0, (traditional - unitPrice) * quantity);
}

/** Ahorro total de la canasta usando los precios de referencia reales. */
export function cartSavings(items: CartItem[]): number {
  return items.reduce(
    (acc, it) => acc + lineSavings(it.product.price, it.product.traditionalPrice, it.quantity),
    0
  );
}

/** Ahorro real de un pedido ya creado (usa el unitPrice congelado al comprar). */
export function orderSavings(order: Pick<Order, "items">): number {
  return order.items.reduce(
    (acc, it) => acc + lineSavings(it.unitPrice, it.product?.traditionalPrice, it.quantity),
    0
  );
}
