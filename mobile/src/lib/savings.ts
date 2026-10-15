import type { CartItem, Order, Product } from "../api/types";
import { effectivePrice } from "./pricing";

// El ahorro solo se calcula con el precio de plaza que reporta el productor
// (traditionalPrice). Sin ese dato no hay ahorro que mostrar: nunca se estima.
// Es la misma regla que aplica el backend en GET /api/metrics/fair-price.

/** Ahorro de una línea: (precio plaza − precio MercaJusto) × cantidad. */
export function lineSavings(
  unitPrice: number,
  traditionalPrice: number | null | undefined,
  quantity: number
): number {
  if (!traditionalPrice || traditionalPrice <= 0) return 0;
  return Math.max(0, (traditionalPrice - unitPrice) * quantity);
}

/**
 * Comparación con la plaza para un producto, o `null` si no hay precio de
 * plaza o MercaJusto no sale más barato.
 */
export function plazaComparison(product: Product): { plaza: number; perUnit: number; pct: number } | null {
  const plaza = product.traditionalPrice;
  const price = effectivePrice(product);
  if (!plaza || plaza <= price) return null;
  return { plaza, perUnit: plaza - price, pct: Math.round(((plaza - price) / plaza) * 100) };
}

/** Ahorro total de la canasta frente a la plaza. */
export function cartSavings(items: CartItem[]): number {
  return items.reduce(
    (acc, it) => acc + lineSavings(effectivePrice(it.product), it.product.traditionalPrice, it.quantity),
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
