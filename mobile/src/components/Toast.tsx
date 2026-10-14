import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../store/toast";
import { radius, shadow, spacing, useTheme } from "../theme";
import { Icon } from "./Icon";

const DURATION_MS = 2600;

/** Aviso flotante breve. Se monta una sola vez en el layout raíz. */
export function Toast() {
  const { message, kind, key, hide } = useToast();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(id);
  }, [message, key, hide]);

  if (!message) return null;

  const icon = kind === "success" ? "checkmark-circle" : kind === "error" ? "alert-circle" : "information-circle";

  return (
    <Animated.View
      key={key}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: spacing[4],
        right: spacing[4],
        bottom: insets.bottom + 84,
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={hide}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[2],
          backgroundColor: t.inverseSurface,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderRadius: radius.sm,
          minHeight: 48,
          maxWidth: 480,
          ...shadow.lg,
        }}
      >
        <Icon name={icon} size={18} color={kind === "error" ? t.dangerLight : t.onInverseSurface} />
        <Text style={{ color: t.onInverseSurface, fontWeight: "600", fontSize: 14, flexShrink: 1 }}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}
