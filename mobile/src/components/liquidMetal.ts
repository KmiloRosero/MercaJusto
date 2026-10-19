import type { StyleProp, ViewStyle } from "react-native";

/**
 * Props compartidas por las dos versiones del fondo de metal líquido:
 * `LiquidMetalShader.web.tsx` (WebGL animado) y `LiquidMetalShader.tsx`
 * (degradado estático en el celular, para no gastar GPU ni batería).
 */
export type LiquidMetalShaderProps = {
  /** Sombra del metal. Hex de 6 dígitos. */
  baseColor?: string;
  /** Tono medio. */
  metalColor?: string;
  /** Brillo. */
  highlightColor?: string;
  /** Cuánto se tuerce el líquido (0 a 1.5). */
  distortion?: number;
  /** Responde al puntero (solo web). */
  interactive?: boolean;
  /** Tope de densidad de píxeles del lienzo (0.75 a 2): menos es más liviano. */
  pixelRatio?: number;
  /** Zoom del patrón (0.6 a 2.4). */
  scale?: number;
  /** Velocidad (0 a 1.5); 0 lo deja quieto. */
  speed?: number;
  style?: StyleProp<ViewStyle>;
};

/** Metal líquido en los verdes de la marca, para claro y oscuro. */
export const LIQUID_METAL_GREEN = {
  light: { baseColor: "#123F25", metalColor: "#2E8A52", highlightColor: "#C9F0D3" },
  dark: { baseColor: "#071A0E", metalColor: "#23683E", highlightColor: "#9BE3B5" },
} as const;
