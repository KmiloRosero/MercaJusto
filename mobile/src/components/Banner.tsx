import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { radius, spacing, type } from "../theme";
import { Icon } from "./Icon";

interface BannerProps {
  tag: string;
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
  iconName?: string;
}

// Verde campo: el único bloque saturado del Home, reservado para excedentes.
const FIELD = ["#0F5132", "#1B7A47"] as const;
const FIELD_INK = "#0F5132";

export function Banner({ tag, title, subtitle, cta, onCta, iconName = "leaf" }: BannerProps) {
  return (
    <Pressable
      onPress={onCta}
      accessibilityRole="button"
      style={({ pressed }) => ({
        marginHorizontal: spacing[5],
        borderRadius: radius.xl + 4,
        overflow: "hidden",
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <LinearGradient
        colors={FIELD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing[5], gap: spacing[2] }}
      >
        {/* Marca de agua: hoja grande recortada en la esquina */}
        <View style={{ position: "absolute", right: -28, bottom: -32, opacity: 0.14 }}>
          <Icon name={iconName} size={168} color="#FFFFFF" />
        </View>

        <Text style={[type.overline, { color: "#B7F0C8", textTransform: "uppercase" }]}>{tag}</Text>
        <Text style={[type.title, { color: "#FFFFFF", maxWidth: "82%" }]}>{title}</Text>
        {subtitle ? (
          <Text style={[type.footnote, { color: "rgba(255,255,255,0.86)", fontWeight: "400", maxWidth: "82%" }]}>
            {subtitle}
          </Text>
        ) : null}

        {cta ? (
          <View
            style={{
              marginTop: spacing[2],
              height: 36,
              paddingHorizontal: spacing[4],
              borderRadius: radius.full,
              backgroundColor: "#FFFFFF",
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={[type.footnote, { color: FIELD_INK, fontWeight: "700" }]}>{cta}</Text>
            <Icon name="arrow-forward" size={14} color={FIELD_INK} />
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}
