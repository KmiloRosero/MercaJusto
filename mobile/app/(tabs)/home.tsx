import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { TopBar, SectionHeader } from "../../src/components/TopBar";
import { Banner } from "../../src/components/Banner";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { getCategories, getProducts } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";
import { Button } from "../../src/components/Button";

export default function Home() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const addToCart = useAddToCart();
  const isBuyer = user?.role === "BUYER";
  const isProducer = user?.role === "PRODUCER";
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

  const [category, setCategory] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const {
    data: productsData,
    isLoading: loadingProds,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar
        title="MercaJusto"
        right={
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: t.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: t.primary,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: t.primary }}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </Pressable>
        }
      />

      {/* Ubicación de entrega */}
      <Pressable
        onPress={() => router.push("/(tabs)/profile")}
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: t.bgPrimary,
          borderBottomWidth: 1,
          borderBottomColor: t.border,
        }}
      >
        <Icon name="location" size={16} color={t.primary} />
        <Text style={{ flex: 1, fontSize: fontSize.sm, color: t.textSecondary }} numberOfLines={1}>
          {isProducer ? "Vendiendo desde " : "Entregar en "}
          <Text style={{ color: t.textPrimary, fontWeight: "700" }}>
            {defaultAddress
              ? `${defaultAddress.vereda ? `${defaultAddress.vereda}, ` : ""}${defaultAddress.municipio}`
              : "Nariño"}
          </Text>
        </Text>
        <Icon name="chevron-forward" size={16} color={t.textTertiary} />
      </Pressable>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing[3], paddingHorizontal: spacing[4] }}
        contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[10] }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: spacing[4] }}>
            {isProducer ? (
              <View
                style={{
                  marginHorizontal: spacing[4],
                  marginBottom: spacing[4],
                  padding: spacing[4],
                  borderRadius: radius.lg,
                  backgroundColor: t.primaryLight,
                  gap: spacing[3],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                  <Icon name="mci:sprout" size={22} color={t.primary} />
                  <Text style={{ flex: 1, fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>
                    ¿Tienes cosecha lista?
                  </Text>
                </View>
                <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>
                  Publícala en minutos y véndela directo, sin intermediarios.
                </Text>
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  <Button
                    title="Publicar cosecha"
                    size="sm"
                    icon={<Icon name="add-circle" size={16} color="#FFFFFF" />}
                    onPress={() => router.push("/publicar-cosecha")}
                  />
                  <Button title="Ver mis ventas" size="sm" variant="outline" onPress={() => router.push("/(tabs)/orders")} />
                </View>
              </View>
            ) : null}
            <Banner
              tag="Modo Excedente"
              title="Cosecha que no se pierde"
              subtitle="Productos con descuento directo porque al productor le sobra. Apoya el campo y ahorra."
              cta="Ver ofertas"
              iconName="leaf"
              onCta={() => router.push("/(tabs)/search?surplus=true")}
            />

            {surplus.length > 0 ? (
              <View style={{ marginBottom: spacing[5] }}>
                <SectionHeader
                  title="Excedentes de hoy"
                  action="Ver todo"
                  onAction={() => router.push("/(tabs)/search?surplus=true")}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[3] }}
                >
                  {surplus.map((p) => (
                    <View key={p.id} style={{ width: 160 }}>
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

            <View style={{ marginBottom: spacing[4] }}>
              <SectionHeader title="Categorías" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[2] }}
              >
                <Chip
                  icon="sparkles"
                  label="Todo"
                  active={category === null}
                  onPress={() => setCategory(null)}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    icon={c.name}
                    label={c.name}
                    active={category === c.slug}
                    onPress={() => setCategory(c.slug)}
                  />
                ))}
              </ScrollView>
            </View>

            <SectionHeader
              title={categoryName ?? "Cosechas frescas"}
              action="Ver todo"
              onAction={() => router.push("/(tabs)/search")}
            />
          </View>
        }
        ListEmptyComponent={
          loadingProds ? (
            <View style={{ padding: spacing[8], alignItems: "center" }}>
              <ActivityIndicator color={t.primary} size="large" />
              <Text style={{ color: t.textSecondary, marginTop: spacing[3], fontWeight: "500" }}>
                Cargando productos del campo...
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing[8], alignItems: "center", gap: spacing[3] }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.full,
                  backgroundColor: t.bgSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="leaf-outline" size={32} color={t.textTertiary} />
              </View>
              <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm }}>
                No hay productos disponibles en esta categoría.{"\n"}Sé el primero en publicar una cosecha.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "48%" }}>
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
