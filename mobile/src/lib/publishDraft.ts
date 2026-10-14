import AsyncStorage from "@react-native-async-storage/async-storage";

// Borrador de "Publicar cosecha": se guarda en el celular mientras el productor
// escribe, para que una caída de señal o un cierre de la app no borre nada.

const KEY = "mercajusto.publishDraft.v1";

export interface PublishDraft {
  name: string;
  categoryId: string | null;
  price: string;
  traditionalPrice: string;
  unit: string;
  stock: string;
  description: string;
  isSurplus: boolean;
  discountPct: number;
  municipio: string;
  vereda: string;
  coords: { lat: number; lng: number } | null;
  photoUri: string | null;
  photoMime: string | null;
}

/** Hay algo que valga la pena guardar (no solo los valores por defecto). */
export function draftHasContent(d: PublishDraft): boolean {
  return Boolean(d.name.trim() || d.price || d.stock || d.traditionalPrice || d.description.trim() || d.photoUri || d.vereda.trim());
}

export async function loadPublishDraft(): Promise<PublishDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublishDraft) : null;
  } catch {
    return null;
  }
}

export async function savePublishDraft(d: PublishDraft): Promise<void> {
  try {
    if (draftHasContent(d)) await AsyncStorage.setItem(KEY, JSON.stringify(d));
    else await AsyncStorage.removeItem(KEY);
  } catch {}
}

export async function clearPublishDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
