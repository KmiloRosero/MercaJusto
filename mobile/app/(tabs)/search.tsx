import React, { useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { fontSize, radius, spacing, useTheme } from "../../src/theme";
import { getCategories, getProducts } from "../../src/api/client";
import { useCart } from "../../src/store/cart";

export default function Search() {
  const router = useRouter();
  const t = useTheme();
  const params = useLocalSearchParams<{ surplus?: string }>();
  const addToCart = useCart((s) => s.add);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [surplusOnly, setSurplusOnly] = useState(params.surplus === "true");
  const [sort, setSort] = useState<"recent" | "price_asc" | "price_desc">("recent");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["products", "search", search, category, surplusOnly, sort],
    queryFn: () =>
      getProducts({
        search: search || undefined,
        category: category || undefined,
        surplus: surplusOnly || undefined,
        sort,
        limit: 50,
      }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Buscar productos" />

      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar papa, café, huevos..."
          placeholderTextColor={t.textTertiary}
          style={{
            height: 44,
            paddingHorizontal: spacing[4],
            borderRadius: radius.full,
            backgroundColor: t.bgInput,
            borderWidth: 1.5,
            borderColor: t.border,
            fontSize: 14,
            color: t.textPrimary,
          }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          <Chip icon="🌟" label="Todo" active={!category} onPress={() => setCategory(null)} />
          <Chip
            icon="🔥"
            label="Excedente"
            active={surplusOnly}
            onPress={() => setSurplusOnly((s) => !s)}
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {[
            { key: "recent", label: "Más recientes" },
            { key: "price_asc", label: "Precio ↑" },
            { key: "price_desc", label: "Precio ↓" },
          ].map((s) => (
            <Chip
              key={s.key}
              icon="↕️"
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
        refreshing={isFetching}
        onRefresh={() => {}}
        ListEmptyComponent={
          <View style={{ padding: spacing[8], alignItems: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: spacing[2] }}>🔍</Text>
            <Text style={{ color: t.textSecondary, textAlign: "center" }}>
              No encontramos productos con esos filtros.
            </Text>
          </View>
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
