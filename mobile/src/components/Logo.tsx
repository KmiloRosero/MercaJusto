import React from "react";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

/** Colores fijos de la marca: no cambian con el tema. */
export const BRAND = {
  field: "#1F6B3D",
  basket: "#FFFFFF",
  leaf: "#8FD3A1",
  leafVein: "#4E9E6A",
  fruit: "#A8501C",
} as const;

// Geometría de la marca en una caja de 100 × 100. Es la misma que dibuja
// scripts/generate-brand-assets.mjs para el ícono, el ícono adaptativo, el
// favicon y el splash nativo: si cambia aquí, se regeneran allá.
// Orden de capas (de atrás hacia adelante): hoja, fruto, canasta (asa incluida,
// que pasa por delante de la cosecha).

/** Origen de crecimiento de cada pieza, en % de la caja: lo usa el splash animado. */
export const MARK_ORIGINS = {
  leaf: "56% 46%",
  fruit: "38% 40%",
} as const;

function LeafShape() {
  return (
    <G>
      <Path d="M56 46 C46 32 54 15 75 10 C78 26 72 40 56 46 Z" fill={BRAND.leaf} />
      <Path d="M57.5 43 C62 33 67 23 73 14" stroke={BRAND.leafVein} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </G>
  );
}

function FruitShape() {
  return (
    <G>
      <Circle cx={38} cy={40} r={13} fill={BRAND.fruit} />
      <Circle cx={33.5} cy={34.5} r={3.4} fill="#FFFFFF" opacity={0.32} />
      <Path d="M38 27.5 C36 24 38.5 22 41 23.5" stroke={BRAND.leafVein} strokeWidth={2} strokeLinecap="round" fill="none" />
    </G>
  );
}

function BasketShape({ color, knockout }: { color: string; knockout: string }) {
  return (
    <G>
      <Path d="M22 48 C22 24 78 24 78 48" stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" />
      <Path d="M14.6 54 H85.4 L79 84 Q78 88.5 73.5 88.5 H26.5 Q22 88.5 21 84 Z" fill={color} />
      <Rect x={8} y={45} width={84} height={11} rx={5.5} fill={color} />
      {[
        [36, 62, 37.6, 82],
        [50, 62, 50, 82],
        [64, 62, 62.4, 82],
      ].map(([x1, y1, x2, y2]) => (
        <Line key={x1} x1={x1} y1={y1} x2={x2} y2={y2} stroke={knockout} strokeWidth={4} strokeLinecap="round" />
      ))}
    </G>
  );
}

interface LogoPartProps {
  size: number;
}

/** Solo la hoja (para animarla por separado). */
export function LogoLeaf({ size }: LogoPartProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <LeafShape />
    </Svg>
  );
}

/** Solo el fruto (para animarlo por separado). */
export function LogoFruit({ size }: LogoPartProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <FruitShape />
    </Svg>
  );
}

/** Solo la canasta vacía: es lo que muestra el splash nativo. */
export function LogoBasket({ size, color = BRAND.basket, knockout = BRAND.field }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <BasketShape color={color} knockout={knockout} />
    </Svg>
  );
}

interface LogoMarkProps {
  size: number;
  /** Color de la canasta y el asa. */
  color?: string;
  /** Color de las ranuras del tejido (normalmente el fondo). */
  knockout?: string;
}

/**
 * Marca de MercaJusto: canasta tejida con un tomate y una hoja. Misma
 * geometría que el ícono y el splash nativo, para que la transición no salte.
 */
export function LogoMark({ size, color = BRAND.basket, knockout = BRAND.field }: LogoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <LeafShape />
      <FruitShape />
      <BasketShape color={color} knockout={knockout} />
    </Svg>
  );
}
