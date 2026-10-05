import { create } from "zustand";
import { MeResponse, getMe, logout as apiLogout, tokenStorage } from "../api/client";

interface AuthState {
  user: MeResponse | null;
  token: string | null;
  hydrated: boolean;
  bootstrap: () => Promise<void>;
  setSession: (user: MeResponse, token: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

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
    set({ user, token });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, token: null });
  },

  refresh: async () => {
    if (!get().token) return;
    try {
      const user = await getMe();
      set({ user });
    } catch {
      // silencio: el token pudo expirar, bootstrap se encargará
    }
  },
}));
