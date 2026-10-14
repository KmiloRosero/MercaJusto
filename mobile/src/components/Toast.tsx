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
  const { message, kind, key, hide, action } = useToast();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  useEffect(() => {
    if (!message) return;
    // Con acción (Deshacer) se deja más tiempo para alcanzar a tocarla.
    const id = setTimeout(hide, action ? DURATION_MS * 2 : DURATION_MS);
    return () => clearTimeout(id);
  }, [message, key, hide, action]);

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
        {action ? (
          <Pressable
            onPress={() => {
              hide();
              action.onPress();
            }}
            accessibilityRole="button"
            hitSlop={8}
            style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: spacing[2], marginRight: -spacing[2] }}
          >
            <Text style={{ color: t.inversePrimary, fontWeight: "800", fontSize: 14 }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
