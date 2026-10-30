// Partes comunes del fondo con shader (web con WebGL, celular con expo-gl).

export type ShaderCanvasStatus = "starting" | "running" | "unsupported" | "error";

export interface ShaderCanvasProps {
  /**
   * Fragment shader GLSL ES 1.0 con `void main()`. No declares los uniforms: se anteponen
   * `u_time` (segundos), `u_resolution` (píxeles), `u_pointer` (0–1, y hacia arriba) y un `vec3` por cada color.
   */
  fragment?: string;
  /** Nombre del uniform → color hex (#RRGGBB). Al cambiar (p. ej. modo oscuro) se vuelve a pintar. */
  colors: Record<string, string>;
  /** Resolución como fracción de los píxeles del dispositivo. Un shader suave no pierde nada en 0.5. */
  resolution?: number;
  /** Segundo de la animación que se dibuja con movimiento reducido, para que el cuadro quieto se vea bien. */
  stillTime?: number;
  /** Se llama con el registro de compilación si el shader falla. */
  onError?: (message: string) => void;
  onStatusChange?: (status: ShaderCanvasStatus) => void;
}

/**
 * Amanecer sobre las lomas de Nariño: arriba un cielo con el brillo cálido del
 * sol, y tres capas de lomas cultivadas en terrazas que se mueven a distinta
 * velocidad (las de atrás más despacio y más veladas, como con bruma). Todo
 * se funde con el color de la pantalla antes de llegar al contenido, para que
 * el texto siempre se lea. El sol sigue al puntero en la web y deriva solo en
 * el celular.
 * Colores: u_surface (fondo), u_field (lomas, verde claro), u_line (verde
 * fuerte para dar profundidad y terrazas), u_sun (sol) y u_glow (cielo cálido).
 */
export const FIELDS_FRAGMENT = `
float ridge(float x, float t, float seed) {
  return sin(x * 1.7 + seed + t * 0.5) * 0.065
       + sin(x * 3.9 + seed * 2.1 - t * 0.35) * 0.025
       + sin(x * 0.8 + seed * 0.7 + t * 0.2) * 0.07;
}

vec3 hill(vec3 colour, vec2 p, float t, float base, float depth, float speed, float seed, float haze) {
  float r = base + ridge(p.x + t * speed, t, seed);
  float below = p.y - r;
  float inside = smoothstep(-0.003, 0.003, below);
  vec3 tone = mix(u_field, u_line, depth);
  // Terrazas: franjas que siguen la forma de la loma, marcadas cerca de la cima.
  float band = fract(below * 26.0 + sin(p.x * 2.3 + seed) * 0.35);
  float terrace = smoothstep(0.0, 0.06, band) * smoothstep(0.22, 0.08, band) * (1.0 - smoothstep(0.0, 0.32, below));
  tone = mix(tone, u_line, terrace * 0.1);
  // Borde iluminado por el sol en la cresta.
  tone = mix(tone, u_glow, exp(-below * below * 9000.0) * 0.5);
  // Bruma: lo de atrás se acerca al cielo.
  tone = mix(tone, u_glow, haze);
  return mix(colour, tone, inside);
}

void main() {
  float unit = min(u_resolution.x, u_resolution.y * 0.55);
  // x en anchos, y hacia abajo desde el borde superior.
  vec2 p = vec2(gl_FragCoord.x / unit, (u_resolution.y - gl_FragCoord.y) / unit);
  float t = u_time * 0.05;

  vec3 colour = u_surface;

  // Cielo: un velo cálido arriba y un halo alrededor del sol.
  // Sin disco: un halo sin borde, para que nunca compita con el texto de arriba.
  vec2 sun = vec2(u_pointer.x * u_resolution.x / unit, 0.2);
  float d = length(p - sun);
  float sky = 1.0 - smoothstep(0.0, 0.75, p.y);
  colour = mix(colour, u_glow, sky * (0.35 + exp(-d * d * 7.0) * 0.65));
  colour = mix(colour, u_sun, exp(-d * d * 40.0) * 0.16 * sky);

  colour = hill(colour, p, t, 0.33, 0.02, 0.15, 1.0, 0.55);
  colour = hill(colour, p, t, 0.47, 0.18, 0.3, 4.0, 0.22);
  colour = hill(colour, p, t, 0.61, 0.36, 0.5, 7.3, 0.0);

  // Neblina hacia el contenido.
  colour = mix(colour, u_surface, smoothstep(0.62, 1.2, p.y));
  gl_FragColor = vec4(colour, 1.0);
}
`;

export const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/** Encabezado de uniforms que se antepone al fragment shader. */
export function shaderHeader(names: string[]): string {
  return [
    "precision mediump float;",
    "uniform float u_time;",
    "uniform vec2 u_resolution;",
    "uniform vec2 u_pointer;",
    ...names.map((name) => `uniform vec3 ${name};`),
  ].join("\n");
}

/** Líneas del encabezado, para corregir los números de línea de los errores. */
export const headerLines = (names: string[]) => names.length + 4;

/** "#1F3D29" → [0.12, 0.24, 0.16]. Acepta también "#RGB". */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Deja solo texto legible del registro del driver y apunta las líneas al código que escribiste. */
export function cleanLog(log: string, names: string[]): string {
  const shift = headerLines(names);
  return log
    .replace(/[^\x20-\x7e\n]/g, "")
    .trim()
    .replace(/(\d+):(\d+)/g, (_m, file, line) => `${file}:${Math.max(1, Number(line) - shift)}`);
}

/** Un triángulo que cubre la pantalla; el fragment shader hace todo el trabajo. */
export const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
