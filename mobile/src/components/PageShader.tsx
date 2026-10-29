import React from "react";
import { useIsFocused } from "expo-router";
import { useTheme } from "../theme";
import { ShaderCanvas } from "./ui/ShaderCanvas";

/**
 * Fondo de las pantallas principales: lomas en terrazas (shader) sobre el
 * color de la app. Va como primer hijo de la raíz de la pantalla y la cubre
 * entera. Solo la pantalla que se está viendo anima, para no tener varios
 * shaders a la vez; las demás quedan con el color liso, que es la misma base
 * del shader, así que no hay salto al volver.
 */
/** `surface`: el color base de la pantalla, si no es el fondo principal. */
export function PageShader({ surface }: { surface?: string }) {
  const t = useTheme();
  const focused = useIsFocused();
  if (!focused) return null;
  return <ShaderCanvas colors={{ u_surface: surface ?? t.bgPrimary, u_field: t.primaryLight, u_line: t.primary, u_sun: t.accent }} />;
}
