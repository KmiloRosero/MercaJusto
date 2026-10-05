import React from "react";
import { Pressable, Text, View } from "react-native";
import { fontSize, radius, useTheme } from "../theme";

interface ChipProps {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ icon, label, active, onPress }: ChipProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        minWidth: 68,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radius.lg,
        backgroundColor: active ? t.primary : t.bgSecondary,
        borderWidth: 1.5,
        borderColor: active ? t.primary : "transparent",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text
        style={{
          fontSize: fontSize.xs,
          fontWeight: "500",
          color: active ? "#FFFFFF" : t.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
