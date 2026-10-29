import React, { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
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
 * El mismo fondo con shader en el celular, con expo-gl (funciona en Expo Go).
 * Se detiene con la app en segundo plano y con movimiento reducido dibuja un
 * solo cuadro. Si el shader falla, queda el color de fondo del padre.
 * En el celular no hay puntero: el brillo de tierra deriva solo, muy despacio.
 */
export function ShaderCanvas({
  fragment = FIELDS_FRAGMENT,
  colors,
  stillTime = 4,
  onError,
  onStatusChange,
}: ShaderCanvasProps) {
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<ShaderCanvasStatus>("starting");
  const cleanup = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onError, onStatusChange });
  useEffect(() => {
    callbacks.current = { onError, onStatusChange };
  });
  const colourKey = JSON.stringify(colors);
  // Cambiar de tema o de movimiento reducido crea un contexto nuevo.
  const glKey = `${colourKey}|${reducedMotion}|${fragment.length}`;

  useEffect(() => {
    callbacks.current.onStatusChange?.(status);
  }, [status]);

  useEffect(() => () => cleanup.current?.(), []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    cleanup.current?.();
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
      fail("El shader no enlazó.");
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
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const render = (time: number) => {
      gl.uniform1f(uTime, time);
      gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(uPointer, 0.5 + Math.sin(time * 0.15) * 0.3, 0.86 + Math.cos(time * 0.11) * 0.06);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.flush();
      gl.endFrameEXP();
    };

    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let active = AppState.currentState === "active";
    const loop = (now: number) => {
      if (last) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
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
      else if (active) frame = requestAnimationFrame(loop);
    };

    render(reducedMotion ? stillTime : 0);
    setStatus("running");
    start();
    const sub = AppState.addEventListener("change", (state) => {
      active = state === "active";
      if (active) start();
      else stop();
    });

    cleanup.current = () => {
      stop();
      sub.remove();
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(pixel);
      gl.deleteBuffer(buffer);
      cleanup.current = null;
    };
  };

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: status === "running" ? 1 : 0 }}>
      <GLView key={glKey} style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}

export default ShaderCanvas;
