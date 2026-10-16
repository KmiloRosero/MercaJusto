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
import { OrderCard } from "../../src/components/OrderCard";
import { Icon } from "../../src/components/Icon";
import { Button } from "../../src/components/Button";
import { radius, spacing, type, useTheme } from "../../src/theme";
import { getCategories, getMyOrders, getProducts } from "../../src/api/client";
import type { Address } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";
import { useAdvanceOrder } from "../../src/lib/useAdvanceOrder";

import { ErrorState, LoadingState, ProductGridSkeleton } from "../../src/components/QueryState";
import { PressableScale } from "../../src/components/PressableScale";
import Animated from "react-native-reanimated";
import { useFirstLoadStagger } from "../../src/lib/useFirstLoadStagger";
import { Avatar } from "../../src/components/Avatar";
const GUTTER = spacing[5];
const CAROUSEL_CARD = 152;
/** Pedidos del inicio del productor; el resto queda en la pestaña Ventas. */
const HOME_ORDERS = 3;

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function placeOf(address?: Address) {
  return address ? `${address.vereda ? `${address.vereda}, ` : ""}${address.municipio}` : "Nariño";
}

/** El productor trabaja desde su propio inicio; comprador y repartidor ven el catálogo. */
export default function Home() {
  const isProducer = useAuth((s) => s.user?.role === "PRODUCER");
  return isProducer ? <ProducerHome /> : <BuyerHome />;
}

