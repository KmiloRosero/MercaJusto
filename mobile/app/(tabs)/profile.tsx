import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { useAuth } from "../../src/store/auth";

export default function Profile() {
  const router = useRouter();
  const t = useTheme();
  const { user, logout } = useAuth();

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/onboarding");
        },
      },
    ]);
  };

  if (!user) return null;

  const isProducer = user.role === "PRODUCER";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar title="Mi perfil" />

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] }}>
        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: radius.xl,
            padding: spacing[5],
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: t.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing[2],
            }}
          >
            <Text style={{ fontSize: 40 }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary }}>
            {user.name}
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>{user.phone}</Text>
          <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[2] }}>
            <Pill variant={isProducer ? "success" : "primary"}>
              {isProducer ? "👨‍🌾 Productor" : user.role === "COURIER" ? "🚚 Repartidor" : "🛍️ Comprador"}
            </Pill>
            <Pill variant="warning">⭐ {user.rating.toFixed(1)} ({user.ratingCount})</Pill>
          </View>
        </View>

        {isProducer ? (
          <View style={{ backgroundColor: t.bgCard, borderRadius: radius.lg, padding: spacing[4] }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary, marginBottom: spacing[3] }}>
              📊 Resumen de ventas
            </Text>
            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <StatBox label="Productos activos" value="—" color={t.primary} />
              <StatBox label="Pedidos este mes" value="—" color={t.success} />
              <StatBox label="Calificación" value={user.rating.toFixed(1)} color={t.warning} />
            </View>
            <Button
              title="+ Publicar nueva cosecha"
              variant="accent"
              full
              style={{ marginTop: spacing[3] }}
              onPress={() => Alert.alert("Próximamente", "Formulario de publicación en la fase 2")}
            />
          </View>
        ) : null}

        <MenuItem icon="📍" label="Mis direcciones" onPress={() => Alert.alert("Próximamente")} />
        <MenuItem icon="💳" label="Métodos de pago" onPress={() => Alert.alert("Próximamente")} />
        <MenuItem icon="🌙" label="Modo oscuro" onPress={() => Alert.alert("Se activa según tu sistema")} />
        <MenuItem icon="❓" label="Ayuda y soporte" onPress={() => Alert.alert("Próximamente")} />
        <MenuItem icon="📜" label="Términos y privacidad" onPress={() => Alert.alert("Próximamente")} />

        <Button title="Cerrar sesión" variant="outline" full onPress={onLogout} />

        <Text style={{ textAlign: "center", color: t.textTertiary, fontSize: fontSize.xs, marginTop: spacing[2] }}>
          MercaJusto v0.1.0 · Hecho con ❤️ en Nariño
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.bgSecondary,
        borderRadius: radius.md,
        padding: spacing[3],
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: t.textTertiary, textAlign: "center", marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: t.bgCard,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[3],
      }}
    >
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ flex: 1, fontSize: fontSize.base, color: t.textPrimary, fontWeight: "500" }}>
        {label}
      </Text>
      <Text style={{ color: t.textTertiary }}>›</Text>
    </Pressable>
  );
}
