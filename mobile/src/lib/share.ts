import { Share } from "react-native";

// Enlaces para compartir por WhatsApp. Apuntan a la versión web, que abre la
// misma pantalla (expo-router usa las mismas rutas en web y en el celular),
// así funcionan aunque quien los recibe no tenga la app.
export const WEB_URL = "https://mercajusto.vercel.app";

export const productUrl = (id?: string) => (id ? `${WEB_URL}/producto/${id}` : WEB_URL);
export const producerUrl = (id: string) => `${WEB_URL}/productor/${id}`;

/** Abre el menú de compartir del sistema (WhatsApp, mensajes…). Si se cancela, no pasa nada. */
export async function shareText(message: string) {
  await Share.share({ message }).catch(() => {});
}
