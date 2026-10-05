import React from "react";
import { Text, View } from "react-native";
import { radius, spacing, useTheme } from "../theme";

interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true }: CardProps) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.bgCard,
        borderRadius: radius.lg,
        padding: padded ? spacing[4] : 0,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      {children}
    </View>
  );
}
