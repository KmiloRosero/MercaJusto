import React from "react";
import { Text, View } from "react-native";
import { radius, useTheme } from "../theme";

/** Iniciales del nombre: dos para "José Tulio Enríquez" (JT), una si es una sola palabra. */
export function initialsOf(name?: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Avatar de una persona: sus iniciales en blanco sobre verde campo. Es el
 * mismo en el inicio, el perfil y la página del productor.
 */
export function Avatar({ name, size }: { name?: string | null; size: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: t.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: t.onPrimary, fontSize: Math.round(size * 0.36), fontWeight: "800", letterSpacing: 0.5 }}
        allowFontScaling={false}
      >
        {initialsOf(name) || "M"}
      </Text>
    </View>
  );
}
