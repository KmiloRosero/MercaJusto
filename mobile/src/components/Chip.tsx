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
 * Filtro en forma de píldora, gris en reposo y verde lleno al elegirlo. Sin
 * animación de escala: se toca decenas de veces, la respuesta es el color.
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
        backgroundColor: active ? t.primary : t.bgInput,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={active ? "checkmark" : icon || label} size={16} color={active ? t.onPrimary : t.textPrimary} />
      <Text style={[type.footnote, { fontWeight: active ? "700" : "600", color: active ? t.onPrimary : t.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}
