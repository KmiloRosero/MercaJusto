import { useEffect } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { apiErrorMessage, createProduct, isRetryableError, uploadImage, type CreateProductInput } from "../api/client";
import { toast } from "./toast";

// Cola de publicaciones sin señal. En la vereda la conexión va y viene: si al
// publicar no hay señal, la cosecha queda guardada en el celular y se publica
// sola cuando vuelve la conexión (al volver a la app y cada 30 s mientras haya
// algo pendiente). El productor no tiene que volver a llenar nada.

const KEY = "mercajusto.publishQueue.v1";
const RETRY_MS = 30_000;

export interface QueuedPublication {
  id: string;
  /** Datos del producto; la foto va aparte porque se sube primero. */
  input: Omit<CreateProductInput, "photoUrl">;
  /** Foto local (aún sin subir) o URL ya subida. */
  photoUri: string | null;
  photoMime: string | null;
  queuedAt: string;
  /** Mensaje del servidor si la rechazó por un dato inválido (no se reintenta sola). */
  error?: string;
}

interface PublishQueueState {
  items: QueuedPublication[];
  loaded: boolean;
  flushing: boolean;
  load: () => Promise<void>;
  enqueue: (item: Omit<QueuedPublication, "id" | "queuedAt">) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Intenta publicar todo lo pendiente. Devuelve cuántas se publicaron. */
  flush: () => Promise<number>;
}

async function persist(items: QueuedPublication[]) {
  try {
    if (items.length) await AsyncStorage.setItem(KEY, JSON.stringify(items));
    else await AsyncStorage.removeItem(KEY);
  } catch {}
}

export const usePublishQueue = create<PublishQueueState>((set, get) => ({
  items: [],
  loaded: false,
  flushing: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ items: raw ? (JSON.parse(raw) as QueuedPublication[]) : [], loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  enqueue: async (item) => {
    const entry: QueuedPublication = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, queuedAt: new Date().toISOString() };
    const items = [...get().items, entry];
    set({ items });
    await persist(items);
  },

  remove: async (id) => {
    const items = get().items.filter((it) => it.id !== id);
    set({ items });
    await persist(items);
  },

  flush: async () => {
    if (get().flushing) return 0;
    const pending = get().items.filter((it) => !it.error);
    if (pending.length === 0) return 0;
    set({ flushing: true });
    let published = 0;
    try {
      for (const it of pending) {
        try {
          let photoUrl: string | undefined;
          if (it.photoUri && !it.photoUri.startsWith("http")) photoUrl = await uploadImage(it.photoUri, it.photoMime);
          else if (it.photoUri) photoUrl = it.photoUri;
          await createProduct({ ...it.input, photoUrl });
          await get().remove(it.id);
          published += 1;
          toast.success(`Se publicó ${it.input.name}: volvió la señal`);
        } catch (err) {
          // Sin señal todavía: se deja para el próximo intento y se para la ronda.
          if (isRetryableError(err)) break;
          // Rechazada por el servidor: se marca para que el productor la revise.
          const items = get().items.map((x) => (x.id === it.id ? { ...x, error: apiErrorMessage(err) } : x));
          set({ items });
          await persist(items);
        }
      }
    } finally {
      set({ flushing: false });
    }
    return published;
  },
}));

/**
 * Corre la cola mientras la app está abierta: al cargar, al volver a primer
 * plano y cada 30 s si hay algo pendiente. Se monta una vez, en el layout raíz.
 */
export function usePublishQueueRunner(enabled: boolean) {
  const load = usePublishQueue((s) => s.load);
  const flush = usePublishQueue((s) => s.flush);
  const pendingCount = usePublishQueue((s) => s.items.filter((it) => !it.error).length);

  useEffect(() => {
    if (!enabled) return;
    load().then(() => flush());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") flush();
    });
    return () => sub.remove();
  }, [enabled, load, flush]);

  useEffect(() => {
    if (!enabled || pendingCount === 0) return;
    const id = setInterval(() => flush(), RETRY_MS);
    return () => clearInterval(id);
  }, [enabled, pendingCount, flush]);
}
