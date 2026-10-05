import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { fontSize, radius, useTheme } from "../theme";
import { Icon } from "./Icon";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChipProps {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ icon, label, active, onPress }: ChipProps) {
  const t = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        {
          minWidth: 72,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: radius.lg,
          backgroundColor: active ? t.primary : t.bgSecondary,
          borderWidth: 1.5,
          borderColor: active ? t.primary : t.border,
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        },
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.full,
          backgroundColor: active ? "rgba(255,255,255,0.2)" : t.bgPrimary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={icon || label}
          size={18}
          color={active ? "#FFFFFF" : t.primary}
        />
      </View>

      <Text
        style={{
          fontSize: fontSize.xs,
          fontWeight: active ? "700" : "500",
          color: active ? "#FFFFFF" : t.textSecondary,
        }}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
