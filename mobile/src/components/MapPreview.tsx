import React, { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useTheme } from "../theme";

type Coordinate = { latitude: number; longitude: number };

interface MapPreviewProps {
  origin: Coordinate | null;
  destination: Coordinate | null;
}

export default function MapPreview({ origin, destination }: MapPreviewProps) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const coordinates = [origin, destination].filter(
    (coordinate): coordinate is Coordinate => coordinate !== null
  );

  useEffect(() => {
    if (coordinates.length > 0) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [origin, destination]);

  if (coordinates.length === 0) {
    return (
      <View
        style={{
          width: "100%",
          height: 220,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.bgSecondary,
        }}
      >
        <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
          Sin coordenadas disponibles para este pedido
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height: 220, backgroundColor: theme.gray100 }}>
      <MapView
        ref={mapRef}
        style={{ width: "100%", height: "100%" }}
        initialRegion={{
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {origin ? (
          <Marker coordinate={origin} title="Finca del productor" description="Aquí se recogió tu pedido">
            <Text style={{ fontSize: 30 }}>🌾</Text>
          </Marker>
        ) : null}
        {destination ? (
          <Marker coordinate={destination} title="Tu dirección" description="Punto de entrega">
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </Marker>
        ) : null}
        {origin && destination ? (
          <Polyline coordinates={[origin, destination]} strokeWidth={3} strokeColor="#008FFF" />
        ) : null}
      </MapView>
    </View>
  );
}