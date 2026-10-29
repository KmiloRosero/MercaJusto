import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import {
  FIELDS_FRAGMENT,
  FULLSCREEN_TRIANGLE,
  VERTEX,
  cleanLog,
  hexToRgb,
  shaderHeader,
  type ShaderCanvasProps,
  type ShaderCanvasStatus,
} from "./shaderShared";

/**
 * Fondo con un fragment shader de WebGL, alimentado con los colores del tema.
 *
 * Se porta como un fondo: el ciclo se detiene fuera de pantalla y con la
 * pestaña oculta, la resolución tiene tope y con movimiento reducido dibuja un
 * solo cuadro en `stillTime`. Si no hay WebGL, se pierde el contexto o el
 * shader no compila, queda el color de fondo y el error llega a `onError`.
 * El tamaño lo da el padre: ocupa todo su espacio.
 */
export function ShaderCanvas({
  fragment = FIELDS_FRAGMENT,
  colors,
  resolution = 0.5,
  stillTime = 4,
  onError,
  onStatusChange,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<ShaderCanvasStatus>("starting");
  const callbacks = useRef({ onError, onStatusChange });
  useEffect(() => {
    callbacks.current = { onError, onStatusChange };
  });
  const colourKey = JSON.stringify(colors);

  useEffect(() => {
    callbacks.current.onStatusChange?.(status);
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      setStatus("unsupported");
      return;
    }

    const palette = JSON.parse(colourKey) as Record<string, string>;
    const names = Object.keys(palette);
    const fail = (message: string) => {
      setStatus("error");
      callbacks.current.onError?.(message);
    };

    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        fail(cleanLog(gl.getShaderInfoLog(shader) ?? "", names) || "El shader no compiló.");
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const pixel = vertex && compile(gl.FRAGMENT_SHADER, `${shaderHeader(names)}\n${fragment}`);
    if (!vertex || !pixel) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, pixel);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail(gl.getProgramInfoLog(program)?.trim() || "El shader no enlazó.");
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    for (const name of names) {
      const location = gl.getUniformLocation(program, name);
      if (location) gl.uniform3fv(location, hexToRgb(palette[name]!));
    }

    const pointer = { x: 0.5, y: 0.85, targetX: 0.5, targetY: 0.85 };
    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let last = 0;
    let lost = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1) * resolution;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const render = (time: number) => {
      if (lost) return;
      gl.uniform1f(uTime, time);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      if (last) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;
      render(elapsed);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      last = 0;
    };
    const start = () => {
      stop();
      if (reducedMotion) render(stillTime);
      else if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };

    resize();
    render(reducedMotion ? stillTime : 0);
    setStatus("running");
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      render(reducedMotion ? stillTime : elapsed);
    });
    resizeObserver.observe(canvas);

    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = Boolean(entry?.isIntersecting);
            if (visible) start();
            else stop();
          });
    intersection?.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.targetX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      pointer.targetY = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      stop();
      setStatus("unsupported");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersection?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
      gl.deleteBuffer(buffer);
    };
  }, [fragment, colourKey, resolution, stillTime, reducedMotion]);

  return (
    <View pointerEvents="none" aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", visibility: status === "running" ? "visible" : "hidden" }}
      />
    </View>
  );
}

export default ShaderCanvas;
