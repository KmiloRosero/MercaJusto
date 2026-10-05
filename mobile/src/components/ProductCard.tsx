import React from "react";
import { Pressable, Text, View } from "react-native";
import { fontSize, radius, shadow, spacing, useTheme } from "../theme";
import { Product } from "../api/types";
import { formatCOP } from "../theme";
import { Pill } from "./Pill";

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
}

export function ProductCard({ product, onPress, onAdd }: ProductCardProps) {
  const t = useTheme();

  const finalPrice = product.isSurplus && product.discountPct > 0
    ? Math.round(product.price * (1 - product.discountPct / 100))
    : product.price;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: t.bgCard,
        borderRadius: radius.lg,
        overflow: "hidden",
        opacity: pressed ? 0.95 : 1,
        ...shadow.sm,
      })}
    >
      {/* Image placeholder — reemplazar con <Image source={{uri: product.photoUrl}} /> cuando subas fotos */}
      <View
        style={{
          aspectRatio: 1,
          backgroundColor: t.gray100,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 56 }}>{product.category?.icon || "🌾"}</Text>
        {product.isSurplus ? (
          <View style={{ position: "absolute", top: 8, left: 8 }}>
            <Pill variant="accent" icon="🔥">-{product.discountPct}%</Pill>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing[3], gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: "600", color: t.textPrimary }}
        >
          {product.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontSize: fontSize.xs, color: t.textTertiary }}
        >
          📍 {product.municipio} · {product.producer?.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: t.primary }}>
            {formatCOP(finalPrice)}
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>
            /{product.unit}
          </Text>
        </View>
      </View>

      {onAdd ? (
        <Pressable
          onPress={onAdd}
          style={{
            position: "absolute",
            bottom: spacing[3],
            right: spacing[3],
            width: 32,
            height: 32,
            borderRadius: radius.full,
            backgroundColor: t.primary,
            alignItems: "center",
            justifyContent: "center",
            ...shadow.md,
          }}
        >
          <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "700", lineHeight: 22 }}>+</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
