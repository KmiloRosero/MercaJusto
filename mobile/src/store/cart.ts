import { create } from "zustand";
import { CartItem } from "../api/types";
import * as api from "../api/client";
import { toast } from "./toast";

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
  /** Quita el producto y ofrece "Deshacer" en el snackbar. */
  remove: (item: CartItem) => Promise<void>;
  /** Ítems con un cambio de cantidad en curso. */
  pendingIds: Record<string, true>;
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
  pendingIds: {},

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
    if (get().pendingIds[itemId]) return; // evita toques dobles mientras se guarda
    set((s) => ({ pendingIds: { ...s.pendingIds, [itemId]: true } }));
    try {
      await api.updateCartItem(itemId, quantity);
      await get().fetch();
    } catch (err) {
      set({ error: api.apiErrorMessage(err) });
    } finally {
      set((s) => {
        const { [itemId]: _done, ...rest } = s.pendingIds;
        return { pendingIds: rest };
      });
    }
  },

  remove: async (item) => {
    const { product, quantity } = item;
    await get().updateQty(item.id, 0);
    if (get().items.some((it) => it.id === item.id)) return; // no se pudo quitar
    toast.withAction(`Quitaste ${product.name} de la canasta`, {
      label: "Deshacer",
      onPress: () => void get().add(product.id, quantity),
    });
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
