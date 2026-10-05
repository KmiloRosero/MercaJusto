import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Pill } from "../../src/components/Pill";
import { Icon, IconName } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { getMyOrders } from "../../src/api/client";
import { OrderStatus } from "../../src/api/types";

const statusMap: Record<OrderStatus, { label: string; icon: IconName; variant: "primary" | "success" | "warning" | "danger" | "accent" }> = {
  PENDING: { label: "Pendiente", icon: "time-outline", variant: "warning" },
  CONFIRMED: { label: "Confirmado", icon: "checkmark-circle", variant: "primary" },
  PREPARING: { label: "Preparando", icon: "preparing", variant: "accent" },
  IN_TRANSIT: { label: "En camino", icon: "in_transit", variant: "accent" },
  DELIVERED: { label: "Entregado", icon: "delivered", variant: "success" },
  CANCELLED: { label: "Cancelado", icon: "close", variant: "danger" },
};

export default function Orders() {
  const router = useRouter();
  const t = useTheme();
  const { data = [] } = useQuery({ queryKey: ["orders"], queryFn: getMyOrders });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Mis pedidos" />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
        ListEmptyComponent={
          <View style={{ padding: spacing[8], alignItems: "center", gap: spacing[3] }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: t.bgPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="receipt-outline" size={36} color={t.textTertiary} />
            </View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color: t.textPrimary }}>
              Aún no tienes pedidos
            </Text>
            <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm }}>
              Tus pedidos realizados aparecerán aquí con seguimiento en tiempo real.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = statusMap[item.status];
          return (
            <Pressable
              onPress={() => router.push(`/seguimiento/${item.id}`)}
              style={({ pressed }) => ({
                backgroundColor: t.bgCard,
                borderRadius: radius.lg,
                padding: spacing[4],
                gap: spacing[2],
                borderWidth: 1,
                borderColor: t.border,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: t.textTertiary, fontWeight: "700" }}>
                  #{item.id.slice(-8).toUpperCase()}
                </Text>
                <Pill variant={status.variant} icon={status.icon}>
                  {status.label}
                </Pill>
              </View>

              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                {item.items.length} producto{item.items.length !== 1 ? "s" : ""}
              </Text>

              <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
                {new Date(item.createdAt).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: spacing[2],
                  paddingTop: spacing[2],
                  borderTopWidth: 1,
                  borderTopColor: t.border,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "800", color: t.primary }}>
                  {formatCOP(item.total)}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ color: t.primary, fontSize: fontSize.sm, fontWeight: "700" }}>
                    Seguimiento
                  </Text>
                  <Icon name="arrow-forward" size={14} color={t.primary} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
