import React from "react";
import { useIsFocused } from "expo-router";
import { useTheme, useThemeScheme } from "../theme";
import { ShaderCanvas } from "./ui/ShaderCanvas";

/**
 * Fondo de las pantallas principales: amanecer sobre lomas en terrazas (shader) sobre el
 * color de la app. Va como primer hijo de la raíz de la pantalla y la cubre
 * entera. Solo la pantalla que se está viendo anima, para no tener varios
 * shaders a la vez; las demás quedan con el color liso, que es la misma base
 * del shader, así que no hay salto al volver.
 */
/**
 * De noche el cielo cálido se ve turbio y el verde de la marca brilla demasiado
 * en las lomas: van verdes profundos con un brillo de luna apenas cálido.
 */
const NIGHT = { u_field: "#0F2A19", u_line: "#1F6B3D", u_sun: "#F2A56E", u_glow: "#132E1D" };

/** `surface`: el color base de la pantalla, si no es el fondo principal. */
export function PageShader({ surface }: { surface?: string }) {
  const t = useTheme();
  const scheme = useThemeScheme();
  const focused = useIsFocused();
  if (!focused) return null;
  return <ShaderCanvas colors={{ u_surface: surface ?? t.bgPrimary, ...(scheme === "dark" ? NIGHT : { u_field: t.primaryLight, u_line: t.primary, u_sun: t.accent, u_glow: t.accentLight }) }} />;
}
