import React, { useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Chip } from "../../src/components/Chip";
import { ProductCard } from "../../src/components/ProductCard";
import { Icon } from "../../src/components/Icon";
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
        <View style={{ position: "relative", justifyContent: "center" }}>
          <View style={{ position: "absolute", left: 14, zIndex: 1 }}>
            <Icon name="search" size={18} color={t.textTertiary} />
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar papa criolla, café, fresas..."
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
        refreshing={isFetching}
        onRefresh={() => {}}
        ListEmptyComponent={
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
              <Icon name="search-outline" size={32} color={t.textTertiary} />
            </View>
            <Text style={{ color: t.textSecondary, textAlign: "center", fontSize: fontSize.sm }}>
              No se encontraron productos con estos criterios.
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
