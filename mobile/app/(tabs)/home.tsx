import React, { useEffect, useState } from "react";
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
import { Pill } from "../../src/components/Pill";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { getCategories, getProducts } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useCart } from "../../src/store/cart";

export default function Home() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const addToCart = useCart((s) => s.add);

  const [category, setCategory] = useState<string | null>(null);

  const { data: categories = [], isLoading: loadingCats } = useQuery({
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

  useEffect(() => {
    useCart.getState().fetch();
  }, []);

  const products = productsData?.products || [];
  const surplus = surplusData?.products || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar
        title="MercaJusto"
        right={
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.full,
              backgroundColor: t.gray200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </Pressable>
        }
      />

      {/* Location bar */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: t.bgPrimary,
        }}
      >
        <Text style={{ fontSize: 14 }}>📍</Text>
        <Text style={{ flex: 1, fontSize: fontSize.sm, color: t.textSecondary }}>
          Entregar en <Text style={{ color: t.textPrimary, fontWeight: "600" }}>Pasto, Nariño</Text>
        </Text>
        <Text style={{ fontSize: 12, color: t.textTertiary }}>▼</Text>
      </View>

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
          <View>
            <Banner
              tag="Modo Excedente"
              title="Cosecha que no se pierde"
              subtitle="Productos con descuento porque al productor le sobra. Cómelos frescos y evita el desperdicio."
              cta="Ver ofertas"
              graphic="🌽"
              onCta={() => router.push("/(tabs)/search?surplus=true")}
            />

            {surplus.length > 0 ? (
              <View style={{ marginBottom: spacing[5] }}>
                <SectionHeader title="🔥 Excedentes de hoy" action="Ver todo" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[3] }}
                >
                  {surplus.map((p) => (
                    <View key={p.id} style={{ width: 150 }}>
                      <ProductCard
                        product={p}
                        onPress={() => router.push(`/producto/${p.id}`)}
                        onAdd={() => addToCart(p.id, 1)}
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
                  icon="🌟"
                  label="Todo"
                  active={category === null}
                  onPress={() => setCategory(null)}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    icon={c.icon}
                    label={c.name}
                    active={category === c.slug}
                    onPress={() => setCategory(c.slug)}
                  />
                ))}
              </ScrollView>
            </View>

            <SectionHeader
              title={category ? `Productos: ${category}` : "Cosechas frescas"}
              action="Ver todo"
              onAction={() => router.push("/(tabs)/search")}
            />
          </View>
        }
        ListEmptyComponent={
          loadingProds ? (
            <View style={{ padding: spacing[8], alignItems: "center" }}>
              <ActivityIndicator color={t.primary} />
              <Text style={{ color: t.textSecondary, marginTop: spacing[2] }}>
                Cargando productos...
              </Text>
            </View>
          ) : (
            <View style={{ padding: spacing[8], alignItems: "center", gap: spacing[2] }}>
              <Text style={{ fontSize: 48 }}>🌾</Text>
              <Text style={{ color: t.textSecondary, textAlign: "center" }}>
                No hay productos en esta categoría.{"\n"}¿Quieres ser el primero en publicar?
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "48%" }}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/producto/${item.id}`)}
              onAdd={() => addToCart(item.id, 1)}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
