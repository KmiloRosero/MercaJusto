import { create } from "zustand";

type ToastKind = "success" | "error" | "info";

interface ToastState {
  message: string | null;
  kind: ToastKind;
  /** Cambia en cada show() para reiniciar el temporizador aunque el texto se repita. */
  key: number;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  message: null,
  kind: "info",
  key: 0,
  show: (message, kind = "info") => set((s) => ({ message, kind, key: s.key + 1 })),
  hide: () => set({ message: null }),
}));

export const toast = {
  success: (m: string) => useToast.getState().show(m, "success"),
  error: (m: string) => useToast.getState().show(m, "error"),
  info: (m: string) => useToast.getState().show(m, "info"),
};
