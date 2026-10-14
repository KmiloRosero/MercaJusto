import React from "react";
import { View, ViewStyle } from "react-native";
import { Category } from "../api/types";
import { useFieldColor } from "../theme";
import { Icon } from "./Icon";

interface FieldTileProps {
  category?: Category | null;
  /** Lado del cuadro. Si se omite, ocupa todo el contenedor. */
  size?: number;
  iconSize: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Marcador de producto sin foto: el ícono de su categoría sobre el color del
 * campo que la cultiva (la "colcha de retazos" de Nariño).
 */
export function FieldTile({ category, size, iconSize, radius = 12, style }: FieldTileProps) {
  const field = useFieldColor(category);
  return (
    <View
      style={[
        size ? { width: size, height: size } : { width: "100%", height: "100%" },
        {
          borderRadius: radius,
          backgroundColor: field.ground,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Icon name={category?.name || "leaf"} size={iconSize} color={field.ink} />
    </View>
  );
}
