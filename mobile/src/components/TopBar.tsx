import React from "react";
import { Text, View, Pressable } from "react-native";
import { fontSize, radius, spacing, useTheme } from "../theme";
import { Icon } from "./Icon";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function TopBar({ title, showBack, onBack, right }: TopBarProps) {
  const t = useTheme();

  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: spacing[4],
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: t.bgPrimary,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], flex: 1 }}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: t.bgSecondary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="chevron-back" size={20} color={t.textPrimary} />
          </Pressable>
        ) : (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.md,
              backgroundColor: t.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cart" size={18} color="#FFFFFF" />
          </View>
        )}
        <Text style={{ fontSize: 18, fontWeight: "800", color: showBack ? t.textPrimary : t.primary }}>
          {title || "MercaJusto"}
        </Text>
      </View>
      {right}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing[4],
        marginBottom: spacing[3],
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: t.textPrimary }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: t.primary }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
