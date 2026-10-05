import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../../src/theme";
import { getProduct } from "../../src/api/client";
import { useCart } from "../../src/store/cart";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const addToCart = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id!),
    enabled: !!id,
  });

  if (isLoading || !product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Cargando..." />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={t.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const finalPrice =
    product.isSurplus && product.discountPct > 0
      ? Math.round(product.price * (1 - product.discountPct / 100))
      : product.price;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Detalle del producto" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Image / Placeholder */}
        <View
          style={{
            aspectRatio: 1.3,
            backgroundColor: t.gray100,
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {product.photoUrl ? (
            <Image
              source={{ uri: product.photoUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: radius.full,
                backgroundColor: t.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={product.category?.name || "leaf"} size={56} color={t.primary} />
            </View>
          )}

          {product.isSurplus ? (
            <View style={{ position: "absolute", top: spacing[4], left: spacing[4] }}>
              <Pill variant="accent" icon="sparkles">
                Excedente -{product.discountPct}%
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

          <View style={{ flexDirection: "row", gap: spacing[2], flexWrap: "wrap" }}>
            <Pill variant="success" icon="checkmark-circle">
              Disponible: {product.stock} {product.unit}
            </Pill>
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
                borderColor: t.border,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary, lineHeight: 22 }}>
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* Productor */}
          <Pressable
            onPress={() => product.producer && router.push(`/(tabs)/profile`)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
              padding: spacing[4],
              borderRadius: radius.lg,
              backgroundColor: t.bgCard,
              borderWidth: 1,
              borderColor: t.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius.full,
                backgroundColor: t.primaryLight,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="storefront" size={24} color={t.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                {product.producer?.name || "Productor campesino"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Icon name="star" size={13} color="#FFB800" />
                <Text style={{ fontSize: fontSize.xs, color: t.textSecondary, fontWeight: "600" }}>
                  {product.producer?.rating.toFixed(1) || "5.0"} · {product.producer?.ratingCount || 0} calificaciones
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
          backgroundColor: t.bgCard,
          borderTopWidth: 1,
          borderTopColor: t.border,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: t.bgSecondary,
            borderRadius: radius.full,
            paddingHorizontal: spacing[3],
            paddingVertical: 6,
            gap: spacing[3],
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={6}>
            <Icon name="remove" size={16} color={t.textPrimary} />
          </Pressable>
          <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary, minWidth: 20, textAlign: "center" }}>
            {qty}
          </Text>
          <Pressable onPress={() => setQty((q) => Math.min(product.stock, q + 1))} hitSlop={6}>
            <Icon name="add" size={16} color={t.textPrimary} />
          </Pressable>
        </View>

        <Button
          title={`Agregar · ${formatCOP(finalPrice * qty)}`}
          icon={<Icon name="cart" size={18} color="#FFFFFF" />}
          onPress={async () => {
            await addToCart(product.id, qty);
            router.push("/(tabs)/cart");
          }}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
