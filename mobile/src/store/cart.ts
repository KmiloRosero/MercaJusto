import { create } from "zustand";
import { CartItem } from "../api/types";
import * as api from "../api/client";

interface CartState {
  items: CartItem[];
  subtotal: number;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  add: (productId: string, quantity?: number) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
  count: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getCart();
      set({ items: data.items, subtotal: data.subtotal, loading: false });
    } catch (err) {
      set({ error: api.apiErrorMessage(err), loading: false });
    }
  },

  add: async (productId, quantity = 1) => {
    try {
      await api.addToCart(productId, quantity);
      await get().fetch();
    } catch (err) {
      set({ error: api.apiErrorMessage(err) });
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
