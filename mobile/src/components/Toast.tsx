import React, { useEffect } from "react";
import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../store/toast";
import { radius, shadow, spacing } from "../theme";
import { Icon } from "./Icon";

const DURATION_MS = 2600;

/** Aviso flotante breve. Se monta una sola vez en el layout raíz. */
export function Toast() {
  const { message, kind, key, hide } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(id);
  }, [message, key, hide]);

  if (!message) return null;

  const bg = kind === "success" ? "#1F9D45" : kind === "error" ? "#D92D3A" : "#1E293B";
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
          backgroundColor: bg,
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderRadius: radius.full,
          maxWidth: 480,
          ...shadow.lg,
        }}
      >
        <Icon name={icon} size={18} color="#FFFFFF" />
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14, flexShrink: 1 }}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}
