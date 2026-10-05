import React from "react";
import { Pressable, Text, View } from "react-native";
import { radius, spacing } from "../theme";
import { Icon } from "./Icon";

interface BannerProps {
  tag: string;
  title: string;
  subtitle?: string;
  cta?: string;
  onCta?: () => void;
  iconName?: string;
}

export function Banner({
  tag,
  title,
  subtitle,
  cta,
  onCta,
  iconName = "sparkles",
}: BannerProps) {
  return (
    <Pressable
      onPress={onCta}
      style={({ pressed }) => ({
        marginHorizontal: spacing[4],
        marginBottom: spacing[5],
        borderRadius: radius.xl,
        padding: spacing[5],
        backgroundColor: "#FF6B2B",
        overflow: "hidden",
        position: "relative",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(0,0,0,0.20)",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          alignSelf: "flex-start",
          marginBottom: spacing[2],
        }}
      >
        <Icon name="sparkles" size={12} color="#FFFFFF" />
        <Text
          style={{
            color: "#FFF",
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {tag}
        </Text>
      </View>

      <Text
        style={{
          color: "#FFF",
          fontSize: 22,
          fontWeight: "800",
          lineHeight: 28,
          marginBottom: spacing[1],
          maxWidth: "75%",
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            marginBottom: spacing[4],
            maxWidth: "75%",
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {cta ? (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: radius.full,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text style={{ color: "#FF6B2B", fontSize: 13, fontWeight: "700" }}>{cta}</Text>
          <Icon name="arrow-forward" size={14} color="#FF6B2B" />
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          opacity: 0.18,
        }}
      >
        <Icon name={iconName} size={110} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}
