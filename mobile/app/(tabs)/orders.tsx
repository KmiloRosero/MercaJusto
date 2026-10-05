import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Pill } from "../../src/components/Pill";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { getMyOrders } from "../../src/api/client";
import { OrderStatus } from "../../src/api/types";

const statusMap: Record<OrderStatus, { label: string; variant: "primary" | "success" | "warning" | "danger" | "accent" }> = {
  PENDING: { label: "⏳ Pendiente", variant: "warning" },
  CONFIRMED: { label: "✓ Confirmado", variant: "primary" },
  PREPARING: { label: "👨‍🌾 Preparando", variant: "accent" },
  IN_TRANSIT: { label: "🚚 En camino", variant: "accent" },
  DELIVERED: { label: "✓ Entregado", variant: "success" },
  CANCELLED: { label: "✗ Cancelado", variant: "danger" },
};

export default function Orders() {
  const router = useRouter();
  const t = useTheme();
  const { data = [], isLoading } = useQuery({ queryKey: ["orders"], queryFn: getMyOrders });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Mis pedidos" />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
        ListEmptyComponent={
          <View style={{ padding: spacing[8], alignItems: "center" }}>
            <Text style={{ fontSize: 64, marginBottom: spacing[3] }}>📦</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: "700", color: t.textPrimary, marginBottom: spacing[2] }}>
              Aún no tienes pedidos
            </Text>
            <Text style={{ color: t.textSecondary, textAlign: "center" }}>
              Cuando compres algo, aparecerá aquí con seguimiento en tiempo real.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = statusMap[item.status];
          return (
            <Pressable
              onPress={() => router.push(`/seguimiento/${item.id}`)}
              style={{
                backgroundColor: t.bgCard,
                borderRadius: radius.lg,
                padding: spacing[4],
                gap: spacing[2],
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.sm, color: t.textTertiary }}>
                  #{item.id.slice(-8).toUpperCase()}
                </Text>
                <Pill variant={status.variant}>{status.label}</Pill>
              </View>
              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                {item.items.length} producto{item.items.length !== 1 ? "s" : ""}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>
                {new Date(item.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing[2] }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color: t.primary }}>
                  {formatCOP(item.total)}
                </Text>
                <Text style={{ color: t.primary, fontSize: fontSize.sm, fontWeight: "600" }}>
                  Ver detalle →
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
