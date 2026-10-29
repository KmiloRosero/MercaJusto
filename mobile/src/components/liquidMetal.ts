import type { StyleProp, ViewStyle } from "react-native";

/**
 * Props compartidas por las dos versiones del fondo de metal líquido:
 * `LiquidMetalShader.web.tsx` (WebGL) y `LiquidMetalShader.tsx` (expo-gl en el
 * celular). Las dos usan los mismos shaders de abajo.
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

/** Color en 0–1 de un hex de 6 dígitos (con respaldo si viene mal). */
export function parseHexColor(value: string, fallback: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return [
    Number.parseInt(normalized.slice(1, 3), 16) / 255,
    Number.parseInt(normalized.slice(3, 5), 16) / 255,
    Number.parseInt(normalized.slice(5, 7), 16) / 255,
  ];
}

/** Shader de vértices: un triángulo que cubre todo el lienzo. */
export const LIQUID_METAL_VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/** Metal líquido: ruido fractal deformado dos veces, con sombra, tono medio y brillo. */
export const LIQUID_METAL_FRAGMENT = `
precision highp float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointer_strength;
uniform float u_time;
uniform float u_distortion;
uniform float u_scale;
uniform vec3 u_base;
uniform vec3 u_metal;
uniform vec3 u_highlight;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float weight = 0.52;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 4; octave++) {
    value += noise(p) * weight;
    p = rotation * p * 2.03 + 17.17;
    weight *= 0.5;
  }
  return value;
}

float liquidField(vec2 p, float time) {
  vec2 drift = vec2(time * 0.045, -time * 0.032);
  vec2 firstWarp = vec2(
    fbm(p * 0.72 + drift),
    fbm(p * 0.76 + vec2(5.2, 1.3) - drift.yx)
  );
  vec2 secondWarp = vec2(
    fbm(p * 0.78 + firstWarp * 2.7 + vec2(1.7, 9.2) + drift * 1.3),
    fbm(p * 0.74 + firstWarp * 2.5 + vec2(8.3, 2.8) - drift * 1.1)
  );
  return fbm(p * 0.68 + secondWarp * (2.75 * u_distortion));
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0) * u_scale;
  vec2 pointer = (u_pointer - 0.5) * vec2(aspect, 1.0) * u_scale;
  vec2 delta = p - pointer;
  float pointerFalloff = exp(-dot(delta, delta) * 2.6);
  float distanceFromPointer = max(length(delta), 0.001);
  p += (delta / distanceFromPointer) * pointerFalloff * u_distortion * 0.16 * u_pointer_strength;

  float field = liquidField(p, u_time);
  float shadow = smoothstep(0.18, 0.42, field);
  float silver = smoothstep(0.38, 0.64, field);
  float specular = smoothstep(0.60, 0.82, field);
  vec3 color = mix(u_base * 0.55, u_base, shadow);
  color = mix(color, u_metal, silver * 0.88);
  color = mix(color, u_highlight, specular * 0.94);

  float softReflection = smoothstep(0.0, 0.13, 0.13 - abs(field - 0.51));
  color = mix(color, u_highlight, softReflection * 0.12);
  color += (hash21(gl_FragCoord.xy + floor(u_time * 12.0)) - 0.5) * 0.004;

  float vignette = 1.0 - smoothstep(0.48, 1.08, length((v_uv - 0.5) * vec2(0.82, 1.0)));
  color *= 0.76 + vignette * 0.24;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
