import React from "react";
import { RefreshControl, SectionList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { OrderCard } from "../../src/components/OrderCard";
import { formatCOP, radius, spacing, type, useTheme } from "../../src/theme";
import { getImpactMetrics, getMyOrders } from "../../src/api/client";
import type { Order } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { useAdvanceOrder } from "../../src/lib/useAdvanceOrder";
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { PressableScale } from "../../src/components/PressableScale";
import Animated from "react-native-reanimated";
import { useFirstLoadStagger } from "../../src/lib/useFirstLoadStagger";

const isActive = (o: Order) => o.status !== "DELIVERED" && o.status !== "CANCELLED";

/**
 * Pedidos (comprador), Ventas (productor) o Entregas (repartidor), separados
 * en "En curso" y "Anteriores" como en las apps de domicilio.
 */
export default function Orders() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const isBuyer = user?.role === "BUYER";
  const isCourier = user?.role === "COURIER";
  const { advance, advancingId } = useAdvanceOrder();

  const { data = [], isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
    // Los estados cambian desde el otro lado (productor ↔ comprador)
    refetchInterval: 15_000,
  });
  const { data: impact } = useQuery({
    queryKey: ["orders", "impact", user?.id],
    queryFn: getImpactMetrics,
    enabled: !!user && !isCourier,
  });
  const staggerIn = useFirstLoadStagger(data.length > 0);

  const active = data.filter(isActive);
  const past = data.filter((o) => !isActive(o));
  const sections = [
    ...(active.length ? [{ title: isBuyer ? "En curso" : isCourier ? "Por entregar" : "Por atender", data: active }] : []),
    ...(past.length ? [{ title: "Anteriores", data: past }] : []),
  ];
  const title = isBuyer ? "Pedidos" : isCourier ? "Entregas" : "Ventas";
  const totals = impact?.totals;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[10], gap: spacing[3] }}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        ListHeaderComponent={
          <View style={{ paddingTop: spacing[3], gap: spacing[4], marginBottom: spacing[1] }}>
            <Text accessibilityRole="header" style={[type.title, { color: t.textPrimary }]}>
              {title}
            </Text>
            {totals && totals.ordersCount > 0 ? (
              <PressableScale
                onPress={() => router.push("/impacto")}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[3],
                  padding: spacing[4],
                  borderRadius: radius.lg,
                  backgroundColor: t.primaryLight,
                }}
              >
                <Icon name={isBuyer ? "leaf" : "trending-up"} size={20} color={t.onPrimaryLight} />
                <Text style={[type.footnote, { flex: 1, color: t.onPrimaryLight, fontWeight: "500" }]}>
                  {isBuyer ? "Has ahorrado " : "Has recibido "}
                  <Text style={{ fontWeight: "800" }}>{formatCOP(isBuyer ? totals.savings : totals.total)}</Text>
                  {isBuyer ? " frente a la plaza" : " por tus cosechas"}
                </Text>
                <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "700" }]}>{isBuyer ? "Mi impacto" : "Mis ventas"}</Text>
                <Icon name="chevron-forward" size={16} color={t.onPrimaryLight} />
              </PressableScale>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary, marginTop: spacing[3] }]}>
            {section.title} <Text style={{ color: t.textTertiary, fontWeight: "500" }}>({section.data.length})</Text>
          </Text>
        )}
        ListEmptyComponent={
          isLoading ? (
            <LoadingState label={isBuyer ? "Cargando tus pedidos…" : "Cargando tus ventas…"} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
            <View style={{ paddingVertical: spacing[10], alignItems: "center", gap: spacing[3] }}>
              <Icon name="receipt-outline" size={40} color={t.textTertiary} />
              <Text style={[type.headline, { color: t.textPrimary }]}>
                {isBuyer ? "Aún no tienes pedidos" : isCourier ? "No tienes entregas" : "Aún no tienes ventas"}
              </Text>
              <Text style={[type.footnote, { color: t.textSecondary, textAlign: "center", fontWeight: "400" }]}>
                {isBuyer
                  ? "Tus pedidos aparecerán aquí con seguimiento en tiempo real."
                  : isCourier
                    ? "Cuando un productor despache un pedido, la ruta aparecerá aquí."
                    : "Cuando alguien compre tus cosechas, el pedido aparecerá aquí para que lo despaches."}
              </Text>
              {isBuyer ? <Button title="Explorar cosechas" onPress={() => router.push("/(tabs)/home")} /> : null}
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={staggerIn(index)}>
            <OrderCard
              order={item}
              isBuyer={isBuyer}
              userId={user?.id}
              onPress={() => router.push(`/seguimiento/${item.id}`)}
              onAdvance={advance}
              advancing={advancingId === item.id}
            />
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}
