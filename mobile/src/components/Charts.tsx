import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { radius, spacing, type, useTheme, useThemeScheme } from "../theme";

// Gráficas de "Mi impacto" y "Mis ventas", dibujadas con SVG (sin librerías).
// Reglas de la guía de visualización: una sola serie en un solo verde (sin
// leyenda: el título dice qué se grafica), barras de máximo 24 dp con la punta
// redondeada a 4 y la base recta, cuadrícula de 1 dp casi invisible, una
// etiqueta directa (la barra elegida, por defecto la última) y el texto siempre
// en tintas de texto, nunca del color de la serie. El verde de la serie pasó el
// validador de paleta: #1F6B3D sobre blanco y #2FA35F sobre el gris oscuro.

/** Verde de las marcas de datos, según el tema. */
export function useSeriesColor() {
  const t = useTheme();
  return useThemeScheme() === "dark" ? t.primaryDark : t.primary;
}

/** $1.234.567 → "$1,2 M"; $43.040 → "$43 mil". Para ejes y etiquetas cortas. */
export function compactCOP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString("es-CO")} mil`;
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

/** Escala del eje en números redondos: 0, 20 mil, 40 mil… */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= max / 2) ?? 10;
  return Math.ceil(max / (step * pow)) * step * pow;
}

/** Columna con base recta y punta redondeada (4 dp). */
function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  const base = y + h;
  return `M${x} ${base} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${base} Z`;
}

export interface ColumnDatum {
  label: string;
  /** Texto completo para lectores de pantalla y la tabla, p. ej. "Semana del 8 sep". */
  longLabel: string;
  value: number;
}

const CHART_H = 170;
const AXIS_W = 72;
const BOTTOM = 26;

/**
 * Columnas de una serie en el tiempo. Tocar una columna la selecciona y
 * muestra su valor encima; sin tocar, se etiqueta la última. "Ver como tabla"
 * muestra los mismos datos en filas.
 */
export function ColumnChart({ data, format }: { data: ColumnDatum[]; format: (n: number) => string }) {
  const t = useTheme();
  const color = useSeriesColor();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(data.length - 1);
  const [asTable, setAsTable] = useState(false);

  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = Math.max(0, width - AXIS_W);
  const plotH = CHART_H - BOTTOM;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.min(24, slot * 0.56);
  const ticks = [0, max / 2, max];
  const sel = data[selected];

  return (
    <View style={{ gap: spacing[2] }}>
      {asTable ? (
        <View accessibilityRole="list">
          {data.map((d, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: spacing[2],
                borderBottomWidth: i === data.length - 1 ? 0 : 1,
                borderBottomColor: t.border,
              }}
            >
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>{d.longLabel}</Text>
              <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "700" }]}>{format(d.value)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_H }}>
          {width ? (
            <>
              <Svg width={width} height={CHART_H} style={{ position: "absolute" }}>
                {ticks.map((v) => {
                  const y = plotH - (v / max) * plotH;
                  return <Line key={v} x1={AXIS_W} y1={y} x2={width} y2={y} stroke={t.border} strokeWidth={1} />;
                })}
                {data.map((d, i) => {
                  const h = (d.value / max) * plotH;
                  if (h <= 0) return null;
                  const x = AXIS_W + i * slot + (slot - barW) / 2;
                  return <Path key={i} d={columnPath(x, plotH - h, barW, h)} fill={color} opacity={i === selected ? 1 : 0.55} />;
                })}
              </Svg>

              {/* Eje: valores redondos a la izquierda */}
              {ticks.map((v) => (
                <Text
                  key={v}
                  numberOfLines={1}
                  style={[
                    type.footnote,
                    { position: "absolute", left: 0, width: AXIS_W - 8, top: plotH - (v / max) * plotH - 9, textAlign: "right", color: t.textTertiary, fontWeight: "400" },
                  ]}
                >
                  {v === 0 ? "0" : compactCOP(v)}
                </Text>
              ))}

              {/* Etiqueta directa de la columna elegida */}
              {sel && sel.value > 0 ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: Math.min(Math.max(AXIS_W + selected * slot + slot / 2 - 50, AXIS_W), width - 100),
                    top: Math.max(0, plotH - (sel.value / max) * plotH - 26),
                    width: 100,
                    alignItems: "center",
                  }}
                >
                  <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "800" }]}>{format(sel.value)}</Text>
                </View>
              ) : null}

              {/* Etiquetas de semana: una sí y una no contando desde la última, que siempre se ve */}
              {data.map((d, i) =>
                (data.length - 1 - i) % 2 === 0 ? (
                  <Text
                    key={i}
                    numberOfLines={1}
                    style={[
                      type.footnote,
                      {
                        position: "absolute",
                        top: plotH + 6,
                        left: AXIS_W + i * slot - 10,
                        width: slot + 20,
                        textAlign: "center",
                        color: i === selected ? t.textPrimary : t.textTertiary,
                        fontWeight: i === selected ? "700" : "400",
                      },
                    ]}
                  >
                    {d.label}
                  </Text>
                ) : null
              )}

              {/* Zonas de toque: la columna entera, más grande que la barra */}
              <View style={{ position: "absolute", left: AXIS_W, top: 0, right: 0, height: CHART_H, flexDirection: "row" }}>
                {data.map((d, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setSelected(i)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: i === selected }}
                    accessibilityLabel={`${d.longLabel}: ${format(d.value)}`}
                    style={{ flex: 1 }}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={() => setAsTable((v) => !v)}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => ({ alignSelf: "flex-end", minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[type.footnote, { color: t.primary, fontWeight: "700" }]}>{asTable ? "Ver gráfica" : "Ver como tabla"}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Barras horizontales ordenadas de mayor a menor, con el valor en la punta.
 * Para comparar magnitudes entre categorías o productos.
 */
export function BarList({ data, format }: { data: { label: string; value: number; detail?: string }[]; format: (n: number) => string }) {
  const t = useTheme();
  const color = useSeriesColor();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: spacing[3] }}>
      {data.map((d) => (
        <View key={d.label} accessible accessibilityLabel={`${d.label}: ${format(d.value)}${d.detail ? `, ${d.detail}` : ""}`} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[2] }}>
            <Text numberOfLines={1} style={[type.footnote, { flex: 1, color: t.textPrimary, fontWeight: "600" }]}>
              {d.label}
              {d.detail ? <Text style={{ color: t.textTertiary, fontWeight: "400" }}> · {d.detail}</Text> : null}
            </Text>
            <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "700" }]}>{format(d.value)}</Text>
          </View>
          <View style={{ height: 10, borderRadius: radius.full, backgroundColor: t.bgInput, overflow: "hidden" }}>
            <View style={{ width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: radius.full, backgroundColor: color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Cifra con su etiqueta. Etiqueta en minúscula inicial, sin dos puntos. */
export function StatTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{ flex: 1, minWidth: 140, padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.bgInput, gap: spacing[2] }}
    >
      {icon}
      <Text style={{ color: t.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 }}>{value}</Text>
      <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "500" }]}>{label}</Text>
    </View>
  );
}
