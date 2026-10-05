import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

// Mostrar la notificación aunque la app esté en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita permisos y obtiene el Expo Push Token del dispositivo.
 * Devuelve `null` si no es posible (simulador/emulador sin soporte o permiso denegado),
 * sin lanzar errores para no romper el arranque de la app.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Constants.isDevice) {
      console.log("Push: se necesita un dispositivo físico (simulador omitido)");
      return null;
    }

    // Canal requerido en Android 8+
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "Estado de pedidos",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#008FFF",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Push: permiso denegado por el usuario");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (err) {
    console.warn("Push: no se pudo registrar el token", err);
    return null;
  }
}
