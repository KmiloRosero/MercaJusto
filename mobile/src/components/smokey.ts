import type { StyleProp, ViewStyle } from "react-native";

/**
 * Props del fondo de humo: `SmokeyBackground.web.tsx` (WebGL animado) y
 * `SmokeyBackground.tsx` (celular: degradado con un halo que respira).
 */
export type SmokeyBackgroundProps = {
  /** Color del humo. Hex de 6 dígitos. */
  color?: string;
  /** Color del suelo detrás del humo. */
  groundColor?: string;
  /** Opacidad del velo oscuro sobre el humo (0 a 1): más alto, más legible. */
  veil?: number;
  style?: StyleProp<ViewStyle>;
};
