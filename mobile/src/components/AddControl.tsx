import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { motion, radius, useTheme } from "../theme";
import { Product } from "../api/types";
import { useCart } from "../store/cart";
import { toast } from "../store/toast";
import { Icon } from "./Icon";

const HEIGHT = 36;
const motionEasing = Easing.bezier(...motion.easeOut);
// La píldora mide 36 dp; el área de toque llega a 48 con el hitSlop.
const SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

interface InlineStepperProps {
  value: number;
  max: number;
  label: string;
  pending?: boolean;
  onChange: (next: number) => void;
  /** Con 1 unidad, el "−" se vuelve papelera y quita el producto. */
  onRemove: () => void;
}

/**
 * Contador verde en píldora, al estilo de las apps de domicilio: "−  2  +".
 * Con una sola unidad el botón izquierdo es una papelera.
 */
export function InlineStepper({ value, max, label, pending, onChange, onRemove }: InlineStepperProps) {
  const t = useTheme();
  const atOne = value <= 1;
  const canInc = !pending && value < max;

  const button = (icon: string, onPress: () => void, enabled: boolean, a11y: string) => (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      hitSlop={SLOP}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({
        width: 36,
        height: HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        opacity: !enabled ? 0.45 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={icon === "trash-outline" ? 17 : 20} color={t.onPrimary} />
    </Pressable>
  );

  return (
    <View
      accessibilityLabel={`${label}: ${value} en la canasta`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: HEIGHT,
        borderRadius: radius.full,
        backgroundColor: t.primary,
      }}
    >
      {atOne
        ? button("trash-outline", onRemove, !pending, `Quitar ${label} de la canasta`)
        : button("remove", () => onChange(value - 1), !pending, `Quitar uno de ${label}`)}
      <View style={{ minWidth: 22, alignItems: "center" }}>
        {pending ? (
          <ActivityIndicator size="small" color={t.onPrimary} />
        ) : (
          <Text style={{ color: t.onPrimary, fontSize: 15, fontWeight: "800" }}>{value}</Text>
        )}
      </View>
      {button("add", () => onChange(value + 1), canInc, `Agregar uno de ${label}`)}
    </View>
  );
}

/**
 * Botón "+" de la tarjeta de producto. Al agregar se convierte en el contador
 * en el mismo lugar, sin salir de la lista; la barra "Ver canasta" confirma.
 */
export function AddControl({ product }: { product: Product }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const item = useCart((s) => s.items.find((it) => it.productId === product.id));
  const pending = useCart((s) => (item ? !!s.pendingIds[item.id] : false));
  const add = useCart((s) => s.add);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const [adding, setAdding] = useState(false);

  const onAdd = async () => {
    if (adding) return;
    setAdding(true);
    const ok = await add(product.id, 1);
    setAdding(false);
    if (!ok) {
      toast.error(useCart.getState().error ?? "No se pudo agregar a la canasta");
      useCart.setState({ error: null });
    }
  };

  const layout = reduceMotion ? undefined : LinearTransition.duration(200).easing(motionEasing);
  const entering = reduceMotion ? undefined : FadeIn.duration(160);
  const exiting = reduceMotion ? undefined : FadeOut.duration(100);

  if (item) {
    return (
      <Animated.View key="stepper" layout={layout} entering={entering} exiting={exiting}>
        <InlineStepper
          value={item.quantity}
          max={product.stock}
          label={product.name}
          pending={pending}
          onChange={(q) => updateQty(item.id, q)}
          onRemove={() => remove(item)}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View key="add" layout={layout} entering={entering} exiting={exiting}>
      <Pressable
        onPress={onAdd}
        hitSlop={SLOP}
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${product.name} a la canasta`}
        style={({ pressed }) => ({
          width: HEIGHT,
          height: HEIGHT,
          borderRadius: radius.full,
          backgroundColor: t.primary,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.9 : 1 }],
          shadowColor: "#0A140E",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 3,
        })}
      >
        {adding ? (
          <ActivityIndicator size="small" color={t.onPrimary} />
        ) : (
          <Icon name="add" size={22} color={t.onPrimary} />
        )}
      </Pressable>
    </Animated.View>
  );
}
