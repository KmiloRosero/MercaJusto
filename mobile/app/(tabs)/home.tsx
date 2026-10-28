import React from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionHeader } from "../../src/components/TopBar";
import { CategoryCircles, ProducerCard, ProducerTile, Promo, PromoCarousel } from "../../src/components/HomeBlocks";
import { CartBar } from "../../src/components/CartBar";
import { CourierHome } from "../../src/components/CourierHome";
import { HeroHarvest } from "../../src/components/HeroHarvest";
import { RescueHero } from "../../src/components/RescueHero";
import { ProductCard } from "../../src/components/ProductCard";
import { OrderCard } from "../../src/components/OrderCard";
import { Icon } from "../../src/components/Icon";
import { Button } from "../../src/components/Button";
import { formatCOP, radius, spacing, type, useTheme } from "../../src/theme";
import { BASE_DELIVERY_FEE } from "../../src/lib/pricing";
import { getCategories, getImpactMetrics, getMyOrders, getProducts, getRescueProducts } from "../../src/api/client";
import type { Address, Product } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { useAdvanceOrder } from "../../src/lib/useAdvanceOrder";
import { usePublishQueue } from "../../src/store/publishQueue";
import { toast } from "../../src/store/toast";

import { ErrorState, LoadingState, ProductGridSkeleton } from "../../src/components/QueryState";
import { PressableScale } from "../../src/components/PressableScale";
import Animated from "react-native-reanimated";
import { useFirstLoadStagger } from "../../src/lib/useFirstLoadStagger";
import { Avatar } from "../../src/components/Avatar";
const GUTTER = spacing[5];
const CAROUSEL_CARD = 152;
/** Espacio al final de las listas para que la barra "Ver canasta" no tape nada. */
const CART_BAR_SPACE = 72;
/**
 * Fotos de prueba de los anuncios (Unsplash, licencia libre). Son ilustrativas:
 * no son productores de MercaJusto. Reemplazar por fotos propias antes de publicar.
 * Tamaño pedido a la medida de la tarjeta, para no gastar datos con mala señal.
 */
const PROMO_PHOTOS = {
  // Canasta de verduras recién cosechadas (Bade Saba)
  surplus: "https://images.unsplash.com/photo-1752917680382-3ac274d84103?w=600&q=70&auto=format&fit=crop",
  // Campesino con sombrero en su cultivo (Jason Hu)
  direct: "https://images.unsplash.com/photo-1780359397833-b50a6ed288d8?w=600&q=70&auto=format&fit=crop",
  // Cosecha en canastas de plaza
  delivery: "https://images.unsplash.com/photo-1599660869952-3852916ff82b?w=600&q=70&auto=format&fit=crop",
};

/** Pedidos del inicio del productor; el resto queda en la pestaña Ventas. */
const HOME_ORDERS = 3;

function placeOf(address?: Address) {
  return address ? `${address.vereda ? `${address.vereda}, ` : ""}${address.municipio}` : "Nariño";
}

/** Cada rol tiene su inicio: el comprador el catálogo, el productor sus ventas y el repartidor su ruta. */
export default function Home() {
  const role = useAuth((s) => s.user?.role);
  if (role === "PRODUCER") return <ProducerHome />;
  if (role === "COURIER") return <CourierHome />;
  return <BuyerHome />;
}

