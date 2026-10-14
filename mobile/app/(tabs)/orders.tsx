import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Pill } from "../../src/components/Pill";
import { Button } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { apiErrorMessage, getMyOrders, updateOrderStatus } from "../../src/api/client";
import { Order } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { NEXT_ACTION, ORDER_STATUS } from "../../src/lib/orderStatus";
import { showAlert } from "../../src/lib/dialog";

export default function Orders() {
  const router = useRouter();
  const t = useTheme();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const isBuyer = user?.role === "BUYER";
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const { data = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
    // Los estados cambian desde el otro lado (productor ↔ comprador)
    refetchInterval: 15_000,
  });

  const advance = async (order: Order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    setAdvancingId(order.id);
    try {
      await updateOrderStatus(order.id, action.next);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    } catch (err) {
      showAlert("No se pudo actualizar", apiErrorMessage(err));
    } finally {
      setAdvancingId(null);
    }
  };

  const active = data.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar title={isBuyer ? "Mis pedidos" : user?.role === "COURIER" ? "Mis entregas" : "Pedidos por despachar"} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          !isBuyer && data.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[2],
                backgroundColor: t.primaryLight,
                padding: spacing[3],
                borderRadius: radius.md,
              }}
            >
              <Icon name="information-circle-outline" size={18} color={t.primary} />
              <Text style={{ flex: 1, color: t.primary, fontSize: fontSize.sm, fontWeight: "600" }}>
                {active > 0
                  ? `Tienes ${active} pedido${active !== 1 ? "s" : ""} en curso. Avanza su estado para que el comprador lo siga en vivo.`
                  : "No tienes pedidos en curso."}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? null : (
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
                {isBuyer ? "Aún no tienes pedidos" : "Aún no tienes ventas"}
              </Text>
              <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm }}>
                {isBuyer
                  ? "Tus pedidos realizados aparecerán aquí con seguimiento en tiempo real."
                  : "Cuando alguien compre tus cosechas, el pedido aparecerá aquí para que lo despaches."}
              </Text>
              {isBuyer ? (
                <Button title="Explorar productos" onPress={() => router.push("/(tabs)/home")} />
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => {
          const status = ORDER_STATUS[item.status];
          const action = !isBuyer ? NEXT_ACTION[item.status] : undefined;
          // El productor ve solo sus líneas del pedido
          const lines = isBuyer
            ? item.items
            : item.items.filter((it) => it.product?.producerId === user?.id);
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

              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }} numberOfLines={2}>
                {lines.map((it) => `${it.quantity} × ${it.product?.name ?? "Producto"}`).join(", ") ||
                  `${item.items.length} producto${item.items.length !== 1 ? "s" : ""}`}
              </Text>

              <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
                {!isBuyer && item.buyer ? `${item.buyer.name} · ` : ""}
                {item.deliveryAddress ? `${item.deliveryAddress.municipio} · ` : ""}
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
                  {formatCOP(isBuyer ? item.total : lines.reduce((acc, it) => acc + it.subtotal, 0))}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ color: t.primary, fontSize: fontSize.sm, fontWeight: "700" }}>
                    {isBuyer ? "Seguimiento" : "Ver detalle"}
                  </Text>
                  <Icon name="arrow-forward" size={14} color={t.primary} />
                </View>
              </View>

              {action ? (
                <Button
                  title={action.label}
                  icon={<Icon name={action.icon} size={18} color={t.onPrimary} />}
                  onPress={() => advance(item)}
                  loading={advancingId === item.id}
                  variant={action.next === "DELIVERED" ? "accent" : "primary"}
                  full
                  style={{ marginTop: spacing[2] }}
                />
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
