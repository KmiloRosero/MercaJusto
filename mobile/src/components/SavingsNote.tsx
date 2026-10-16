import React from "react";
import { Text, View } from "react-native";
import { formatCOP, radius, spacing, type, useTheme } from "../theme";
import { Icon } from "./Icon";

/**
 * Para qué es la comisión. El backend paga al productor el subtotal completo
 * (producerRevenue) y el 5 % se suma aparte: no sale del precio del campesino.
 */
export function FeeExplainer() {
  const t = useTheme();
  return (
    <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
      El productor recibe completo el precio de su cosecha; la comisión sostiene la plataforma.
    </Text>
  );
}

/**
 * Ahorro frente a la plaza de mercado. Va fuera de la suma del total: es una
 * comparación, no un descuento. Si no hay ahorro real, no se muestra.
 */
export function SavingsNote({ amount }: { amount: number }) {
  const t = useTheme();
  if (amount <= 0) return null;
  return (
    <View
      accessible
      accessibilityLabel={`Ahorras ${formatCOP(amount)} frente a la plaza de mercado`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[3],
        borderRadius: radius.md,
        backgroundColor: t.successLight,
      }}
    >
      <Icon name="leaf" size={16} color={t.success} />
      <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "400", flex: 1 }]}>
        Ahorras <Text style={{ fontWeight: "700", color: t.success }}>{formatCOP(amount)}</Text> frente a la plaza de mercado
      </Text>
    </View>
  );
}
