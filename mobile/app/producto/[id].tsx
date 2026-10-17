import React, { useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, type, useTheme, formatCOP } from "../../src/theme";
import { plazaComparison } from "../../src/lib/savings";
import { apiErrorMessage, deleteProduct, getProduct } from "../../src/api/client";
import { useAuth } from "../../src/store/auth";
import { useAddToCart } from "../../src/lib/useAddToCart";
import { effectivePrice } from "../../src/lib/pricing";
import { confirmDialog, showAlert } from "../../src/lib/dialog";
import { toast } from "../../src/store/toast";

import { FieldTile } from "../../src/components/FieldTile";
import { sizedImage } from "../../src/lib/image";
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { QuantityStepper } from "../../src/components/QuantityStepper";
import { useSnackbarAnchor } from "../../src/lib/useSnackbarAnchor";
import { EditHarvestSheet } from "../../src/components/EditHarvestSheet";
import { Avatar } from "../../src/components/Avatar";
import { PressableScale } from "../../src/components/PressableScale";
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const onActionBarLayout = useSnackbarAnchor();
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: product, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id!),
    enabled: !!id });

  if (isLoading || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Detalle del producto" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          {error ? (
            <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
          ) : (
            <LoadingState label="Cargando la cosecha…" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const finalPrice = effectivePrice(product);
  const plaza = plazaComparison(product);
  const isOwner = me?.id === product.producerId;
  const isBuyer = me?.role === "BUYER";
  const outOfStock = product.stock <= 0 || !product.isActive;

  const onAdd = async () => {
    setBusy(true);
    const ok = await addToCart(product.id, qty, product.name);
    setBusy(false);
    // Como en las apps de domicilio: se vuelve a la lista y la barra "Ver canasta" confirma.
    if (ok) {
      if (router.canGoBack()) router.back();
      else router.push("/(tabs)/cart");
    }
  };

  const onWithdraw = async () => {
    const ok = await confirmDialog(
      "¿Retirar publicación?",
      "El producto dejará de mostrarse en el catálogo. Los pedidos existentes no se afectan.",
      { confirmText: "Retirar", destructive: true }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteProduct(product.id);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Publicación retirada");
      router.back();
    } catch (err) {
      showAlert("No se pudo retirar", apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Foto a sangre, o el color del campo de su categoría */}
        <View
          style={{
            height: Math.min(width, 520) * 0.9 + insets.top,
            backgroundColor: t.bgInput,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {product.photoUrl ? (
            <Image
              source={{ uri: sizedImage(product.photoUrl, width, 1.3) }}
              accessibilityIgnoresInvertColors
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <FieldTile category={product.category} productName={product.name} iconSize={88} radius={0} />
          )}

        </View>

        {/* Hoja blanca que se monta sobre la foto */}
        <View
          style={{
            marginTop: -24,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: t.bgPrimary,
            paddingHorizontal: spacing[5],
            paddingTop: spacing[6],
            gap: spacing[5],
          }}
        >
          <View style={{ gap: spacing[2] }}>
            {product.isSurplus ? (
              <Pill variant="accent" icon="leaf">
                Excedente
              </Pill>
            ) : null}
            <Text style={{ fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.5, color: t.textPrimary }}>
              {product.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing[2], flexWrap: "wrap" }}>
              <Text style={{ fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4, color: t.textPrimary }}>
                {formatCOP(finalPrice)}
              </Text>
              <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>por {product.unit}</Text>
              {product.isSurplus && product.discountPct > 0 ? (
                <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400", textDecorationLine: "line-through" }]}>
                  antes {formatCOP(product.price)}
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="location" size={14} color={t.textSecondary} />
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                {product.vereda ? `${product.vereda}, ` : ""}
                {product.municipio}, Nariño
              </Text>
            </View>
          </View>

          {plaza ? (
            <View
              accessible
              accessibilityLabel={`Ahorras ${formatCOP(plaza.perUnit)} por ${product.unit}. En plaza de mercado cuesta ${formatCOP(plaza.plaza)}.`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[4],
                borderRadius: radius.lg,
                backgroundColor: t.successLight }}
            >
              <Icon name="leaf" size={22} color={t.success} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.callout, { color: t.textPrimary }]}>
                  Ahorras {formatCOP(plaza.perUnit)} por {product.unit}
                </Text>
                <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                  En plaza de mercado cuesta {formatCOP(plaza.plaza)}.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: spacing[2], flexWrap: "wrap" }}>
            {outOfStock ? (
              <Pill variant="danger" icon="close-circle">
                Agotado
              </Pill>
            ) : (
              <Pill variant="success" icon="checkmark-circle">
                Disponible: {product.stock} {product.unit}
              </Pill>
            )}
            {product.harvestDate ? (
              <Pill variant="primary" icon="time-outline">
                Cosechado {new Date(product.harvestDate).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
              </Pill>
            ) : null}
          </View>

          {product.description ? (
            <View style={{ gap: spacing[2] }}>
              <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
                Descripción
              </Text>
              <Text style={[type.body, { color: t.textSecondary }]}>{product.description}</Text>
            </View>
          ) : null}

          {/* Productor, como la "tienda" del producto */}
          <View style={{ gap: spacing[2] }}>
            <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
              Lo cultivó
            </Text>
            <PressableScale
              onPress={() =>
                isOwner ? router.push("/(tabs)/profile") : router.push(`/productor/${product.producerId}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`Ver la página de ${product.producer?.name || "el productor"}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                borderRadius: radius.lg,
                backgroundColor: t.bgInput,
              }}
            >
              <Avatar name={product.producer?.name} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>
                  {product.producer?.name || "Productor campesino"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="star" size={13} color={t.rating} />
                  <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "600" }]}>
                    {product.producer?.ratingCount
                      ? `${product.producer.rating.toFixed(1)} · ${product.producer.ratingCount} calificaciones`
                      : "Productor nuevo"}
                  </Text>
                </View>
              </View>
              <Text style={[type.footnote, { color: t.primary, fontWeight: "700" }]}>Ver cosechas</Text>
              <Icon name="chevron-forward" size={16} color={t.primary} />
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      {/* Atrás flotante sobre la foto */}
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

      {/* Barra de acción fija */}
      <View
        onLayout={onActionBarLayout}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing[4],
          paddingBottom: spacing[4] + insets.bottom,
          backgroundColor: t.bgCard,
          borderTopWidth: 1,
          borderTopColor: t.border,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
        }}
      >
        {isOwner ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.textPrimary }}>
                Esta es tu publicación
              </Text>
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                Quedan {product.stock} {product.unit.toLowerCase()}
              </Text>
            </View>
            <Pressable
              onPress={busy ? undefined : onWithdraw}
              accessibilityRole="button"
              accessibilityLabel={`Retirar ${product.name} del catálogo`}
              hitSlop={4}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: spacing[2],
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="trash-outline" size={18} color={t.danger} />
              <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.danger }}>Retirar</Text>
            </Pressable>
            <Button
              title="Editar"
              icon={<Icon name="create-outline" size={18} color={t.onPrimary} />}
              onPress={() => setEditing(true)}
            />
          </>
        ) : !isBuyer ? (
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Icon name="information-circle-outline" size={18} color={t.textSecondary} />
            <Text style={{ flex: 1, fontSize: fontSize.sm, color: t.textSecondary }}>
              Las compras se hacen desde una cuenta de comprador.
            </Text>
          </View>
        ) : (
        <>
        <QuantityStepper
          value={qty}
          max={Math.max(1, product.stock)}
          label={product.name}
          onChange={setQty}
        />

        <Button
          title={outOfStock ? "Agotado" : `Agregar  ${formatCOP(finalPrice * qty)}`}
          onPress={onAdd}
          loading={busy}
          disabled={outOfStock}
          style={{ flex: 1 }}
          size="lg"
        />
        </>
        )}
      </View>
      {isOwner ? (
        // La clave cambia cuando cambian los datos: la hoja se abre siempre con los valores guardados.
        <EditHarvestSheet
          key={`${product.price}-${product.stock}-${product.isSurplus}-${product.discountPct}`}
          product={product}
          visible={editing}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </View>
  );
}
