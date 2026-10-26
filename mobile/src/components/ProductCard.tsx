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
import { AddControl } from "./AddControl";
import { effectivePrice } from "../lib/pricing";
import { plazaComparison } from "../lib/savings";
import { sizedImage } from "../lib/image";

/** Ancho máximo de la tarjeta en la grilla de dos columnas (dp). */
const CARD_IMAGE_DP = 200;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const pressIn = { duration: motion.pressIn, easing: Easing.bezier(...motion.easeOut) };

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  /** Muestra el "+" que agrega sin salir de la lista (solo compradores). */
  canAdd?: boolean;
  /** Muestra cuándo se cosechó ("Cosechado hoy"), para el riel de recién cosechado. */
  showHarvest?: boolean;
}

/** "hoy", "ayer" o "hace 3 días" desde la fecha de cosecha. */
export function harvestAgo(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000)));
  return days === 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`;
}

/**
 * Tarjeta de producto al estilo de las apps de domicilio: foto cuadrada con el
 * "+" encima, y debajo el precio primero, luego el nombre y quién lo cultivó.
 */
export function ProductCard({ product, onPress, canAdd, showHarvest }: ProductCardProps) {
  const t = useTheme();
  const cardScale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: cardScale.value }] }));

  const finalPrice = effectivePrice(product);
  const discounted = product.isSurplus && product.discountPct > 0;
  const plaza = plazaComparison(product);
  const soldOut = product.stock <= 0;
  const producerFirst = product.producer?.name?.split(" ")[0];

  return (
    <View>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => cardScale.set(withTiming(0.98, pressIn))}
        onPressOut={() => cardScale.set(withSpring(1, motion.release))}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${formatCOP(finalPrice)} por ${product.unit}${plaza ? `, en plaza ${formatCOP(plaza.plaza)}` : ""}`}
        style={[cardStyle, { gap: spacing[2] }]}
      >
        <View
          style={{
            aspectRatio: 1,
            borderRadius: radius.lg,
            overflow: "hidden",
            backgroundColor: t.bgInput,
          }}
        >
          {product.photoUrl ? (
            <Image
              source={{ uri: sizedImage(product.photoUrl, CARD_IMAGE_DP, 1) }}
              style={{ width: "100%", height: "100%", opacity: soldOut ? 0.5 : 1 }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <FieldTile category={product.category} productName={product.name} iconSize={48} radius={0} />
          )}

          {discounted ? (
            <View
              style={{
                position: "absolute",
                top: spacing[2],
                left: spacing[2],
                height: 24,
                paddingHorizontal: 8,
                borderRadius: radius.sm,
                backgroundColor: t.accent,
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Icon name="leaf" size={11} color={t.onAccent} />
              <Text style={{ color: t.onAccent, fontSize: 12, fontWeight: "800" }}>-{product.discountPct}%</Text>
            </View>
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
                borderRadius: radius.sm,
                backgroundColor: t.inverseSurface,
              }}
            >
              <Text style={{ color: t.onInverseSurface, fontSize: 12, fontWeight: "700" }}>Agotado</Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 2, paddingHorizontal: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: "800", color: t.textPrimary, letterSpacing: -0.3 }}>
              {formatCOP(finalPrice)}
            </Text>
            {discounted ? (
              <Text
                style={[
                  type.footnote,
                  { color: t.textTertiary, fontWeight: "400", textDecorationLine: "line-through" },
                ]}
              >
                {formatCOP(product.price)}
              </Text>
            ) : null}
          </View>
          <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 20, fontWeight: "500", color: t.textPrimary }}>
            {product.name}
          </Text>
          <Text numberOfLines={1} style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
            {product.unit}
            {producerFirst ? ` · ${producerFirst}, ${product.municipio}` : ` · ${product.municipio}`}
          </Text>
          {showHarvest && product.harvestDate ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="mci:sprout" size={14} color={t.textSecondary} />
              <Text numberOfLines={1} style={[type.footnote, { color: t.textSecondary, fontWeight: "600" }]}>
                Cosechado {harvestAgo(product.harvestDate)}
              </Text>
            </View>
          ) : null}
          {plaza ? (
            <Text numberOfLines={2} style={[type.footnote, { color: t.success, fontWeight: "700" }]}>
              {plaza.pct}% menos que en plaza
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>

      {/* El "+" va encima de la foto pero fuera de la tarjeta:
          un botón dentro de otro no es válido en la web. */}
      {canAdd && !soldOut ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, aspectRatio: 1 }}
        >
          <View style={{ position: "absolute", right: spacing[2], bottom: spacing[2] }}>
            <AddControl product={product} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