/** Saludo, lugar y acceso al perfil: la primera línea de ambos inicios. */
function GreetingRow({ placeLabel, place }: { placeLabel: string; place: string }) {
  const router = useRouter();
  const t = useTheme();
  const user = useAuth((s) => s.user);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.footnote, { color: t.textSecondary }]}>{placeLabel}</Text>
        {/* Solo informa: la dirección se elige al pagar, no hay "predeterminada" que cambiar aquí. */}
        <View
          accessible
          accessibilityLabel={`${placeLabel} ${place}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Icon name="location" size={16} color={t.primary} />
          <Text style={[type.headline, { color: t.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
            {place}
          </Text>
        </View>
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
  const { width: screenWidth } = useWindowDimensions();
  const heroWidth = Math.min(screenWidth - GUTTER * 2, 560);
  const user = useAuth((s) => s.user);
  const isBuyer = user?.role === "BUYER";
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) ?? user?.addresses?.[0];

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
    queryKey: ["products", "home"],
    queryFn: () => getProducts({ limit: 30 }),
  });

  const { data: surplusData } = useQuery({
    queryKey: ["products", "surplus"],
    queryFn: () => getProducts({ surplus: true, limit: 8 }),
  });

  // Lo que se pierde primero. Se refresca seguido: otros compradores también rescatan.
  const { data: rescue = [] } = useQuery({
    queryKey: ["products", "rescue"],
    queryFn: getRescueProducts,
    refetchInterval: 30_000,
  });

  const products = productsData?.products || [];
  const staggerIn = useFirstLoadStagger(products.length > 0);
  const surplus = surplusData?.products || [];
  const producers = producersFrom(products);
  const fresh = freshHarvests(products);
  const topDiscount = surplus.reduce((max, p) => Math.max(max, p.discountPct), 0);

  const openSurplus = () => router.push("/(tabs)/search?surplus=true");

  // Solo afirmaciones que la app cumple: el descuento sale de los excedentes reales.
  const promos: Promo[] = [
    {
      key: "surplus",
      title: "Cosecha que no se pierde",
      body:
        topDiscount > 0
          ? `Excedentes de hoy con hasta ${topDiscount}% de descuento.`
          : "Descuentos cuando al productor le sobra cosecha.",
      cta: "Ver ofertas",
      icon: "leaf",
      tone: "accent",
      image: PROMO_PHOTOS.surplus,
      onPress: openSurplus,
    },
    {
      key: "direct",
      title: "Directo del campesino",
      body: "Sabes quién cultivó tu comida y en qué municipio.",
      cta: "Ver cosechas",
      icon: "mci:account-cowboy-hat",
      tone: "primary",
      image: PROMO_PHOTOS.direct,
      onPress: () => router.push("/(tabs)/search"),
    },
    {
      key: "delivery",
      title: `Un solo envío de ${formatCOP(BASE_DELIVERY_FEE)}`,
      body: "Aunque compres a varios productores, el envío va agrupado.",
      cta: "Empezar a comprar",
      icon: "mci:truck-delivery",
      tone: "field",
      image: PROMO_PHOTOS.delivery,
      onPress: () => router.push("/(tabs)/search"),
    },
  ];

  const header = (
    <View style={{ gap: spacing[6] }}>
      <View style={{ paddingHorizontal: GUTTER, paddingTop: spacing[2], gap: spacing[4] }}>
        <GreetingRow placeLabel="Entregar en" place={placeOf(defaultAddress)} />

        <PressableScale
          onPress={() => router.push("/(tabs)/search")}
          accessibilityRole="search"
          style={{
            height: 50,
            borderRadius: radius.full,
            backgroundColor: t.bgInput,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingHorizontal: spacing[5],
          }}
        >
          <Icon name="search" size={20} color={t.textPrimary} />
          <Text style={[type.body, { color: t.textTertiary, flex: 1 }]} numberOfLines={1}>
            ¿Qué buscas del campo hoy?
          </Text>
        </PressableScale>
      </View>

      {/* Cuadro principal: el excedente que se pierde primero; si no hay, la cosecha de Nariño en 3D */}
      <View style={{ paddingHorizontal: GUTTER, marginTop: -spacing[2], alignSelf: "center", width: heroWidth + GUTTER * 2 }}>
        {rescue.length > 0 ? (
          <RescueHero products={rescue} canAdd={isBuyer} onOpen={(id) => router.push(`/producto/${id}`)} />
        ) : (
          <HeroHarvest width={heroWidth} onPress={() => router.push("/(tabs)/search")} />
        )}
      </View>

      <CategoryCircles
        categories={categories}
        onSurplus={openSurplus}
        onCategory={(slug) => router.push(`/(tabs)/search?category=${slug}`)}
      />

      <PromoCarousel promos={promos} />

      {producers.length > 0 ? (
        <View>
          <SectionHeader title="Productores cerca de ti" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {producers.map((p) => (
              <ProducerCard key={p.id} producer={p} onPress={() => router.push(`/productor/${p.id}`)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {surplus.length > 0 ? (
        <View>
          <SectionHeader title="Excedentes de hoy" action="Ver todo" onAction={openSurplus} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CAROUSEL_CARD + spacing[3]}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {surplus.map((p) => (
              <View key={p.id} style={{ width: CAROUSEL_CARD }}>
                <ProductCard product={p} canAdd={isBuyer} onPress={() => router.push(`/producto/${p.id}`)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* El gap de la grilla (24) ya separa: el encabezado queda a 12 de la primera fila, como los rieles. */}
      {fresh.length > 0 ? (
        <View>
          <SectionHeader title="Recién cosechado" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={CAROUSEL_CARD + spacing[3]}
            contentContainerStyle={{ paddingHorizontal: GUTTER, gap: spacing[3] }}
          >
            {fresh.map((p) => (
              <View key={p.id} style={{ width: CAROUSEL_CARD }}>
                <ProductCard product={p} canAdd={isBuyer} showHarvest onPress={() => router.push(`/producto/${p.id}`)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ marginBottom: -spacing[6] }}>
        <SectionHeader title="Cosechas frescas" action="Ver todo" onAction={() => router.push("/(tabs)/search")} />
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
        contentContainerStyle={{ gap: spacing[6], paddingBottom: spacing[12] + CART_BAR_SPACE }}
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
                Aún no hay cosechas en el catálogo
              </Text>
              <Text style={[type.footnote, { color: t.textSecondary, textAlign: "center", fontWeight: "400" }]}>
                Vuelve más tarde: los productores publican a diario.
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={staggerIn(index)} style={{ flex: 1, maxWidth: "50%" }}>
            <ProductCard product={item} canAdd={isBuyer} onPress={() => router.push(`/producto/${item.id}`)} />
          </Animated.View>
        )}
      />
      <CartBar overTabs />
    </SafeAreaView>
  );
}

/** Recién cosechado: según la fecha de cosecha que registra el productor (últimos 3 días). */
function freshHarvests(products: Product[]): Product[] {
  const cutoff = Date.now() - 3 * 24 * 3600 * 1000;
  return products
    .filter((p) => p.harvestDate && new Date(p.harvestDate).getTime() >= cutoff && p.stock > 0)
    .sort((a, b) => new Date(b.harvestDate!).getTime() - new Date(a.harvestDate!).getTime())
    .slice(0, 8);
}

/** Productores del catálogo, para el riel "Productores cerca de ti". */
function producersFrom(products: Product[]): ProducerTile[] {
  const byId = new Map<string, ProducerTile>();
  for (const p of products) {
    if (!p.producer) continue;
    const found = byId.get(p.producer.id);
    if (found) {
      found.harvests += 1;
    } else {
      byId.set(p.producer.id, {
        id: p.producer.id,
        name: p.producer.name,
        rating: p.producer.rating,
        ratingCount: p.producer.ratingCount,
        municipio: p.municipio,
        harvests: 1,
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.harvests - a.harvests);
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

  const impact = useQuery({
    queryKey: ["orders", "impact", user?.id],
    queryFn: getImpactMetrics,
    enabled: !!user?.id,
  });
  const thisWeek = impact.data?.weeks.at(-1)?.value ?? 0;

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

          <QueuedPublications />

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

          {/* Acceso a "Mis ventas" con lo recibido esta semana */}
          {impact.data?.totals && impact.data.totals.ordersCount > 0 ? (
            <PressableScale
              onPress={() => router.push("/impacto")}
              accessibilityRole="button"
              accessibilityLabel={`Esta semana recibiste ${formatCOP(thisWeek)}. Ver mis ventas`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[4],
                borderRadius: radius.lg,
                backgroundColor: t.primaryLight,
              }}
            >
              <Icon name="trending-up" size={22} color={t.onPrimaryLight} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "500" }]}>Esta semana recibiste</Text>
                <Text style={[type.title, { color: t.onPrimaryLight }]}>{formatCOP(thisWeek)}</Text>
              </View>
              <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "700" }]}>Mis ventas</Text>
              <Icon name="chevron-forward" size={16} color={t.onPrimaryLight} />
            </PressableScale>
          ) : null}
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
        backgroundColor: t.bgInput,
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

/**
 * Cosechas publicadas sin señal que esperan en la cola. Se envían solas; aquí
 * se ven, se puede reintentar ya, y las que el servidor rechazó muestran por qué.
 */
function QueuedPublications() {
  const t = useTheme();
  const queryClient = useQueryClient();
  const items = usePublishQueue((s) => s.items);
  const flushing = usePublishQueue((s) => s.flushing);
  const flush = usePublishQueue((s) => s.flush);
  const remove = usePublishQueue((s) => s.remove);
  if (items.length === 0) return null;

  const waiting = items.filter((it) => !it.error);
  const failed = items.filter((it) => it.error);

  const retry = async () => {
    const published = await flush();
    if (published > 0) queryClient.invalidateQueries({ queryKey: ["products"] });
    else if (usePublishQueue.getState().items.some((it) => !it.error)) toast.info("Todavía no hay señal. Lo intentamos solos cada 30 segundos.");
  };

  return (
    <View style={{ gap: spacing[2] }}>
      {waiting.length > 0 ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.warningLight }}
        >
          <Icon name="cloud-offline-outline" size={22} color={t.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.callout, { color: t.textPrimary }]}>
              {waiting.length === 1 ? `${waiting[0].input.name} espera señal` : `${waiting.length} cosechas esperan señal`}
            </Text>
            <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>Se publican solas cuando vuelva la conexión.</Text>
          </View>
          <Button title="Reintentar" size="sm" variant="outline" loading={flushing} onPress={retry} />
        </View>
      ) : null}
      {failed.map((it) => (
        <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.dangerLight }}>
          <Icon name="alert-circle-outline" size={22} color={t.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.callout, { color: t.textPrimary }]}>No se pudo publicar {it.input.name}</Text>
            <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>{it.error}</Text>
          </View>
          <Button title="Descartar" size="sm" variant="ghost" onPress={() => remove(it.id)} />
        </View>
      ))}
    </View>
  );
}
