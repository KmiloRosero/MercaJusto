import { create } from "zustand";

type ToastKind = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  message: string | null;
  kind: ToastKind;
  /** Cambia en cada show() para reiniciar el temporizador aunque el texto se repita. */
  key: number;
  /** Acción opcional del snackbar (p. ej. "Deshacer"). */
  action: ToastAction | null;
  /** Distancia desde el borde inferior de la pantalla; la fija la pantalla con barra inferior. */
  anchor: number | null;
  setAnchor: (anchor: number | null) => void;
  show: (message: string, kind?: ToastKind, action?: ToastAction) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  kind: "info",
  key: 0,
  action: null,
  anchor: null,
  setAnchor: (anchor) => set({ anchor }),
  show: (message, kind = "info", action) => set((s) => ({ message, kind, action: action ?? null, key: s.key + 1 })),
  hide: () => set({ message: null, action: null }),
}));

export const toast = {
  success: (m: string) => useToast.getState().show(m, "success"),
  error: (m: string) => useToast.getState().show(m, "error"),
  info: (m: string) => useToast.getState().show(m, "info"),
  /** Aviso con una acción, como "Deshacer". */
  withAction: (m: string, action: ToastAction) => useToast.getState().show(m, "info", action),
};
