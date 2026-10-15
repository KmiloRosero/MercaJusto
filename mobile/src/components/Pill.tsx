import React from "react";
import { Text, View } from "react-native";
import { fontSize, radius, useTheme } from "../theme";
import { Icon } from "./Icon";

type Variant = "primary" | "accent" | "success" | "warning" | "danger";

const colorMap: Record<Variant, { bg: (t: any) => string; fg: (t: any) => string }> = {
  primary: { bg: (t) => t.primaryLight, fg: (t) => t.onPrimaryLight },
  accent:  { bg: (t) => t.accentLight,  fg: (t) => t.onAccentLight },
  success: { bg: (t) => t.successLight, fg: (t) => t.success },
  warning: { bg: (t) => t.warningLight, fg: (t) => t.warning },
  danger:  { bg: (t) => t.dangerLight,  fg: (t) => t.danger },
};

export function Pill({
  children,
  variant = "primary",
  icon,
}: {
  children: React.ReactNode;
  variant?: Variant;
  icon?: React.ReactNode | string;
}) {
  const t = useTheme();
  const { bg, fg } = colorMap[variant];
  return (
    <View
      style={{
        backgroundColor: bg(t),
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
      }}
    >
      {typeof icon === "string" ? (
        <Icon name={icon} size={12} color={fg(t)} />
      ) : (
        icon
      )}
      <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: fg(t) }}>
        {children}
      </Text>
    </View>
  );
}
