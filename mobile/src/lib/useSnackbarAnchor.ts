import { useCallback, useRef } from "react";
import { LayoutChangeEvent } from "react-native";
import { useFocusEffect } from "expo-router";
import { useToast } from "../store/toast";

/**
 * Para pantallas con una barra de acciones fija abajo: el snackbar aparece
 * encima de ella en vez de taparla. Devuelve el `onLayout` de la barra.
 * `below` es lo que hay entre la barra y el borde de la pantalla (p. ej. las pestañas).
 */
export function useSnackbarAnchor(below = 0) {
  const height = useRef(0);
  const setAnchor = useToast((s) => s.setAnchor);

  useFocusEffect(
    useCallback(() => {
      if (height.current) setAnchor(below + height.current + 8);
      return () => setAnchor(null);
    }, [below, setAnchor])
  );

  return useCallback(
    (e: LayoutChangeEvent) => {
      height.current = e.nativeEvent.layout.height;
      setAnchor(below + height.current + 8);
    },
    [below, setAnchor]
  );
}
