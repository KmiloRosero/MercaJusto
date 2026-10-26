import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Icon } from "./Icon";
import { useTheme } from "../theme";
import { MAP_HEIGHT, pathPoints, type Coordinate, type MapPreviewProps } from "./mapTypes";

const PAD = 52; // margen para que pines y etiquetas no se corten

/**
 * Vista esquemática para la web (react-native-maps solo existe en el celular).
 * Proyecta las coordenadas reales en el recuadro, con la misma escala en ambos
 * ejes: la línea recorre de verdad la ruta optimizada.
 */
export default function MapPreview(props: MapPreviewProps) {
  const { origin, destination, route, highlightLabel = "Este pedido" } = props;
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const all = pathPoints(props);
  const multiStop = !!route && route.length > 1;

  const project = (() => {
    if (all.length < 2 || !width) return null;
    const lats = all.map((c) => c.latitude);
    const lngs = all.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(maxLat - minLat, 1e-4);
    const spanLng = Math.max(maxLng - minLng, 1e-4);
    // Abajo se deja más aire: ahí se monta la tarjeta de estado.
    const scale = Math.min((width - PAD * 2) / spanLng, (MAP_HEIGHT - PAD * 2 - 24) / spanLat);
    const offX = (width - spanLng * scale) / 2;
    const offY = (MAP_HEIGHT - 24 - spanLat * scale) / 2;
    return (c: Coordinate) => ({ x: offX + (c.longitude - minLng) * scale, y: offY + (maxLat - c.latitude) * scale });
  })();

  const projected = project ? all.map(project) : [];
  const originPt = project && origin ? project(origin) : null;
  const destinationPt = project && destination ? project(destination) : null;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={
        multiStop
          ? `Ruta optimizada con ${route!.length} entregas desde la finca del productor`
          : project
            ? "Ruta desde la finca del productor hasta tu dirección"
            : undefined
      }
      style={{ width: "100%", height: MAP_HEIGHT, backgroundColor: theme.bgSecondary, overflow: "hidden" }}
    >
      {width ? (
        <Svg width={width} height={MAP_HEIGHT} style={{ position: "absolute" }}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={`h${f}`} x1={0} y1={MAP_HEIGHT * f} x2={width} y2={MAP_HEIGHT * f} stroke={theme.border} strokeWidth={1} />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={`v${f}`} x1={width * f} y1={0} x2={width * f} y2={MAP_HEIGHT} stroke={theme.border} strokeWidth={1} />
          ))}
          {projected.length > 1 ? (
            <Polyline
              points={projected.map((p) => `${p.x},${p.y}`).join(" ")}
              stroke={theme.primary}
              strokeWidth={4}
              strokeDasharray={multiStop ? undefined : "8 6"}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ) : null}
          {multiStop && project
            ? route!.map((s, i) => {
                const p = project(s);
                return (
                  <Circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={s.mine ? 8 : 6}
                    fill={s.mine ? theme.primary : theme.bgCard}
                    stroke={s.mine ? theme.bgCard : theme.gray400}
                    strokeWidth={2}
                  />
                );
              })
            : null}
          {originPt ? <Circle cx={originPt.x} cy={originPt.y} r={7} fill={theme.success} stroke={theme.bgCard} strokeWidth={2} /> : null}
          {!multiStop && destinationPt ? (
            <Circle cx={destinationPt.x} cy={destinationPt.y} r={7} fill={theme.primary} stroke={theme.bgCard} strokeWidth={2} />
          ) : null}
        </Svg>
      ) : null}

      {project ? (
        <>
          {originPt ? <Pin x={originPt.x} y={originPt.y} icon="leaf" label="Finca" /> : null}
          {multiStop
            ? route!.map((s, i) => {
                const p = project(s);
                return s.mine ? <Pin key={i} x={p.x} y={p.y} icon="location" label={`${highlightLabel} · ${i + 1}`} /> : null;
              })
            : destinationPt ? (
                <Pin x={destinationPt.x} y={destinationPt.y} icon="location" label="Entrega" />
              ) : null}
        </>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Sin coordenadas disponibles para este pedido</Text>
        </View>
      )}
    </View>
  );
}

function Pin({ x, y, icon, label }: { x: number; y: number; icon: string; label: string }) {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - 80, top: y - 40, width: 160, alignItems: "center" }}>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: theme.bgCard,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Icon name={icon} size={14} color={theme.primary} />
        <Text numberOfLines={1} style={{ color: theme.textPrimary, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      </View>
    </View>
  );
}
