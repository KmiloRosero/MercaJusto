import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "./prisma";

const expo = new Expo();

/**
 * Envía una notificación push a todos los dispositivos registrados de un usuario.
 * Es "fire and forget": nunca lanza hacia el caller para no romper la petición HTTP.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = [];
    for (const { token } of tokens) {
      if (!Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      });
    }
    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        // Registrar tickets inválidos para depuración (token expirado, etc.)
        for (const ticket of tickets) {
          if (ticket.status === "error") {
            console.warn("⚠️ Push ticket error:", ticket.message);
          }
        }
      } catch (err) {
        console.warn("⚠️ Error enviando chunk de push:", err);
      }
    }
  } catch (err) {
    console.warn("⚠️ sendPushToUser falló (ignorado):", err);
  }
}
