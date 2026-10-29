import React, { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, type, useTheme } from "../../src/theme";
import { CartBar } from "../../src/components/CartBar";
import { getCategories, getProducts } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";

import { ErrorState, ProductGridSkeleton } from "../../src/components/QueryState";
import { PageShader } from "../../src/components/PageShader";
export default function Search() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ surplus?: string; category?: string }>();
  const isBuyer = useAuth((s) => s.user?.role === "BUYER");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [surplusOnly, setSurplusOnly] = useState(params.surplus === "true");
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

  // El inicio puede abrir esta pestaña ya montada con ?surplus=true o ?category=slug
  const [lastSurplusParam, setLastSurplusParam] = useState(params.surplus);
  if (params.surplus !== lastSurplusParam) {
    setLastSurplusParam(params.surplus);
    if (params.surplus === "true") {
      setSurplusOnly(true);
      setCategory(null);
    }
  }
  const [lastCategoryParam, setLastCategoryParam] = useState(params.category);
  if (params.category !== lastCategoryParam) {
    setLastCategoryParam(params.category);
    if (params.category) {
      setCategory(params.category);
      setSurplusOnly(false);
    }
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
      <PageShader />
      <View style={{ paddingTop: spacing[3], paddingBottom: spacing[3], gap: spacing[3] }}>
        <Text accessibilityRole="header" style={[type.title, { color: t.textPrimary, paddingHorizontal: spacing[4] }]}>
          Buscar
        </Text>
        <View style={{ position: "relative", justifyContent: "center", marginHorizontal: spacing[4] }}>
          <View style={{ position: "absolute", left: 18, zIndex: 1 }}>
            <Icon name="search" size={20} color={t.textPrimary} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Papa criolla, café, fresas…"
            returnKeyType="search"
            autoCorrect={false}
            placeholderTextColor={t.textTertiary}
            style={{
              height: 50,
              paddingLeft: 48,
              paddingRight: 44,
              borderRadius: radius.full,
              backgroundColor: t.bgInput,
              fontSize: 16,
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
              <Icon name="close-circle" size={20} color={t.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], paddingHorizontal: spacing[4] }}
        >
          <Chip icon="grid-outline" label="Todo" active={!category && !surplusOnly} onPress={() => { setCategory(null); setSurplusOnly(false); }} />
          <Chip
            icon="leaf-outline"
            label="Excedente"
            active={surplusOnly}
            onPress={() => setSurplusOnly((s) => !s)}
          />
          {/* La categoría elegida va primero, para que se vea qué filtra la lista. */}
          {[...categories].sort((a, b) => Number(b.slug === category) - Number(a.slug === category)).map((c) => (
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
          contentContainerStyle={{ gap: spacing[2], paddingHorizontal: spacing[4] }}
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
        columnWrapperStyle={{ gap: spacing[4], paddingHorizontal: spacing[4] }}
        contentContainerStyle={{ gap: spacing[6], paddingTop: spacing[2], paddingBottom: spacing[10] + 72 }}
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
            <ProductCard product={item} canAdd={isBuyer} onPress={() => router.push(`/producto/${item.id}`)} />
          </View>
        )}
      />
      <CartBar overTabs />
    </SafeAreaView>
  );
}
