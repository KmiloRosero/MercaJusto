import React from "react";
import { Text, View } from "react-native";
import { radius, spacing, useTheme } from "../theme";

interface BannerProps {
  tag: string;
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
  graphic?: string;
}

import { Pressable } from "react-native";

export function Banner({ tag, title, subtitle, cta, onCta, graphic = "🌽" }: BannerProps) {
  return (
    <Pressable
      onPress={onCta}
      style={{
        marginHorizontal: spacing[4],
        marginBottom: spacing[5],
        borderRadius: radius.xl,
        padding: spacing[5],
        backgroundColor: "#FF6B2B",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.20)",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.sm,
          alignSelf: "flex-start",
          marginBottom: spacing[2],
        }}
      >
        <Text
          style={{
            color: "#FFF",
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {tag}
        </Text>
      </View>
      <Text style={{ color: "#FFF", fontSize: 24, fontWeight: "800", lineHeight: 28, marginBottom: spacing[2], maxWidth: "70%" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, marginBottom: spacing[3], maxWidth: "70%" }}>
          {subtitle}
        </Text>
      ) : null}
      {cta ? (
        <View
          style={{
            backgroundColor: "#FFF",
            paddingHorizontal: 18,
            paddingVertical: 8,
            borderRadius: radius.full,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#FF6B2B", fontSize: 13, fontWeight: "700" }}>{cta}</Text>
        </View>
      ) : null}
      <Text
        style={{
          position: "absolute",
          right: -10,
          top: "50%",
          fontSize: 90,
          opacity: 0.25,
          transform: [{ translateY: -45 }],
        }}
      >
        {graphic}
      </Text>
    </Pressable>
  );
}
