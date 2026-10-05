import React from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "../theme";
import { Icon } from "./Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}

function StarItem({
  star,
  rating,
  onChange,
  size,
  readOnly,
}: {
  star: number;
  rating: number;
  onChange?: (rating: number) => void;
  size: number;
  readOnly: boolean;
}) {
  const t = useTheme();
  const scale = useSharedValue(1);
  const filled = star <= rating;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (readOnly) return;
    scale.value = withSpring(1.3, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1);
    });
    onChange?.(star);
  };

  return (
    <AnimatedPressable
      disabled={readOnly}
      onPress={handlePress}
      hitSlop={6}
      style={[animatedStyle, { padding: 4 }]}
    >
      <Icon
        name={filled ? "star" : "star-outline"}
        size={size}
        color={filled ? "#FFB800" : t.gray300}
      />
    </AnimatedPressable>
  );
}

export function Stars({ rating, onChange, size = 32, readOnly = false }: StarsProps) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarItem
          key={star}
          star={star}
          rating={rating}
          onChange={onChange}
          size={size}
          readOnly={readOnly}
        />
      ))}
    </View>
  );
}

const FEEDBACK: Record<number, string> = {
  1: "Muy deficiente",
  2: "Regular",
  3: "Aceptable",
  4: "Muy bueno",
  5: "¡Excelente!",
};

export function starFeedback(rating: number): string {
  return FEEDBACK[rating] || "";
}
