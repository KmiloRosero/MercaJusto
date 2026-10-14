import React from "react";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";

interface LogoMarkProps {
  size: number;
  /** Color de la canasta y el asa. */
  color?: string;
  /** Color de las franjas del tejido (normalmente el fondo). */
  knockout?: string;
}

/**
 * Marca de MercaJusto: canasta con hoja y fruto. Misma geometría que el ícono
 * y el splash nativo (assets/), para que la transición entre ellos no salte.
 */
/** Colores fijos de la marca: no cambian con el tema. */
export const BRAND = {
  field: "#1F6B3D",
  basket: "#FFFFFF",
  leaf: "#8FD3A1",
  fruit: "#A8501C",
} as const;

export function LogoMark({ size, color = BRAND.basket, knockout = BRAND.field }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={56} cy={22} rx={11} ry={18} fill={BRAND.leaf} transform="rotate(28 56 22)" />
      <Circle cx={34} cy={34} r={14} fill={BRAND.fruit} />
      <Path d="M18 38 A32 30 0 0 1 82 38" stroke={color} strokeWidth={5} fill="none" />
      <Polygon points="8,42 92,42 82,86 18,86" fill={color} />
      <Rect x={4} y={37} width={92} height={9} rx={3} fill={color} />
      {[34, 50, 66].map((x) => (
        <Line
          key={x}
          x1={x}
          y1={49}
          x2={x * 0.94 + 3}
          y2={81}
          stroke={knockout}
          strokeWidth={3.5}
        />
      ))}
    </Svg>
  );
}
