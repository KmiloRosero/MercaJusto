import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MeResponse,
  describeError,
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

// Último perfil conocido: permite abrir la app sin esperar al servidor y sin
// perder la sesión cuando no hay señal.
const USER_CACHE_KEY = "mercajusto.user.v1";

async function readCachedUser(): Promise<MeResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MeResponse) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: MeResponse | null) {
  (user ? AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)) : AsyncStorage.removeItem(USER_CACHE_KEY)).catch(
    () => {}
  );
}

/** Solo un rechazo del servidor invalida la sesión; la falta de señal no. */
function isSessionRejected(err: unknown): boolean {
  const kind = describeError(err).kind;
  return kind === "rejected" || kind === "notfound";
}

function resetCart() {
  useCart.setState({ items: [], subtotal: 0, error: null, loadError: null, loading: false, loaded: false });
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
    const cached = await readCachedUser();
    if (cached) {
      // Entrar de inmediato con el perfil guardado y actualizarlo por detrás.
      set({ token, user: cached, hydrated: true });
      getMe()
        .then((user) => {
          writeCachedUser(user);
          set({ user });
        })
        .catch(async (err) => {
          if (isSessionRejected(err)) {
            await tokenStorage.clear();
            writeCachedUser(null);
            resetCart();
            set({ token: null, user: null });
          }
        });
      return;
    }
    try {
      const user = await getMe();
      writeCachedUser(user);
      set({ token, user, hydrated: true });
    } catch (err) {
      if (isSessionRejected(err)) await tokenStorage.clear();
      // Sin perfil guardado y sin señal no hay con qué entrar: se pide el
      // acceso de nuevo, pero el token solo se borra si el servidor lo rechazó.
      set({ token: null, user: null, hydrated: true });
    }
  },

  setSession: async (user, token) => {
    await tokenStorage.set(token);
    writeCachedUser(user);
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
    writeCachedUser(null);
    resetCart();
    set({ user: null, token: null, pushToken: null });
  },

  refresh: async () => {
    if (!get().token) return;
    try {
      const user = await getMe();
      writeCachedUser(user);
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
  writeCachedUser(null);
  resetCart();
  useAuth.setState({ user: null, token: null, pushToken: null });
});
