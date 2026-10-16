import React from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { OrderCard } from "../../src/components/OrderCard";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { getMyOrders } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAdvanceOrder } from "../../src/lib/useAdvanceOrder";
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import Animated from "react-native-reanimated";
import { useFirstLoadStagger } from "../../src/lib/useFirstLoadStagger";

export default function Orders() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const isBuyer = user?.role === "BUYER";
  const { advance, advancingId } = useAdvanceOrder();

  const { data = [], isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
    // Los estados cambian desde el otro lado (productor ↔ comprador)
    refetchInterval: 15_000,
  });
  const staggerIn = useFirstLoadStagger(data.length > 0);

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
          isLoading ? (
            <LoadingState label={isBuyer ? "Cargando tus pedidos…" : "Cargando tus ventas…"} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
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
