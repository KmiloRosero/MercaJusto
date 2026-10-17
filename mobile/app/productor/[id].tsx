import React from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { TopBar } from "../../src/components/TopBar";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
import { radius, spacing, type, useTheme, useThemeScheme } from "../../src/theme";
import { getUser } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { BASE_DELIVERY_FEE } from "../../src/lib/pricing";

import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { Avatar } from "../../src/components/Avatar";
import { PressableScale } from "../../src/components/PressableScale";
import { CartBar } from "../../src/components/CartBar";
import { DeliveryFeeLabel } from "../../src/components/HomeBlocks";

const GUTTER = spacing[5];
const COVER = 150;
const AVATAR = 84;

/** Página del productor, armada como la página de una tienda. */
export default function ProducerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const dark = useThemeScheme() === "dark";
  const insets = useSafeAreaInsets();
  const isBuyer = useAuth((s) => s.user?.role === "BUYER");

  const { data: producer, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["producer", id],
    queryFn: () => getUser(id!),
    enabled: !!id,
  });

  if (isLoading || !producer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
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
  const coverGround = dark ? t.primaryLight : t.primary;
  const coverInk = dark ? t.onPrimaryLight : t.onPrimary;

  const header = (
    <View style={{ gap: spacing[6], marginBottom: -spacing[3] }}>
      {/* Portada en verde campo, con la hoja de marca de agua */}
      <View style={{ height: COVER + insets.top, backgroundColor: coverGround, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -30, bottom: -40, opacity: 0.18 }}>
          <Icon name="leaf" size={200} color={coverInk} />
        </View>
      </View>

      <View style={{ marginTop: -AVATAR / 2 - spacing[6], paddingHorizontal: GUTTER, gap: spacing[3] }}>
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: radius.full,
            borderWidth: 4,
            borderColor: t.bgPrimary,
          }}
        >
          <Avatar name={producer.name} size={AVATAR} />
        </View>
        <View style={{ gap: 4 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: t.textPrimary }}
          >
            {producer.name}
          </Text>
          <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
            Productor campesino
            {producer.municipios?.length ? ` · ${producer.municipios.join(", ")}, Nariño` : ""}
          </Text>
        </View>

        {/* Datos de la "tienda" en una fila, como las apps de domicilio */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: spacing[4],
            paddingVertical: spacing[3],
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: t.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="star" size={15} color={t.rating} />
            <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "700" }]}>
              {producer.ratingCount ? producer.rating.toFixed(1) : "Nuevo"}
            </Text>
            {producer.ratingCount ? (
              <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
                ({producer.ratingCount})
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="leaf-outline" size={15} color={t.textSecondary} />
            <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "500" }]}>
              {products.length} cosecha{products.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <DeliveryFeeLabel fee={BASE_DELIVERY_FEE} />
        </View>
      </View>

      {reviews.length > 0 ? (
        <View style={{ gap: spacing[3] }}>
          <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary, paddingHorizontal: GUTTER }]}>
            Lo que dicen sus clientes
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {reviews.map((r) => (
              <View
                key={r.id}
                style={{
                  width: 240,
                  padding: spacing[4],
                  borderRadius: radius.lg,
                  backgroundColor: t.bgInput,
                  gap: spacing[2],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon key={i} name={i < r.rating ? "star" : "star-outline"} size={14} color={t.rating} />
                  ))}
                  <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "600", marginLeft: 6 }]}>
                    {r.fromUser.name.split(" ")[0]}
                  </Text>
                </View>
                <Text numberOfLines={3} style={[type.footnote, { color: t.textPrimary, fontWeight: "400" }]}>
                  {r.comment ? `“${r.comment}”` : "Calificó sin comentario."}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary, paddingHorizontal: GUTTER }]}>
        Cosechas disponibles
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      {/* Texto claro sobre la portada verde */}
      <StatusBar style="light" />
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing[4], paddingHorizontal: GUTTER }}
        contentContainerStyle={{ gap: spacing[6], paddingBottom: spacing[10] + 72 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={[type.footnote, { color: t.textSecondary, textAlign: "center", padding: spacing[6], fontWeight: "400" }]}>
            Este productor no tiene cosechas publicadas en este momento.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "50%" }}>
            <ProductCard
              product={{
                ...item,
                producer: { id: producer.id, name: producer.name, rating: producer.rating, ratingCount: producer.ratingCount },
              }}
              canAdd={isBuyer}
              onPress={() => router.push(`/producto/${item.id}`)}
            />
          </View>
        )}
      />

      <PressableScale
        scaleTo={0.92}
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={4}
        style={{
          position: "absolute",
          top: insets.top + spacing[2],
          left: spacing[4],
          width: 44,
          height: 44,
          borderRadius: radius.full,
          backgroundColor: t.bgCard,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <Icon name="arrow-back" size={22} color={t.textPrimary} />
      </PressableScale>

      <CartBar />
    </View>
  );
}
