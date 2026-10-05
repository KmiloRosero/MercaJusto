import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon, IconName } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { useAuth } from "../../src/store/auth";
import { getProducts } from "../../src/api/client";

export default function Profile() {
  const router = useRouter();
  const t = useTheme();
  const { user, logout } = useAuth();

  const isProducerUser = user?.role === "PRODUCER";
  const { data: myProducts } = useQuery({
    queryKey: ["products", "mine", user?.id],
    queryFn: () => getProducts({ limit: 100 }),
    enabled: isProducerUser,
  });

  const activeCount = isProducerUser
    ? (myProducts?.products ?? []).filter((p) => p.producerId === user?.id && p.isActive).length
    : 0;

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
            borderWidth: 1,
            borderColor: t.border,
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
              borderWidth: 2,
              borderColor: t.primary,
            }}
          >
            <Text style={{ fontSize: 36, fontWeight: "800", color: t.primary }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary }}>
            {user.name}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="call" size={14} color={t.textSecondary} />
            <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>{user.phone}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[2] }}>
            <Pill variant={isProducer ? "success" : "primary"} icon={isProducer ? "preparing" : "cart"}>
              {isProducer ? "Productor" : user.role === "COURIER" ? "Repartidor" : "Comprador"}
            </Pill>
            <Pill variant="warning" icon="star">
              {user.rating.toFixed(1)} ({user.ratingCount})
            </Pill>
          </View>
        </View>

        {isProducer ? (
          <View style={{ backgroundColor: t.bgCard, borderRadius: radius.lg, padding: spacing[4], borderWidth: 1, borderColor: t.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing[3] }}>
              <Icon name="sparkles" size={18} color={t.primary} />
              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                Resumen de productor
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <StatBox label="Productos activos" value={String(activeCount)} color={t.primary} />
              <StatBox label="Calificación" value={user.rating.toFixed(1)} color={t.warning} />
            </View>

            <Button
              title="Publicar nueva cosecha"
              variant="accent"
              full
              icon={<Icon name="add" size={20} color="#FFFFFF" />}
              style={{ marginTop: spacing[3] }}
              onPress={() => router.push("/publicar-cosecha")}
            />
          </View>
        ) : null}

        <View style={{ gap: spacing[2] }}>
          <MenuItem icon="location-outline" label="Mis direcciones de entrega" onPress={() => Alert.alert("MercaJusto", "Gestión de direcciones de entrega activa")} />
          <MenuItem icon="card-outline" label="Métodos de pago" onPress={() => Alert.alert("MercaJusto", "Soporta Nequi, Daviplata y Efectivo")} />
          <MenuItem icon="shield-checkmark-outline" label="Garantía de precio justo" onPress={() => Alert.alert("MercaJusto", "Conexión directa sin intermediarios")} />
          <MenuItem icon="options" label="Términos y condiciones" onPress={() => Alert.alert("MercaJusto", "Sistema MercaJusto Nariño")} />
        </View>

        <Button title="Cerrar sesión" variant="outline" full icon={<Icon name="close" size={18} color={t.primary} />} onPress={onLogout} />

        <Text style={{ textAlign: "center", color: t.textTertiary, fontSize: fontSize.xs, marginTop: spacing[2] }}>
          MercaJusto v0.1.0 · Hecho en Nariño, Colombia
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
      <Text style={{ fontSize: 10, color: t.textTertiary, textAlign: "center", marginTop: 2, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: t.bgCard,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[3],
        borderWidth: 1,
        borderColor: t.border,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name={icon} size={20} color={t.primary} />
      <Text style={{ flex: 1, fontSize: fontSize.base, color: t.textPrimary, fontWeight: "600" }}>
        {label}
      </Text>
      <Icon name="chevron-forward" size={18} color={t.textTertiary} />
    </Pressable>
  );
}
