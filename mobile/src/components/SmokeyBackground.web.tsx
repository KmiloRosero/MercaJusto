import * as React from "react";
import { View } from "react-native";
import type { SmokeyBackgroundProps } from "./smokey";

export type { SmokeyBackgroundProps } from "./smokey";

// Fondo de humo con WebGL, solo para la versión web. Adaptado de un
// componente con Tailwind. Además de quitar Tailwind, corrige un problema del
// original: el original guardaba el puntero en el estado de React y en cada
// movimiento del mouse creaba otro programa WebGL y otro bucle de dibujo. Aquí el
// programa se crea una vez, el puntero vive en una ref, se pausa fuera de
// pantalla y con movimiento reducido se dibuja un solo cuadro quieto.

const vertexSource = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const fragmentSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.5;

  vec2 mouse = iMouse / iResolution;
  vec2 rippleCenter = 2.0 * mouse - 1.0;

  vec2 distortion = centeredUV;
  for (float i = 1.0; i < 8.0; i++) {
    distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
    distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
  }

  float wave = abs(sin(distortion.x + distortion.y + time));
  float glow = smoothstep(0.9, 0.2, wave);

  gl_FragColor = vec4(u_color * glow, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#1F6B3D";
  return [
    parseInt(clean.slice(1, 3), 16) / 255,
    parseInt(clean.slice(3, 5), 16) / 255,
    parseInt(clean.slice(5, 7), 16) / 255,
  ];
}

function compile(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SmokeyBackground({ color = "#1F6B3D", groundColor = "#030806", veil = 0.35, style }: SmokeyBackgroundProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const colorRef = React.useRef(hexToRgb(color));

  React.useEffect(() => {
    colorRef.current = hexToRgb(color);
  }, [color]);

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    // Sin WebGL queda el color de suelo del contenedor.
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uMouse = gl.getUniformLocation(program, "iMouse");
    const uColor = gl.getUniformLocation(program, "u_color");

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let frame: number | undefined;
    let visible = true;
    let elapsed = 0;
    let last = performance.now();

    const draw = (now: number) => {
      frame = undefined;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!media.matches) elapsed += dt;
      // El humo sigue al puntero con suavidad en vez de saltar.
      const ease = 1 - Math.exp(-dt * 3);
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;

      // Lienzo a 1x: el humo es difuso y así pesa la mitad en pantallas densas.
      const width = Math.max(1, Math.round(root.clientWidth));
      const height = Math.max(1, Math.round(root.clientHeight));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uMouse, pointer.x * width, pointer.y * height);
      gl.uniform3fv(uColor, colorRef.current);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (visible && !media.matches) frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (frame !== undefined || !visible) return;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    };

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.tx = (e.clientX - rect.left) / rect.width;
      pointer.ty = 1 - (e.clientY - rect.top) / rect.height;
    };
    const onLeave = () => {
      pointer.tx = 0.5;
      pointer.ty = 0.5;
    };
    const onMotionChange = () => {
      stop();
      start();
    };

    const visibility = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else stop();
    });
    const resize = new ResizeObserver(() => start());
    visibility.observe(root);
    resize.observe(root);
    // El puntero se escucha en la ventana: el formulario va encima del lienzo.
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    media.addEventListener("change", onMotionChange);
    start();

    return () => {
      stop();
      visibility.disconnect();
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      media.removeEventListener("change", onMotionChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: groundColor }, style]}
    >
      <div ref={rootRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        {/* Velo oscuro: baja el humo para que el formulario se lea siempre. */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: groundColor, opacity: veil }} />
      </div>
    </View>
  );
}

export default SmokeyBackground;
