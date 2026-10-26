import React, { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTheme } from "../theme";
import { MAP_HEIGHT, pathPoints, type MapPreviewProps } from "./mapTypes";

export default function MapPreview(props: MapPreviewProps) {
  const { origin, destination, route, highlightLabel = "Este pedido" } = props;
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const points = pathPoints(props);
  const multiStop = !!route && route.length > 1;

  useEffect(() => {
    const fit = pathPoints({ origin, destination, route });
    if (fit.length > 0) {
      // Deja aire abajo: la tarjeta de estado se monta sobre el borde inferior del mapa.
      mapRef.current?.fitToCoordinates(fit, {
        edgePadding: { top: 48, right: 48, bottom: 72, left: 48 },
        animated: true,
      });
    }
  }, [origin, destination, route]);

  if (points.length === 0) {
    return (
      <View
        style={{
          width: "100%",
          height: MAP_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.bgSecondary,
        }}
      >
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Sin coordenadas disponibles para este pedido</Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height: MAP_HEIGHT, backgroundColor: theme.gray100 }}>
      <MapView
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialRegion={{
          latitude: points[0].latitude,
          longitude: points[0].longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
      >
        {origin ? (
          <Marker coordinate={origin} title="Finca del productor" description="Desde aquí sale la ruta" pinColor={theme.success} />
        ) : null}
        {multiStop
          ? route!.map((s, i) => (
              <Marker
                key={`${s.latitude},${s.longitude},${i}`}
                coordinate={s}
                title={s.mine ? `${highlightLabel} · parada ${i + 1}` : `Parada ${i + 1}`}
                pinColor={s.mine ? theme.primary : theme.gray400}
              />
            ))
          : destination ? (
              <Marker coordinate={destination} title="Dirección de entrega" pinColor={theme.primary} />
            ) : null}
        {points.length > 1 ? (
          <Polyline coordinates={points} strokeWidth={4} strokeColor={theme.primary} lineDashPattern={multiStop ? undefined : [10, 8]} />
        ) : null}
      </MapView>
    </View>
  );
}
