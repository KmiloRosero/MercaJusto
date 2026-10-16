import { useEffect, useState } from "react";
import { Easing, FadeInDown } from "react-native-reanimated";
import { motion } from "../theme";

// Los primeros elementos de una lista entran escalonados cuando llegan los
// datos. Solo en la carga inicial: al desplazarse o al volver a la pantalla
// aparecen de una, porque una lista que se anima cada vez se siente lenta.
const STEP_MS = 40;
const MAX_ITEMS = 8;
const WINDOW_MS = 800;

/**
 * Devuelve, para cada índice, la animación de entrada o `undefined`.
 * `ready` se vuelve true cuando los datos ya están en pantalla.
 */
export function useFirstLoadStagger(ready: boolean) {
  // waiting: sin datos aún · active: animando la primera tanda · done: ya no se anima
  const [phase, setPhase] = useState<"waiting" | "active" | "done">("waiting");
  if (ready && phase === "waiting") setPhase("active");

  useEffect(() => {
    if (phase !== "active") return;
    const id = setTimeout(() => setPhase("done"), WINDOW_MS);
    return () => clearTimeout(id);
  }, [phase]);

  return (index: number) => {
    if (phase !== "active" || index >= MAX_ITEMS) return undefined;
    return FadeInDown.delay(index * STEP_MS)
      .duration(260)
      .easing(Easing.bezier(...motion.easeOut));
  };
}
