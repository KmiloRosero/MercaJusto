import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Icon } from "./Icon";
import { useTheme } from "../theme";

type Coordinate = { latitude: number; longitude: number };

interface MapPreviewProps {
  origin: Coordinate | null;
  destination: Coordinate | null;
}

const HEIGHT = 220;
const PAD = 48; // margen para que pines y etiquetas no se corten

/**
 * Vista esquemática para la web (react-native-maps solo existe en el celular).
 * Proyecta las coordenadas reales en el recuadro: la ruta une de verdad la
 * finca del productor con el punto de entrega.
 */
export default function MapPreview({ origin, destination }: MapPreviewProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const points = (() => {
    if (!origin || !destination || !width) return null;
    const minLat = Math.min(origin.latitude, destination.latitude);
    const maxLat = Math.max(origin.latitude, destination.latitude);
    const minLng = Math.min(origin.longitude, destination.longitude);
    const maxLng = Math.max(origin.longitude, destination.longitude);
    // Misma escala en ambos ejes para no deformar la geografía.
    const spanLat = Math.max(maxLat - minLat, 1e-4);
    const spanLng = Math.max(maxLng - minLng, 1e-4);
    const scale = Math.min((width - PAD * 2) / spanLng, (HEIGHT - PAD * 2) / spanLat);
    const offX = (width - spanLng * scale) / 2;
    const offY = (HEIGHT - spanLat * scale) / 2;
    const project = (c: Coordinate) => ({
      x: offX + (c.longitude - minLng) * scale,
      y: offY + (maxLat - c.latitude) * scale,
    });
    return { a: project(origin), b: project(destination) };
  })();

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={points ? "Ruta desde la finca del productor hasta tu dirección" : undefined}
      style={{ width: "100%", height: HEIGHT, backgroundColor: theme.bgSecondary, overflow: "hidden" }}
    >
      {width ? (
        <Svg width={width} height={HEIGHT} style={{ position: "absolute" }}>
          {/* Cuadrícula tenue de referencia */}
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={`h${f}`} x1={0} y1={HEIGHT * f} x2={width} y2={HEIGHT * f} stroke={theme.border} strokeWidth={1} />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={`v${f}`} x1={width * f} y1={0} x2={width * f} y2={HEIGHT} stroke={theme.border} strokeWidth={1} />
          ))}
          {points ? (
            <>
              <Path
                d={`M ${points.a.x} ${points.a.y} Q ${(points.a.x + points.b.x) / 2} ${Math.min(points.a.y, points.b.y) - 24} ${points.b.x} ${points.b.y}`}
                stroke={theme.primary}
                strokeWidth={3}
                strokeDasharray="8 6"
                strokeLinecap="round"
                fill="none"
              />
              <Circle cx={points.a.x} cy={points.a.y} r={6} fill={theme.primary} />
              <Circle cx={points.b.x} cy={points.b.y} r={6} fill={theme.primary} />
            </>
          ) : null}
        </Svg>
      ) : null}

      {points ? (
        <>
          <Pin x={points.a.x} y={points.a.y} icon="leaf" label="Productor" />
          <Pin x={points.b.x} y={points.b.y} icon="location" label="Entrega" />
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
    <View style={{ position: "absolute", left: x - 40, top: y - 42, width: 80, alignItems: "center" }}>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: theme.bgCard,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Icon name={icon} size={14} color={theme.primary} />
        <Text style={{ color: theme.textPrimary, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      </View>
    </View>
  );
}
