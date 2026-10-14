import React from "react";
import { Pressable, Text } from "react-native";
import { radius, type, useTheme } from "../theme";
import { Icon } from "./Icon";

interface ChipProps {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

/**
 * Filtro en forma de píldora. Sin animación de escala: se toca decenas de veces
 * por sesión, así que la respuesta es un cambio de color inmediato.
 */
export function Chip({ icon, label, active, onPress }: ChipProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => ({
        height: 38,
        paddingHorizontal: 14,
        borderRadius: radius.full,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: active ? t.primaryLight : t.bgPrimary,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? t.primary : t.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={active ? "checkmark" : icon || label} size={16} color={active ? t.onPrimaryLight : t.primary} />
      <Text style={[type.footnote, { fontWeight: "600", color: active ? t.onPrimaryLight : t.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}
