import { create } from "zustand";
import { CartItem } from "../api/types";
import * as api from "../api/client";

interface CartState {
  items: CartItem[];
  subtotal: number;
  loading: boolean;
  /** La canasta se cargó al menos una vez: distingue "vacía" de "no cargó". */
  loaded: boolean;
  error: string | null;
  /** Error crudo de la última carga, para explicar la causa y reintentar. */
  loadError: unknown;
  fetch: () => Promise<void>;
  /** Devuelve `true` si se agregó; si falla deja el mensaje en `error`. */
  add: (productId: string, quantity?: number) => Promise<boolean>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
  count: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  loading: false,
  loaded: false,
  error: null,
  loadError: null,

  fetch: async () => {
    set({ loading: true, error: null, loadError: null });
    try {
      const data = await api.getCart();
      set({ items: data.items, subtotal: data.subtotal, loading: false, loaded: true });
    } catch (err) {
      set({ error: api.apiErrorMessage(err), loadError: err, loading: false });
    }
  },

  add: async (productId, quantity = 1) => {
    try {
      await api.addToCart(productId, quantity);
      await get().fetch();
      return true;
    } catch (err) {
      set({ error: api.apiErrorMessage(err) });
      return false;
    }
  },

  updateQty: async (itemId, quantity) => {
    try {
      await api.updateCartItem(itemId, quantity);
      await get().fetch();
    } catch (err) {
      set({ error: api.apiErrorMessage(err) });
    }
  },

  clear: async () => {
    try {
      await api.clearCart();
      set({ items: [], subtotal: 0 });
    } catch (err) {
      set({ error: api.apiErrorMessage(err) });
    }
  },

  count: () => get().items.reduce((acc, it) => acc + it.quantity, 0),
}));
