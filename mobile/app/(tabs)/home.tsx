import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { SectionHeader } from "../../src/components/TopBar";
import { Banner } from "../../src/components/Banner";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
import { Button } from "../../src/components/Button";
import { radius, spacing, type, useTheme } from "../../src/theme";
import { getCategories, getProducts } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";

import { ErrorState, ProductGridSkeleton } from "../../src/components/QueryState";
const GUTTER = spacing[5];

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Home() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const addToCart = useAddToCart();
  const isBuyer = user?.role === "BUYER";
  const isProducer = user?.role === "PRODUCER";
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];
  const firstName = user?.name?.split(" ")[0] ?? "";

  const [category, setCategory] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const {
    data: productsData,
    isLoading: loadingProds,
    isError: productsFailed,
    error: productsError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["products", "home", category],
    queryFn: () => getProducts({ category: category || undefined, limit: 20 }),
  });

  const { data: surplusData } = useQuery({
    queryKey: ["products", "surplus"],
    queryFn: () => getProducts({ surplus: true, limit: 6 }),
  });

  const products = productsData?.products || [];
  const surplus = surplusData?.products || [];
  const categoryName = categories.find((c) => c.slug === category)?.name;
  const place = defaultAddress
    ? `${defaultAddress.vereda ? `${defaultAddress.vereda}, ` : ""}${defaultAddress.municipio}`
    : "Nariño";

  const header = (
    <View style={{ gap: spacing[6], paddingBottom: spacing[4] }}>
      {/* Saludo + ubicación + avatar */}
      <View style={{ paddingHorizontal: GUTTER, paddingTop: spacing[2], gap: spacing[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.footnote, { color: t.textSecondary }]}>
              {greeting()}
              {firstName ? `, ${firstName}` : ""}
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`${isProducer ? "Vendiendo desde" : "Entregar en"} ${place}. Cambiar`}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 })}
            >
              <Icon name="location" size={16} color={t.primary} />
              <Text style={[type.headline, { color: t.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                {place}
              </Text>
              <Icon name="chevron-down" size={16} color={t.textSecondary} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            accessibilityRole="button"
            accessibilityLabel="Mi perfil"
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: t.onPrimary, fontSize: 17, fontWeight: "700" }}>
              {user?.name?.charAt(0).toUpperCase() || "M"}
            </Text>
          </Pressable>
        </View>

        {/* Acceso a búsqueda */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          accessibilityRole="search"
          style={({ pressed }) => ({
            height: 50,
            borderRadius: radius.md + 2,
            backgroundColor: t.bgSecondary,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingHorizontal: spacing[4],
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Icon name="search" size={18} color={t.textSecondary} />
          <Text style={[type.body, { color: t.textTertiary, flex: 1 }]} numberOfLines={1}>
            Busca papa, café, fresas…
          </Text>
        </Pressable>
      </View>

      {/* Productor: atajo a publicar y a sus ventas */}
      {isProducer ? (
        <View
          style={{
            marginHorizontal: GUTTER,
            padding: spacing[5],
            borderRadius: radius.xl + 4,
            backgroundColor: t.primaryLight,
            gap: spacing[3],
          }}
        >
          <View style={{ gap: spacing[1] }}>
            <Text style={[type.headline, { color: t.textPrimary }]}>¿Tienes cosecha lista?</Text>
            <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
              Publícala en minutos y véndela directo, sin intermediarios.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Button
              title="Publicar cosecha"
              size="sm"
              icon={<Icon name="add" size={16} color={t.onPrimary} />}
              onPress={() => router.push("/publicar-cosecha")}
            />
            <Button title="Mis ventas" size="sm" variant="outline" onPress={() => router.push("/(tabs)/orders")} />
          </View>
        </View>
      ) : null}

      <Banner
        title="Cosecha que no se pierde"
        subtitle="Descuentos directos cuando al productor le sobra. Apoyas el campo y ahorras."
        cta="Ver ofertas"
        iconName="leaf"
        onCta={() => router.push("/(tabs)/search?surplus=true")}
      />

      {surplus.length > 0 ? (
        <View>
          <SectionHeader
            title="Excedentes de hoy"
            action="Ver todo"
            onAction={() => router.push("/(tabs)/search?surplus=true")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={152 + spacing[3]}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {surplus.map((p) => (
              <View key={p.id} style={{ width: 152 }}>
                <ProductCard
                  product={p}
                  onPress={() => router.push(`/producto/${p.id}`)}
                  onAdd={isBuyer ? () => addToCart(p.id, 1, p.name) : undefined}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View>
        <SectionHeader
          title={categoryName ?? "Cosechas frescas"}
          action="Buscar"
          onAction={() => router.push("/(tabs)/search")}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[2] }}
        >
          <Chip icon="apps" label="Todo" active={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              icon={c.name}
              label={c.name}
              active={category === c.slug}
              onPress={() => setCategory((cur) => (cur === c.slug ? null : c.slug))}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing[4], paddingHorizontal: GUTTER }}
        contentContainerStyle={{ gap: spacing[6], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loadingProds ? (
            <ProductGridSkeleton gutter={GUTTER} />
          ) : productsFailed ? (
            <ErrorState error={productsError} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
            <View style={{ paddingHorizontal: GUTTER * 2, paddingVertical: spacing[8], alignItems: "center", gap: spacing[2] }}>
              <Icon name="leaf-outline" size={28} color={t.textTertiary} />
              <Text style={[type.callout, { color: t.textPrimary, textAlign: "center" }]}>
                Aún no hay cosechas en {categoryName ?? "el catálogo"}
              </Text>
              <Text style={[type.footnote, { color: t.textSecondary, textAlign: "center", fontWeight: "400" }]}>
                Prueba otra categoría o vuelve más tarde: los productores publican a diario.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "50%" }}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/producto/${item.id}`)}
              onAdd={isBuyer ? () => addToCart(item.id, 1, item.name) : undefined}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
