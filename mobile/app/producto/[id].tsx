import React, { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
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
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { QuantityStepper } from "../../src/components/QuantityStepper";
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

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
    if (ok) router.push("/(tabs)/cart");
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
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Detalle del producto" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {/* Hero Image / Placeholder */}
        <View
          style={{
            aspectRatio: 1.3,
            backgroundColor: t.gray100,
            alignItems: "center",
            justifyContent: "center",
            position: "relative" }}
        >
          {product.photoUrl ? (
            <Image
              source={{ uri: product.photoUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <FieldTile category={product.category} iconSize={88} radius={0} />
          )}

          {product.isSurplus ? (
            <View style={{ position: "absolute", top: spacing[4], left: spacing[4] }}>
              <Pill variant="accent" icon="sparkles">
                Excedente -{product.discountPct} %
              </Pill>
            </View>
          ) : null}
        </View>

        <View style={{ padding: spacing[4], gap: spacing[4] }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize["2xl"], fontWeight: "800", color: t.textPrimary }}>
                {product.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <Icon name="location" size={14} color={t.textSecondary} />
                <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>
                  {product.vereda ? `${product.vereda}, ` : ""}{product.municipio}, Nariño
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: fontSize["2xl"], fontWeight: "800", color: t.primary }}>
                {formatCOP(finalPrice)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>por {product.unit}</Text>
              {product.isSurplus && product.discountPct > 0 ? (
                <Text style={{ fontSize: fontSize.xs, color: t.textTertiary, textDecorationLine: "line-through" }}>
                  {formatCOP(product.price)}
                </Text>
              ) : null}
            </View>
          </View>

          {plaza ? (
            <View
              accessible
              accessibilityLabel={`En plaza cuesta ${formatCOP(plaza.plaza)} por ${product.unit}. Aquí ahorras ${formatCOP(plaza.perUnit)}, un ${plaza.pct} por ciento.`}
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
                  En plaza de mercado cuesta {formatCOP(plaza.plaza)}: pagas {plaza.pct} % menos.
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
            <View
              style={{
                backgroundColor: t.bgSecondary,
                padding: spacing[3],
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: t.border }}
            >
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, lineHeight: 22 }}>
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* Productor */}
          <Pressable
            onPress={() =>
              isOwner ? router.push("/(tabs)/profile") : router.push(`/productor/${product.producerId}`)
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
              padding: spacing[4],
              borderRadius: radius.lg,
              backgroundColor: t.bgCard,
              borderWidth: 1,
              borderColor: t.border,
              opacity: pressed ? 0.9 : 1 })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.full,
                backgroundColor: t.primaryLight,
                alignItems: "center",
                justifyContent: "center" }}
            >
              <Icon name="storefront" size={24} color={t.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                {product.producer?.name || "Productor campesino"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Icon name="star" size={13} color={t.rating} />
                <Text style={{ fontSize: fontSize.xs, color: t.textSecondary, fontWeight: "600" }}>
                  {product.producer?.ratingCount
                    ? `${product.producer.rating.toFixed(1)} · ${product.producer.ratingCount} calificaciones`
                    : "Productor nuevo"}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color={t.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Barra de acción fija */}
      <View
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
          gap: spacing[3] }}
      >
        {isOwner ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.textPrimary }}>
                Esta es tu publicación
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
                Stock: {product.stock} {product.unit}
              </Text>
            </View>
            <Button
              title="Retirar"
              variant="outline"
              icon={<Icon name="trash-outline" size={18} color={t.primary} />}
              onPress={onWithdraw}
              loading={busy}
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
          icon={<Icon name="cart" size={18} color={t.onPrimary} />}
          title={outOfStock ? "Agotado" : `Agregar · ${formatCOP(finalPrice * qty)}`}
          onPress={onAdd}
          loading={busy}
          disabled={outOfStock}
          style={{ flex: 1 }}
          size="lg"
        />
        </>
        )}
      </View>
    </SafeAreaView>
  );
}
