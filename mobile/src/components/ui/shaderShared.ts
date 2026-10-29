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
 * Lomas en terrazas, como las laderas cultivadas de Nariño: curvas de nivel que
 * se mueven muy despacio, más marcadas arriba y desvanecidas hacia el contenido
 * para que el texto siempre se lea. Donde está el dedo (o el puntero) se
 * calienta un poco con el color de la tierra.
 * Colores: u_surface (fondo), u_field (relleno de las lomas, verde claro),
 * u_line (curvas de nivel) y u_sun (brillo de tierra).
 */
export const FIELDS_FRAGMENT = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.08;

  float h = sin(p.x * 2.2 + t * 3.0) * 0.07
          + sin(p.x * 5.1 - t * 2.0 + 1.3) * 0.03
          + sin(p.x * 1.1 + t) * 0.05;
  float y = uv.y + h;

  float bands = fract(y * 7.0 - t * 0.6);
  float contour = smoothstep(0.0, 0.05, bands) * smoothstep(0.14, 0.05, bands);
  float ridge = smoothstep(0.0, 1.0, bands) * 0.5;

  float hill = smoothstep(0.42, 1.0, y);

  vec2 m = vec2(u_pointer.x * aspect, u_pointer.y);
  vec2 d = p - m;
  float glow = 0.16 / (0.16 + dot(d, d) * 3.5);

  vec3 colour = u_surface;
  colour = mix(colour, u_field, hill * (0.6 + ridge * 0.3));
  colour = mix(colour, u_line, contour * hill * 0.14);
  colour = mix(colour, u_sun, glow * hill * 0.12);
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
