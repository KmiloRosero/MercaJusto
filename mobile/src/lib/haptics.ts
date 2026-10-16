import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Vibraciones cortas para confirmar acciones importantes. Se usan poco a
// propósito: si todo vibra, nada se siente. En la web no hacen nada.
const enabled = Platform.OS === "ios" || Platform.OS === "android";

/** Toque leve: algo se agregó (p. ej. a la canasta). */
export function tapLight() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Confirmación: una acción importante terminó bien (p. ej. pedido enviado). */
export function success() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Aviso de error: la acción no se pudo completar. */
export function failure() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
