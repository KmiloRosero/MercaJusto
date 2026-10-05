import React from "react";
import { ActivityIndicator, Pressable, StyleProp, Text, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { radius, useTheme } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const heights: Record<Size, number> = { sm: 36, md: 48, lg: 54 };
const fontSizes: Record<Size, number> = { sm: 13, md: 15, lg: 16 };
const paddings: Record<Size, number> = { sm: 16, md: 20, lg: 24 };

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  full,
  icon,
  style,
}: ButtonProps) {
  const t = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const bg =
    disabled ? t.gray200 :
    variant === "primary" ? t.primary :
    variant === "accent" ? t.accent :
    "transparent";

  const color =
    disabled ? t.gray400 :
    variant === "outline" || variant === "ghost" ? t.primary :
    "#FFFFFF";

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        {
          height: heights[size],
          borderRadius: radius.full,
          backgroundColor: bg,
          paddingHorizontal: paddings[size],
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? t.primary : "transparent",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          alignSelf: full ? "stretch" : "auto",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {icon}
          <Text style={{ color, fontSize: fontSizes[size], fontWeight: "700" }}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
