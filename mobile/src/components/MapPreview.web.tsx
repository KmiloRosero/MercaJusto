import React from "react";
import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { useTheme } from "../theme";

type Coordinate = { latitude: number; longitude: number };

interface MapPreviewProps {
  origin: Coordinate | null;
  destination: Coordinate | null;
}

export default function MapPreview({ origin, destination }: MapPreviewProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: "100%",
        height: 220,
        justifyContent: "center",
        backgroundColor: theme.bgSecondary,
        overflow: "hidden",
      }}
    >
      <View style={{ position: "absolute", top: 42, left: "12%", right: "12%", height: 1, backgroundColor: theme.border }} />
      <View style={{ position: "absolute", top: 108, left: 0, right: 0, height: 1, backgroundColor: theme.border }} />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: "38%", width: 1, backgroundColor: theme.border }} />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: "72%", width: 1, backgroundColor: theme.border }} />
      {origin && destination ? (
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: "28%",
            width: "46%",
            height: 3,
            backgroundColor: theme.primary,
            transform: [{ rotate: "-18deg" }],
          }}
        />
      ) : null}
      {origin ? (
        <View style={{ position: "absolute", top: 34, left: "14%", alignItems: "center", gap: 4 }}>
          <Icon name="leaf" size={25} color={theme.success} />
          <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: "700" }}>Productor</Text>
        </View>
      ) : null}
      {destination ? (
        <View style={{ position: "absolute", right: "12%", bottom: 35, alignItems: "center", gap: 4 }}>
          <Icon name="location" size={25} color={theme.primary} />
          <Text style={{ color: theme.textPrimary, fontSize: 11, fontWeight: "700" }}>Entrega</Text>
        </View>
      ) : null}
      {!origin && !destination ? (
        <Text style={{ alignSelf: "center", color: theme.textTertiary, fontSize: 12 }}>
          Sin coordenadas disponibles para este pedido
        </Text>
      ) : null}
    </View>
  );
}