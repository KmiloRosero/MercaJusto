import React, { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTheme } from "../theme";
import { useRoadRoute } from "../lib/roadRoute";
import { Icon } from "./Icon";
import { MAP_HEIGHT, boundsPoints, pathPoints, type MapPreviewProps } from "./mapTypes";

// Mapa real en el celular (Google Maps en Android). La línea sigue la carretera
// (OSRM) y el repartidor aparece en vivo como un marcador que se mueve.

export default function MapPreview(props: MapPreviewProps) {
  const { origin, destination, route, courier, courierName, highlightLabel = "Este pedido", height = MAP_HEIGHT } = props;
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const points = pathPoints(props);
  const road = useRoadRoute(points);
  const multiStop = !!route && route.length > 1;
  const fittedKm = useRef<number | null | undefined>(undefined);

  // Encuadra al cargar y cuando llega la ruta por carretera; no en cada movimiento del repartidor.
  useEffect(() => {
    if (fittedKm.current === road.km) return;
    const fit = boundsPoints(props);
    if (fit.length > 0) {
      mapRef.current?.fitToCoordinates(fit, {
        edgePadding: { top: 48, right: 48, bottom: 72, left: 48 },
        animated: true,
      });
      fittedKm.current = road.km;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [road]);

  if (points.length === 0) {
    return (
      <View style={{ width: "100%", height, alignItems: "center", justifyContent: "center", backgroundColor: theme.bgSecondary }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Sin coordenadas disponibles para este pedido</Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height, backgroundColor: theme.gray100 }}>
      <MapView
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialRegion={{ latitude: points[0].latitude, longitude: points[0].longitude, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
      >
        {road.path.length > 1 ? (
          <Polyline coordinates={road.path} strokeWidth={5} strokeColor={theme.primary} lineDashPattern={road.km === null ? [10, 8] : undefined} />
        ) : null}
        {origin ? <Marker coordinate={origin} title="Finca del productor" description="Desde aquí sale la ruta" pinColor={theme.success} /> : null}
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
        {courier ? (
          <Marker coordinate={courier} title={courierName ? `${courierName} va en camino` : "Repartidor"} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "#A8501C",
                borderWidth: 3,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="mci:moped" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}
