import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
        overflow: "hidden",
        position: "relative",
        minHeight: 228,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <LinearGradient
        colors={["#145C3B", "#21814D", "#50A94F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(5,36,22,0.36)",
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
          fontSize: 26,
          fontWeight: "800",
          lineHeight: 31,
          marginBottom: spacing[1],
          maxWidth: "78%",
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
            maxWidth: "78%",
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
          <Text style={{ color: "#17683F", fontSize: 13, fontWeight: "800" }}>{cta}</Text>
          <Icon name="arrow-forward" size={14} color="#17683F" />
        </View>
      ) : null}

      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          opacity: 0.22,
        }}
      >
        <Icon name={iconName} size={124} color="#FFE7A3" />
      </View>
    </Pressable>
  );
}
