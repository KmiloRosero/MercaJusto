import { create } from "zustand";
import {
  MeResponse,
  getMe,
  logout as apiLogout,
  setUnauthorizedHandler,
  tokenStorage,
  unregisterPushToken,
} from "../api/client";
import { useCart } from "./cart";

interface AuthState {
  user: MeResponse | null;
  token: string | null;
  hydrated: boolean;
  /** Expo push token registrado para esta sesión (se borra al salir). */
  pushToken: string | null;
  bootstrap: () => Promise<void>;
  setSession: (user: MeResponse, token: string) => Promise<void>;
  setPushToken: (token: string | null) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

function resetCart() {
  useCart.setState({ items: [], subtotal: 0, error: null, loading: false });
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  pushToken: null,

  bootstrap: async () => {
    const token = await tokenStorage.get();
    if (!token) {
      set({ hydrated: true });
      return;
    }
    try {
      const user = await getMe();
      set({ token, user, hydrated: true });
    } catch {
      await tokenStorage.clear();
      set({ token: null, user: null, hydrated: true });
    }
  },

  setSession: async (user, token) => {
    await tokenStorage.set(token);
    resetCart();
    set({ user, token });
  },

  setPushToken: (pushToken) => set({ pushToken }),

  logout: async () => {
    // Dejar de recibir notificaciones de esta cuenta en este dispositivo
    const { pushToken } = get();
    if (pushToken) {
      try {
        await unregisterPushToken(pushToken);
      } catch {
        // no crítico
      }
    }
    await apiLogout();
    resetCart();
    set({ user: null, token: null, pushToken: null });
  },

  refresh: async () => {
    if (!get().token) return;
    try {
      const user = await getMe();
      set({ user });
    } catch {
      // silencio: si el token expiró, el interceptor 401 cierra la sesión
    }
  },
}));

// Token expirado o inválido en cualquier petición → cerrar sesión local.
setUnauthorizedHandler(() => {
  if (!useAuth.getState().token) return;
  void tokenStorage.clear();
  resetCart();
  useAuth.setState({ user: null, token: null, pushToken: null });
});
