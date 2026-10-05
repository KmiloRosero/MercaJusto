import React from "react";
import { Text, View } from "react-native";
import { fontSize, radius, useTheme } from "../theme";

type Variant = "primary" | "accent" | "success" | "warning" | "danger";

const colorMap: Record<Variant, { bg: (t: any) => string; fg: (t: any) => string }> = {
  primary: { bg: (t) => t.primaryLight, fg: (t) => t.primary },
  accent:  { bg: (t) => t.accentLight,  fg: (t) => t.accent },
  success: { bg: () => "rgba(45,198,83,0.12)", fg: (t) => t.success },
  warning: { bg: () => "rgba(255,184,0,0.12)", fg: (t) => "#B8860B" },
  danger:  { bg: () => "rgba(240,58,71,0.12)", fg: (t) => t.danger },
};

export function Pill({
  children,
  variant = "primary",
  icon,
}: {
  children: React.ReactNode;
  variant?: Variant;
  icon?: string;
}) {
  const t = useTheme();
  const { bg, fg } = colorMap[variant];
  return (
    <View
      style={{
        backgroundColor: bg(t),
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: radius.full,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
      }}
    >
      {icon ? <Text style={{ fontSize: 11 }}>{icon}</Text> : null}
      <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: fg(t) }}>
        {children}
      </Text>
    </View>
  );
}
