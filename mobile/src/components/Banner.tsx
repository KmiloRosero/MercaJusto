import React from "react";
import { Text, View } from "react-native";
import { radius, spacing, type, useTheme, useThemeScheme } from "../theme";
import { Icon } from "./Icon";
import { PressableScale } from "./PressableScale";

interface BannerProps {
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
  iconName?: string;
}

/**
 * Bloque destacado del Home, en verde campo. En oscuro usa el contenedor
 * tonal en vez de un bloque claro, para no invertir el tema a la ligera.
 */
export function Banner({ title, subtitle, cta, onCta, iconName = "leaf" }: BannerProps) {
  const t = useTheme();
  const dark = useThemeScheme() === "dark";
  const ground = dark ? t.primaryLight : t.primary;
  const ink = dark ? t.onPrimaryLight : t.onPrimary;
  const ctaGround = dark ? t.primary : t.onPrimary;
  const ctaInk = dark ? t.onPrimary : t.primary;
  return (
    <PressableScale
      onPress={onCta}
      accessibilityRole="button"
      style={{
        marginHorizontal: spacing[5],
        borderRadius: radius.xl + 4,
        overflow: "hidden",
        backgroundColor: ground,
        padding: spacing[5],
        gap: spacing[2],
      }}
    >
      {/* Marca de agua: hoja grande recortada en la esquina */}
      <View style={{ position: "absolute", right: -28, bottom: -32, opacity: 0.16 }}>
        <Icon name={iconName} size={168} color={ink} />
      </View>

      <Text style={[type.title, { color: ink, maxWidth: "82%" }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.footnote, { color: ink, fontWeight: "400", maxWidth: "82%" }]}>{subtitle}</Text>
      ) : null}

      {cta ? (
        <View
          style={{
            marginTop: spacing[2],
            height: 36,
            paddingHorizontal: spacing[4],
            borderRadius: radius.full,
            backgroundColor: ctaGround,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={[type.footnote, { color: ctaInk, fontWeight: "700" }]}>{cta}</Text>
          <Icon name="arrow-forward" size={14} color={ctaInk} />
        </View>
      ) : null}
    </PressableScale>
  );
}
