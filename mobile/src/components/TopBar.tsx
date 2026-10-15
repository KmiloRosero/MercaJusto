import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { fontSize, radius, spacing, type, useTheme } from "../theme";
import { Icon } from "./Icon";
import { BRAND, LogoMark } from "./Logo";

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
        height: 64,
        // Con botón Atrás, el ícono queda a 4 dp del borde como en la app bar de Material.
        paddingLeft: showBack ? spacing[1] : spacing[4],
        paddingRight: spacing[4],
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
            accessibilityRole="button"
            accessibilityLabel="Volver"
            android_ripple={{ color: t.gray200, borderless: true, radius: 24 }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed && Platform.OS !== "android" ? t.gray100 : "transparent",
            })}
          >
            <Icon name="arrow-back" size={24} color={t.textPrimary} />
          </Pressable>
        ) : (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.md,
              backgroundColor: BRAND.field,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogoMark size={24} />
          </View>
        )}
        <Text style={[type.headline, { color: t.textPrimary }]} numberOfLines={1}>
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
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingHorizontal: spacing[5],
        marginBottom: spacing[3],
      }}
    >
      <Text style={[type.headline, { color: t.textPrimary }]} accessibilityRole="header">
        {title}
      </Text>
      {action ? (
        <Pressable
          onPress={onAction}
          hitSlop={{ top: 15, bottom: 15, left: 12, right: 12 }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 2, opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={[type.footnote, { fontWeight: "600", color: t.primary }]}>{action}</Text>
          <Icon name="chevron-forward" size={14} color={t.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
