import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { fontSize, radius, shadow, spacing, useTheme, formatCOP } from "../theme";
import { Product } from "../api/types";
import { Pill } from "./Pill";
import { Icon } from "./Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAdd?: () => void;
}

export function ProductCard({ product, onPress, onAdd }: ProductCardProps) {
  const t = useTheme();
  const cardScale = useSharedValue(1);
  const addScale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const addAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const finalPrice =
    product.isSurplus && product.discountPct > 0
      ? Math.round(product.price * (1 - product.discountPct / 100))
      : product.price;

  const handleCardPressIn = () => {
    cardScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handleCardPressOut = () => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleAddPressIn = () => {
    addScale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  };

  const handleAddPressOut = () => {
    addScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handleCardPressIn}
      onPressOut={handleCardPressOut}
      style={[
        cardAnimatedStyle,
        {
          backgroundColor: t.bgCard,
          borderRadius: radius.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: t.border,
          ...shadow.sm,
        },
      ]}
    >
      {/* Foto de la cosecha (o icono de categoría vectorial) */}
      <View
        style={{
          aspectRatio: 1,
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
          <>
            <LinearGradient
              colors={[t.primaryLight, t.accentLight, t.bgSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.full,
                backgroundColor: "rgba(45,198,83,0.16)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(45,198,83,0.24)",
              }}
            >
              <Icon name={product.category?.name || "leaf"} size={38} color={t.success} />
            </View>
          </>
        )}

        {product.isSurplus ? (
          <View style={{ position: "absolute", top: 8, left: 8 }}>
            <Pill variant="accent" icon={<Icon name="sparkles" size={12} color="#FFF" />}>
              -{product.discountPct}% Excedente
            </Pill>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing[3], gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}
        >
          {product.name}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Icon name="location-outline" size={13} color={t.textTertiary} />
          <Text
            numberOfLines={1}
            style={{ fontSize: fontSize.xs, color: t.textTertiary, flex: 1 }}
          >
            {product.municipio} {product.producer?.name ? `· ${product.producer.name}` : ""}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: t.primary }}>
            {formatCOP(finalPrice)}
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>
            /{product.unit}
          </Text>
        </View>
      </View>

      {onAdd ? (
        <AnimatedPressable
          onPress={onAdd}
          onPressIn={handleAddPressIn}
          onPressOut={handleAddPressOut}
          style={[
            addAnimatedStyle,
            {
              position: "absolute",
              bottom: spacing[3],
              right: spacing[3],
              width: 34,
              height: 34,
              borderRadius: radius.full,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
              ...shadow.md,
            },
          ]}
        >
          <Icon name="add" size={22} color="#FFFFFF" />
        </AnimatedPressable>
      ) : null}
    </AnimatedPressable>
  );
}
