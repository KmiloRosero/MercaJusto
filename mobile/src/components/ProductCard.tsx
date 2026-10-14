import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { formatCOP, motion, radius, spacing, type, useTheme } from "../theme";
import { Product } from "../api/types";
import { Icon } from "./Icon";
import { FieldTile } from "./FieldTile";
import { effectivePrice } from "../lib/pricing";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Presión: hundimiento rápido (respuesta inmediata) y regreso con resorte
// interrumpible. Escalas pequeñas: es un gesto frecuente.
const pressIn = { duration: 120, easing: Easing.bezier(...motion.easeOut) };
const release = { damping: 18, stiffness: 320 };

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
}

export function ProductCard({ product, onPress, onAdd }: ProductCardProps) {
  const t = useTheme();
  const cardScale = useSharedValue(1);
  const addScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));
  const addStyle = useAnimatedStyle(() => ({ transform: [{ scale: addScale.value }] }));

  const finalPrice = effectivePrice(product);
  const discounted = finalPrice < product.price;
  const soldOut = product.stock <= 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (cardScale.value = withTiming(0.98, pressIn))}
      onPressOut={() => (cardScale.value = withSpring(1, release))}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCOP(finalPrice)} por ${product.unit}`}
      style={[cardStyle, { gap: spacing[2] }]}
    >
      {/* Foto o placeholder de categoría */}
      <View
        style={{
          aspectRatio: 1,
          borderRadius: radius.lg,
          overflow: "hidden",
          backgroundColor: t.bgSecondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {product.photoUrl ? (
          <Image source={{ uri: product.photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <FieldTile category={product.category} iconSize={44} radius={0} />
        )}

        {product.isSurplus && product.discountPct > 0 ? (
          <View
            style={{
              position: "absolute",
              top: spacing[2],
              left: spacing[2],
              height: 24,
              paddingHorizontal: 8,
              borderRadius: radius.full,
              backgroundColor: t.accent,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Icon name="leaf" size={11} color={t.onAccent} />
            <Text style={{ color: t.onAccent, fontSize: 12, fontWeight: "700" }}>-{product.discountPct}%</Text>
          </View>
        ) : null}

        {onAdd && !soldOut ? (
          <AnimatedPressable
            onPress={onAdd}
            onPressIn={() => (addScale.value = withTiming(0.9, pressIn))}
            onPressOut={() => (addScale.value = withSpring(1, release))}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${product.name} a la canasta`}
            style={[
              addStyle,
              {
                position: "absolute",
                right: spacing[2],
                bottom: spacing[2],
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: t.bgCard,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#0A140E",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.14,
                shadowRadius: 10,
                elevation: 4,
              },
            ]}
          >
            <Icon name="add" size={22} color={t.primary} />
          </AnimatedPressable>
        ) : null}

        {soldOut ? (
          <View
            style={{
              position: "absolute",
              bottom: spacing[2],
              left: spacing[2],
              paddingHorizontal: 8,
              height: 24,
              justifyContent: "center",
              borderRadius: radius.full,
              backgroundColor: t.inverseSurface,
            }}
          >
            <Text style={{ color: t.onInverseSurface, fontSize: 12, fontWeight: "600" }}>Agotado</Text>
          </View>
        ) : null}
      </View>

      {/* Información */}
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <Text numberOfLines={1} style={[type.callout, { color: t.textPrimary }]}>
          {product.name}
        </Text>
        <Text numberOfLines={1} style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
          {product.municipio}
          {product.producer?.name ? ` · ${product.producer.name.split(" ")[0]}` : ""}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 16, lineHeight: 20, fontWeight: "700", color: t.textPrimary, letterSpacing: -0.2 }}>
            {formatCOP(finalPrice)}
          </Text>
          <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>/{product.unit}</Text>
          {discounted ? (
            <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400", textDecorationLine: "line-through" }]}>
              {formatCOP(product.price)}
            </Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}