/** Saludo, lugar y acceso al perfil: la primera línea de ambos inicios. */
function GreetingRow({ placeLabel, place }: { placeLabel: string; place: string }) {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
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
          accessibilityLabel={`${placeLabel} ${place}. Cambiar`}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="location" size={16} color={t.primary} />
          <Text style={[type.headline, { color: t.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
            {place}
          </Text>
          <Icon name="chevron-down" size={16} color={t.textSecondary} />
        </Pressable>
      </View>
      <PressableScale
        scaleTo={0.95}
        onPress={() => router.push("/(tabs)/profile")}
        accessibilityRole="button"
        accessibilityLabel="Mi perfil"
        style={{ borderRadius: radius.full }}
      >
        <Avatar name={user?.name} size={48} />
      </PressableScale>
    </View>
  );
}

function BuyerHome() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const addToCart = useAddToCart();
  const isBuyer = user?.role === "BUYER";
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

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
  const staggerIn = useFirstLoadStagger(products.length > 0);
  const surplus = surplusData?.products || [];
  const categoryName = categories.find((c) => c.slug === category)?.name;

  const header = (
    <View style={{ gap: spacing[6], paddingBottom: spacing[4] }}>
      {/* Saludo + ubicación + avatar */}
      <View style={{ paddingHorizontal: GUTTER, paddingTop: spacing[2], gap: spacing[4] }}>
        <GreetingRow placeLabel="Entregar en" place={placeOf(defaultAddress)} />

        {/* Acceso a búsqueda */}
        <PressableScale
          onPress={() => router.push("/(tabs)/search")}
          accessibilityRole="search"
          style={{
            height: 50,
            borderRadius: radius.md + 2,
            backgroundColor: t.bgSecondary,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingHorizontal: spacing[4],
          }}
        >
          <Icon name="search" size={18} color={t.textSecondary} />
          <Text style={[type.body, { color: t.textTertiary, flex: 1 }]} numberOfLines={1}>
            Busca papa, café, fresas…
          </Text>
        </PressableScale>
      </View>

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
            snapToInterval={CAROUSEL_CARD + spacing[3]}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {surplus.map((p) => (
              <View key={p.id} style={{ width: CAROUSEL_CARD }}>
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
        renderItem={({ item, index }) => (
          <Animated.View entering={staggerIn(index)} style={{ flex: 1, maxWidth: "50%" }}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/producto/${item.id}`)}
              onAdd={isBuyer ? () => addToCart(item.id, 1, item.name) : undefined}
            />
          </Animated.View>
        )}
      />
    </SafeAreaView>
  );
}

/**
 * Inicio del productor: publicar es lo primero, luego lo que hay que despachar
 * y lo que ya está a la venta. Una decisión por bloque, para usarlo desde el campo.
 */
function ProducerHome() {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);
  const { advance, advancingId } = useAdvanceOrder();
  const farm =
    user?.addresses?.find((a) => a.label === "Finca") ??
    user?.addresses?.find((a) => a.isDefault) ??
    user?.addresses?.[0];

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: getMyOrders,
    // El comprador crea pedidos desde el otro lado
    refetchInterval: 15_000,
  });

  const products = useQuery({
    queryKey: ["products", "producer", user?.id],
    queryFn: () => getProducts({ producerId: user!.id, limit: 20 }),
    enabled: !!user?.id,
  });

  const pending = (orders.data ?? []).filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const listed = products.data?.products ?? [];
  const refreshing = orders.isRefetching || products.isRefetching;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ gap: spacing[8], paddingTop: spacing[2], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              orders.refetch();
              products.refetch();
            }}
            tintColor={t.primary}
          />
        }
      >
        <View style={{ paddingHorizontal: GUTTER, gap: spacing[6] }}>
          <GreetingRow placeLabel="Vendiendo desde" place={placeOf(farm)} />

          {/* Acción principal: publicar */}
          <View style={{ gap: spacing[3] }}>
            <View style={{ gap: spacing[1] }}>
              <Text style={[type.title, { color: t.textPrimary }]} accessibilityRole="header">
                ¿Tienes cosecha lista?
              </Text>
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                Publícala en minutos y véndela directo, sin intermediarios.
              </Text>
            </View>
            <Button
              title="Publicar cosecha"
              size="lg"
              full
              icon={<Icon name="add" size={20} color={t.onPrimary} />}
              onPress={() => router.push("/publicar-cosecha")}
            />
          </View>
        </View>

        {/* Pedidos por atender */}
        <View>
          <SectionHeader
            title={pending.length > 0 ? `Pedidos por atender (${pending.length})` : "Pedidos por atender"}
            action={(orders.data?.length ?? 0) > 0 ? "Ver ventas" : undefined}
            onAction={() => router.push("/(tabs)/orders")}
          />
          <View style={{ paddingHorizontal: GUTTER, gap: spacing[3] }}>
            {orders.isLoading ? (
              <LoadingState label="Cargando tus ventas…" />
            ) : orders.isError ? (
              <ErrorState error={orders.error} onRetry={() => orders.refetch()} retrying={orders.isRefetching} />
            ) : pending.length === 0 ? (
              <HomeNote
                icon="receipt-outline"
                title="No tienes pedidos por atender"
                body="Cuando alguien compre tu cosecha, el pedido aparecerá aquí para que lo prepares y lo despaches."
              />
            ) : (
              <>
                {pending.slice(0, HOME_ORDERS).map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    isBuyer={false}
                    userId={user?.id}
                    onPress={() => router.push(`/seguimiento/${o.id}`)}
                    onAdvance={advance}
                    advancing={advancingId === o.id}
                  />
                ))}
                {pending.length > HOME_ORDERS ? (
                  <Button
                    title={`Ver los ${pending.length} pedidos`}
                    variant="outline"
                    full
                    onPress={() => router.push("/(tabs)/orders")}
                  />
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* Cosechas publicadas */}
        <View>
          <SectionHeader
            title={listed.length > 0 ? `Tus cosechas a la venta (${listed.length})` : "Tus cosechas a la venta"}
          />
          {products.isLoading ? (
            <LoadingState label="Cargando tus cosechas…" />
          ) : products.isError ? (
            <ErrorState error={products.error} onRetry={() => products.refetch()} retrying={products.isRefetching} />
          ) : listed.length === 0 ? (
            <View style={{ paddingHorizontal: GUTTER }}>
              <HomeNote
                icon="leaf-outline"
                title="Aún no tienes cosechas publicadas"
                body="Publica la primera y aparecerá en el catálogo para los compradores."
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={CAROUSEL_CARD + spacing[3]}
              contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
            >
              {listed.map((p) => (
                <View key={p.id} style={{ width: CAROUSEL_CARD }}>
                  <ProductCard product={p} onPress={() => router.push(`/producto/${p.id}`)} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Estado vacío corto dentro de una sección del inicio. */
function HomeNote({ icon, title, body }: { icon: "receipt-outline" | "leaf-outline"; title: string; body: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radius.lg,
        backgroundColor: t.bgSecondary,
      }}
    >
      <Icon name={icon} size={22} color={t.textSecondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.callout, { color: t.textPrimary }]}>{title}</Text>
        <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>{body}</Text>
      </View>
    </View>
  );
}
