import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { fontSize, spacing, useTheme } from "../../src/theme";

// Stub — se implementa en fase 2
export default function Calificacion() {
  const router = useRouter();
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Calificar pedido" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], gap: spacing[3] }}>
        <Text style={{ fontSize: 72 }}>⭐</Text>
        <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary, textAlign: "center" }}>
          Califica tu experiencia
        </Text>
        <Text style={{ color: t.textSecondary, textAlign: "center" }}>
          Pedido #{String(id).slice(-8).toUpperCase()} — estrellas interactivas y comentario (fase 2).
        </Text>
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}
