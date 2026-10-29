import React, { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useReducedMotion } from "react-native-reanimated";
import { LIQUID_METAL_FRAGMENT, LIQUID_METAL_VERTEX, parseHexColor, type LiquidMetalShaderProps } from "./liquidMetal";

export type { LiquidMetalShaderProps } from "./liquidMetal";

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/**
 * Metal líquido en el celular: el mismo shader de la web, con expo-gl.
 * Debajo queda un degradado con los mismos colores, que es lo que se ve
 * mientras arranca, si el shader falla o si se pasa `speed={0}` sin GL.
 * Se detiene con la app en segundo plano; con movimiento reducido dibuja un
 * solo cuadro. En el celular no hay puntero, así que no se deforma al tocar.
 */
export function LiquidMetalShader({
  baseColor = "#1a1a1a",
  metalColor = "#ccd0e2",
  highlightColor = "#ffffff",
  distortion = 0.6,
  scale = 0.92,
  speed = 0.72,
  style,
}: LiquidMetalShaderProps) {
  const reduceMotion = useReducedMotion();
  const [running, setRunning] = useState(false);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
  // Cambiar colores o movimiento reducido crea un contexto nuevo.
  const glKey = [baseColor, metalColor, highlightColor, distortion, scale, speed, reduceMotion].join("|");

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    cleanup.current?.();
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, LIQUID_METAL_VERTEX);
    const fragment = vertex && compile(gl.FRAGMENT_SHADER, LIQUID_METAL_FRAGMENT);
    if (!vertex || !fragment) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    gl.uniform2f(u("u_resolution"), gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(u("u_pointer"), 0.5, 0.5);
    gl.uniform1f(u("u_pointer_strength"), 0);
    gl.uniform1f(u("u_distortion"), clamp(distortion, 0, 1.5));
    gl.uniform1f(u("u_scale"), clamp(scale, 0.6, 2.4));
    gl.uniform3fv(u("u_base"), parseHexColor(baseColor, "#1a1a1a"));
    gl.uniform3fv(u("u_metal"), parseHexColor(metalColor, "#ccd0e2"));
    gl.uniform3fv(u("u_highlight"), parseHexColor(highlightColor, "#ffffff"));
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const uTime = u("u_time");
    const rate = clamp(speed, 0, 1.5);

    const draw = (time: number) => {
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.flush();
      gl.endFrameEXP();
    };

    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let active = AppState.currentState === "active";
    const loop = (now: number) => {
      if (last) elapsed += Math.min(0.05, (now - last) / 1000) * rate;
      last = now;
      draw(elapsed);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      last = 0;
    };
    const start = () => {
      stop();
      if (!reduceMotion && rate > 0 && active) frame = requestAnimationFrame(loop);
    };

    draw(0);
    setRunning(true);
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
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
      cleanup.current = null;
    };
  };

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ overflow: "hidden", backgroundColor: baseColor }, style]}
    >
      {/* Respaldo mientras arranca el shader o si el celular no lo soporta */}
      <LinearGradient
        colors={[baseColor, metalColor, baseColor, metalColor, baseColor]}
        locations={[0, 0.3, 0.55, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <GLView key={glKey} style={{ flex: 1, opacity: running ? 1 : 0 }} onContextCreate={onContextCreate} />
    </View>
  );
}

export default LiquidMetalShader;
