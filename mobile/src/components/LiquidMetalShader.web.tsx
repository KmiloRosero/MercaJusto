import * as React from "react";
import { View } from "react-native";
import { LIQUID_METAL_FRAGMENT, LIQUID_METAL_VERTEX, type LiquidMetalShaderProps } from "./liquidMetal";

export type { LiquidMetalShaderProps } from "./liquidMetal";

// Fondo animado de metal líquido con WebGL, solo para la versión web.
// Adaptado de un componente shadcn: sin Tailwind ni CSS modules, con estilos
// en línea y el contenedor de React Native para que encaje en el layout.
// Se pausa fuera de pantalla y queda quieto con movimiento reducido.

type ShaderSettings = {
  base: [number, number, number];
  distortion: number;
  highlight: [number, number, number];
  interactive: boolean;
  metal: [number, number, number];
  pixelRatio: number;
  reduceMotion: boolean;
  scale: number;
  speed: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function parseHexColor(value: string, fallback: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return [
    Number.parseInt(normalized.slice(1, 3), 16) / 255,
    Number.parseInt(normalized.slice(3, 5), 16) / 255,
    Number.parseInt(normalized.slice(5, 7), 16) / 255,
  ] as [number, number, number];
}

function createShader(gl: WebGLRenderingContext, kind: number, source: string) {
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

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, LIQUID_METAL_VERTEX);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, LIQUID_METAL_FRAGMENT);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LiquidMetalShader({
  baseColor = "#1a1a1a",
  distortion = 0.6,
  highlightColor = "#ffffff",
  interactive = true,
  metalColor = "#ccd0e2",
  pixelRatio = 1.4,
  scale = 0.92,
  speed = 0.72,
  style,
}: LiquidMetalShaderProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const invalidateRef = React.useRef<() => void>(() => undefined);
  const reduceMotion = React.useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);
  const settings = React.useMemo<ShaderSettings>(
    () => ({
      base: parseHexColor(baseColor, "#1a1a1a"),
      distortion: clamp(distortion, 0, 1.5),
      highlight: parseHexColor(highlightColor, "#ffffff"),
      interactive,
      metal: parseHexColor(metalColor, "#ccd0e2"),
      pixelRatio: clamp(pixelRatio, 0.75, 2),
      reduceMotion,
      scale: clamp(scale, 0.6, 2.4),
      speed: clamp(speed, 0, 1.5),
    }),
    [baseColor, distortion, highlightColor, interactive, metalColor, pixelRatio, reduceMotion, scale, speed]
  );
  const settingsRef = React.useRef(settings);

  React.useEffect(() => {
    settingsRef.current = settings;
    invalidateRef.current();
  }, [settings]);

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    // Sin WebGL queda el color base del contenedor: el fondo nunca se rompe.
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!gl) return;
    const program = createProgram(gl);
    const buffer = gl.createBuffer();
    if (!program || !buffer) return;

    const renderRoot: HTMLDivElement = root;
    const renderCanvas: HTMLCanvasElement = canvas;
    const context: WebGLRenderingContext = gl;
    const positionLocation = context.getAttribLocation(program, "a_position");
    const uniforms = {
      base: context.getUniformLocation(program, "u_base"),
      distortion: context.getUniformLocation(program, "u_distortion"),
      highlight: context.getUniformLocation(program, "u_highlight"),
      metal: context.getUniformLocation(program, "u_metal"),
      pointer: context.getUniformLocation(program, "u_pointer"),
      pointerStrength: context.getUniformLocation(program, "u_pointer_strength"),
      resolution: context.getUniformLocation(program, "u_resolution"),
      scale: context.getUniformLocation(program, "u_scale"),
      time: context.getUniformLocation(program, "u_time"),
    };

    context.useProgram(program);
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    // Un triángulo que cubre toda la pantalla
    context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW);
    context.enableVertexAttribArray(positionLocation);
    context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);

    let animationFrame: number | undefined;
    let elapsed = 0;
    let lastTime = performance.now();
    let visible = true;
    const pointer = { currentStrength: 0, currentX: 0.5, currentY: 0.5, strength: 0, x: 0.5, y: 0.5 };

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, settingsRef.current.pixelRatio);
      const rect = renderRoot.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (renderCanvas.width !== width || renderCanvas.height !== height) {
        renderCanvas.width = width;
        renderCanvas.height = height;
      }
      context.viewport(0, 0, width, height);
    }

    function draw(timestamp: number) {
      animationFrame = undefined;
      const s = settingsRef.current;
      const delta = Math.min(Math.max((timestamp - lastTime) / 1000, 0), 0.05);
      lastTime = timestamp;
      if (!s.reduceMotion) elapsed += delta * s.speed;

      const pointerEase = 1 - Math.exp(-delta * 8);
      const targetStrength = s.interactive && !s.reduceMotion ? pointer.strength : 0;
      pointer.currentX += (pointer.x - pointer.currentX) * pointerEase;
      pointer.currentY += (pointer.y - pointer.currentY) * pointerEase;
      pointer.currentStrength += (targetStrength - pointer.currentStrength) * pointerEase;
      resize();
      context.uniform2f(uniforms.resolution, renderCanvas.width, renderCanvas.height);
      context.uniform2f(uniforms.pointer, pointer.currentX, pointer.currentY);
      context.uniform1f(uniforms.pointerStrength, pointer.currentStrength);
      context.uniform1f(uniforms.time, elapsed);
      context.uniform1f(uniforms.distortion, s.distortion);
      context.uniform1f(uniforms.scale, s.scale);
      context.uniform3fv(uniforms.base, s.base);
      context.uniform3fv(uniforms.metal, s.metal);
      context.uniform3fv(uniforms.highlight, s.highlight);
      context.drawArrays(context.TRIANGLES, 0, 3);

      const pointerIsSettling =
        Math.abs(pointer.x - pointer.currentX) > 0.001 ||
        Math.abs(pointer.y - pointer.currentY) > 0.001 ||
        Math.abs(targetStrength - pointer.currentStrength) > 0.001;
      if (visible && !s.reduceMotion && (s.speed > 0 || pointerIsSettling)) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function invalidate() {
      if (animationFrame !== undefined || !visible) return;
      lastTime = performance.now();
      animationFrame = window.requestAnimationFrame(draw);
    }

    function stop() {
      if (animationFrame === undefined) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = undefined;
    }

    function handlePointerMove(event: PointerEvent) {
      const s = settingsRef.current;
      if (!s.interactive || s.reduceMotion) return;
      const rect = renderRoot.getBoundingClientRect();
      pointer.x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      pointer.y = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1);
      pointer.strength = 1;
      invalidate();
    }

    function handlePointerLeave() {
      pointer.x = 0.5;
      pointer.y = 0.5;
      pointer.strength = 0;
      invalidate();
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      stop();
    }

    const resizeObserver = new ResizeObserver(invalidate);
    // Fuera de pantalla (otro paso del onboarding) no se dibuja.
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) invalidate();
      else stop();
    });

    resizeObserver.observe(renderRoot);
    visibilityObserver.observe(renderRoot);
    renderRoot.addEventListener("pointermove", handlePointerMove);
    renderRoot.addEventListener("pointerleave", handlePointerLeave);
    renderCanvas.addEventListener("webglcontextlost", handleContextLost);
    invalidateRef.current = invalidate;
    invalidate();

    return () => {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderRoot.removeEventListener("pointermove", handlePointerMove);
      renderRoot.removeEventListener("pointerleave", handlePointerLeave);
      renderCanvas.removeEventListener("webglcontextlost", handleContextLost);
      invalidateRef.current = () => undefined;
      context.deleteBuffer(buffer);
      context.deleteProgram(program);
    };
  }, []);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ overflow: "hidden", backgroundColor: baseColor }, style]}
    >
      <div ref={rootRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>
    </View>
  );
}

export default LiquidMetalShader;
