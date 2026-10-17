import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { radius, useTheme } from "../theme";
import { Icon } from "./Icon";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  /** Hay un cambio en curso: se bloquean los botones y se muestra un indicador. */
  pending?: boolean;
  /** Nombre del producto, para lectores de pantalla. */
  label: string;
}

const TARGET = 48; // Mínimo táctil de Android (Material): 48 × 48 dp.

/**
 * Selector de cantidad con objetivos de 48 dp. El "−" se detiene en el mínimo
 * en vez de convertirse en papelera: quitar un producto es otra acción.
 */
export function QuantityStepper({ value, min = 1, max, onChange, pending, label }: QuantityStepperProps) {
  const t = useTheme();
  const canDec = !pending && value > min;
  const canInc = !pending && value < max;

  const step = (icon: "remove" | "add", enabled: boolean, next: number, a11y: string) => (
    <Pressable
      onPress={() => enabled && onChange(next)}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({
        width: TARGET,
        height: TARGET,
        borderRadius: radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? t.gray200 : "transparent",
      })}
    >
      <Icon name={icon} size={20} color={enabled ? t.textPrimary : t.gray300} />
    </Pressable>
  );

  return (
    <View
      accessibilityLabel={`Cantidad de ${label}: ${value}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: TARGET,
        borderRadius: radius.full,
        backgroundColor: t.bgInput,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      {step("remove", canDec, value - 1, `Quitar uno de ${label}`)}
      <View style={{ minWidth: 28, alignItems: "center" }}>
        {pending ? (
          <ActivityIndicator size="small" color={t.primary} />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary }}>{value}</Text>
        )}
      </View>
      {step("add", canInc, value + 1, `Agregar uno de ${label}`)}
    </View>
  );
}
