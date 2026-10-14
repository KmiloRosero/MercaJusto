import { Alert, Platform } from "react-native";

// En react-native-web `Alert.alert` no hace nada, así que en web usamos los
// diálogos nativos del navegador. Mismo API para toda la app.

/** Mensaje informativo con un solo botón. */
export function showAlert(title: string, message?: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: "OK", onPress: () => resolve() }], {
      cancelable: true,
      onDismiss: () => resolve(),
    });
  });
}

/** Pregunta de sí/no. Resuelve `true` si el usuario confirma. */
export function confirmDialog(
  title: string,
  message?: string,
  opts: { confirmText?: string; cancelText?: string; destructive?: boolean } = {}
): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: opts.cancelText ?? "Cancelar", style: "cancel", onPress: () => resolve(false) },
        {
          text: opts.confirmText ?? "Aceptar",
          style: opts.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Lista de opciones (p. ej. "Cámara" / "Galería"). Resuelve con la clave
 * elegida o `null` si se cancela. En web devuelve la primera opción marcada
 * como `web: true`, o la primera de la lista.
 */
export function chooseOption<K extends string>(
  title: string,
  message: string | undefined,
  options: Array<{ key: K; text: string; web?: boolean }>
): Promise<K | null> {
  if (Platform.OS === "web") {
    const pick = options.find((o) => o.web) ?? options[0];
    return Promise.resolve(pick ? pick.key : null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        ...options.map((o) => ({ text: o.text, onPress: () => resolve(o.key) })),
        { text: "Cancelar", style: "cancel" as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
