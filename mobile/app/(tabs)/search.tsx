import React, { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { getCategories, getProducts } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";

import { ErrorState, ProductGridSkeleton } from "../../src/components/QueryState";
export default function Search() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ surplus?: string }>();
  const addToCart = useAddToCart();
  const isBuyer = useAuth((s) => s.user?.role === "BUYER");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [surplusOnly, setSurplusOnly] = useState(params.surplus === "true");
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

  // El banner "Ver ofertas" puede abrir esta pestaña ya montada con ?surplus=true
  const [lastSurplusParam, setLastSurplusParam] = useState(params.surplus);
  if (params.surplus !== lastSurplusParam) {
    setLastSurplusParam(params.surplus);
    if (params.surplus === "true") setSurplusOnly(true);
  }

  // Esperar a que el usuario deje de escribir antes de consultar
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data, isLoading, isError, error, isRefetching, refetch } = useQuery({
    queryKey: ["products", "search", debounced, category, surplusOnly, sort],
    queryFn: () =>
      getProducts({
        search: debounced || undefined,
        category: category || undefined,
        surplus: surplusOnly || undefined,
        sort,
        limit: 50,
      }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar title="Buscar productos" />

      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <View style={{ position: "relative", justifyContent: "center" }}>
          <View style={{ position: "absolute", left: 14, zIndex: 1 }}>
            <Icon name="search" size={18} color={t.textTertiary} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar papa criolla, café, fresas..."
            returnKeyType="search"
            autoCorrect={false}
            placeholderTextColor={t.textTertiary}
            style={{
              height: 46,
              paddingLeft: 42,
              paddingRight: spacing[4],
              borderRadius: radius.full,
              backgroundColor: t.bgInput,
              borderWidth: 1.5,
              borderColor: t.border,
              fontSize: 14,
              color: t.textPrimary,
            }}
          />
          {search ? (
            <Pressable
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
              style={{ position: "absolute", right: 0, width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="close-circle" size={18} color={t.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          <Chip icon="sparkles" label="Todo" active={!category && !surplusOnly} onPress={() => { setCategory(null); setSurplusOnly(false); }} />
          <Chip
            icon="sparkles"
            label="Excedente"
            active={surplusOnly}
            onPress={() => setSurplusOnly((s) => !s)}
          />
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {[
            { key: "recent", label: "Más recientes", icon: "time-outline" },
            { key: "price_asc", label: "Menor precio", icon: "trending-down" },
            { key: "price_desc", label: "Mayor precio", icon: "pricetag-outline" },
          ].map((s) => (
            <Chip
              key={s.key}
              icon={s.icon}
              label={s.label}
              active={sort === s.key}
              onPress={() => setSort(s.key as typeof sort)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data?.products || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing[3], paddingHorizontal: spacing[4] }}
        contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[10] }}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <ProductGridSkeleton gutter={spacing[4]} />
          ) : isError ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
          <View style={{ padding: spacing[8], alignItems: "center", gap: spacing[3] }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.full,
                backgroundColor: t.bgInput,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="search-outline" size={32} color={t.textTertiary} />
            </View>
            <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm }}>
              No encontramos cosechas con estos filtros. Prueba quitando alguno.
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
