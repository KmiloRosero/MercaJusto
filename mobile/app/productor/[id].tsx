import React from "react";
import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { ProductCard } from "../../src/components/ProductCard";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, shadow, spacing, useTheme } from "../../src/theme";
import { getUser } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";

import { ErrorState, LoadingState } from "../../src/components/QueryState";
export default function ProducerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const isBuyer = useAuth((s) => s.user?.role === "BUYER");
  const addToCart = useAddToCart();

  const { data: producer, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["producer", id],
    queryFn: () => getUser(id!),
    enabled: !!id });

  if (isLoading || !producer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Productor" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          {error ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
            <LoadingState label="Cargando al productor…" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const products = producer.products ?? [];
  const reviews = producer.reviewsReceived ?? [];
  const initials = producer.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Productor" />

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing[3] }}
        contentContainerStyle={{ padding: spacing[4], gap: spacing[3], paddingBottom: spacing[10] }}
        ListHeaderComponent={
          <View style={{ gap: spacing[4], marginBottom: spacing[2] }}>
            {/* Tarjeta del productor */}
            <View
              style={{
                backgroundColor: t.bgCard,
                borderRadius: radius.xl,
                padding: spacing[5],
                alignItems: "center",
                gap: spacing[2],
                borderWidth: 1,
                borderColor: t.border,
                ...shadow.sm }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: radius.full,
                  backgroundColor: t.primary,
                  alignItems: "center",
                  justifyContent: "center" }}
              >
                <Text style={{ color: t.onPrimary, fontSize: 28, fontWeight: "800" }}>{initials}</Text>
              </View>
              <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary, textAlign: "center" }}>
                {producer.name}
              </Text>
              <Pill variant="primary" icon="storefront">
                Productor campesino
              </Pill>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="star" size={16} color={t.warning} />
                <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, fontWeight: "600" }}>
                  {producer.ratingCount
                    ? `${producer.rating.toFixed(1)} · ${producer.ratingCount} calificaciones`
                    : "Aún sin calificaciones"}
                </Text>
              </View>
              {producer.municipios?.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="location-outline" size={14} color={t.textTertiary} />
                  <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>
                    {producer.municipios.join(" · ")}, Nariño
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Reseñas recientes */}
            {reviews.length > 0 ? (
              <View
                style={{
                  backgroundColor: t.bgCard,
                  borderRadius: radius.lg,
                  padding: spacing[4],
                  gap: spacing[3],
                  borderWidth: 1,
                  borderColor: t.border }}
              >
                <Text style={{ fontSize: 14, fontWeight: "800", color: t.textPrimary }}>Lo que dicen sus clientes</Text>
                {reviews.map((r) => (
                  <View key={r.id} style={{ gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon key={i} name={i < r.rating ? "star" : "star-outline"} size={12} color={t.warning} />
                      ))}
                      <Text style={{ fontSize: fontSize.xs, color: t.textTertiary, marginLeft: 4 }}>
                        {r.fromUser.name.split(" ")[0]}
                      </Text>
                    </View>
                    {r.comment ? (
                      <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>"{r.comment}"</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color: t.textPrimary }}>
              Cosechas disponibles ({products.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={{ color: t.textSecondary, textAlign: "center", padding: spacing[6] }}>
            Este productor no tiene cosechas publicadas en este momento.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "50%" }}>
            <ProductCard
              product={{ ...item, producer: { id: producer.id, name: producer.name, rating: producer.rating } }}
              onPress={() => router.push(`/producto/${item.id}`)}
              onAdd={isBuyer ? () => addToCart(item.id, 1, item.name) : undefined}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
