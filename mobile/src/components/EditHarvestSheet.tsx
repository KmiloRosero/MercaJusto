import React, { useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { fontSize, formatCOP, radius, spacing, type, useTheme } from "../theme";
import { apiErrorMessage, updateProduct } from "../api/client";
import type { Product } from "../api/types";
import { toast } from "../store/toast";
import { useAuth } from "../store/auth";

const DISCOUNTS = [10, 20, 30];

interface Props {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

/**
 * Lo que cambia día a día en una cosecha publicada: precio, cantidad y modo
 * excedente. Nombre, categoría y foto se quedan como se publicaron.
 */
export function EditHarvestSheet({ product, visible, onClose }: Props) {
  const t = useTheme();
  const queryClient = useQueryClient();
  // El perfil del productor lista sus cosechas desde la sesión
  const refreshUser = useAuth((s) => s.refresh);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [isSurplus, setIsSurplus] = useState(product.isSurplus);
  const [discountPct, setDiscountPct] = useState(product.discountPct || 20);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unit = product.unit.toLowerCase();
  const numPrice = Number(price);
  const finalPrice = isSurplus ? Math.round(numPrice * (1 - discountPct / 100)) : numPrice;
  const discounts = DISCOUNTS.includes(discountPct) ? DISCOUNTS : [...DISCOUNTS, discountPct].sort((a, b) => a - b);

  const inputStyle = {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: t.bgInput,
    borderWidth: 1.5,
    borderColor: t.border,
    fontSize: fontSize.base,
    color: t.textPrimary,
  } as const;
  const labelStyle = { fontSize: fontSize.sm, color: t.textSecondary, marginBottom: 6, fontWeight: "500" } as const;

  const save = async () => {
    if (!(numPrice > 0)) return setError(`Escribe el precio por ${unit}.`);
    if (stock === "" || !(Number(stock) >= 0)) return setError("Escribe cuánto tienes para vender (0 si se agotó).");
    setError(null);
    setSaving(true);
    try {
      await updateProduct(product.id, {
        price: Math.round(numPrice),
        stock: Math.floor(Number(stock)),
        isSurplus,
        discountPct: isSurplus ? discountPct : 0,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product", product.id] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        refreshUser(),
      ]);
      toast.success("Cambios guardados");
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Editar ${product.name.toLowerCase()}`}>
      <View style={{ gap: spacing[4] }}>
        <View>
          <Text style={labelStyle}>Precio por {unit}</Text>
          <View style={{ justifyContent: "center" }}>
            <Text style={{ position: "absolute", left: spacing[4], fontSize: fontSize.base, color: t.textSecondary }}>
              $
            </Text>
            <TextInput
              value={price}
              onChangeText={(v) => setPrice(v.replace(/\D/g, ""))}
              keyboardType="number-pad"
              accessibilityLabel={`Precio por ${unit}`}
              style={{ ...inputStyle, paddingLeft: spacing[4] + 14 }}
            />
          </View>
        </View>

        <View>
          <Text style={labelStyle}>Cantidad disponible ({unit})</Text>
          <TextInput
            value={stock}
            onChangeText={(v) => setStock(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            accessibilityLabel={`Cantidad disponible en ${unit}`}
            style={inputStyle}
          />
          <Text style={[type.footnote, { color: t.textTertiary, marginTop: 6, fontWeight: "400" }]}>
            Pon 0 si se agotó: deja de venderse sin borrar la publicación.
          </Text>
        </View>

        <View style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="leaf" size={18} color={t.accent} />
                <Text style={{ fontSize: fontSize.base, fontWeight: "800", color: t.textPrimary }}>Modo excedente</Text>
              </View>
              <Text style={[type.footnote, { color: t.textSecondary, marginTop: 2, fontWeight: "400" }]}>
                Un descuento para vender lo que te sobró antes de que se pierda.
              </Text>
            </View>
            <Switch
              value={isSurplus}
              onValueChange={setIsSurplus}
              trackColor={{ true: t.accent, false: t.gray300 }}
              thumbColor={isSurplus ? t.onAccent : t.bgCard}
              accessibilityLabel="Modo excedente"
            />
          </View>

          {isSurplus ? (
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              {discounts.map((d) => {
                const selected = d === discountPct;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDiscountPct(d)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderColor: selected ? t.accent : t.border,
                      backgroundColor: selected ? t.accentLight : t.bgPrimary,
                    }}
                  >
                    <Text
                      style={{ fontSize: fontSize.base, fontWeight: "800", color: selected ? t.onAccentLight : t.textSecondary }}
                    >
                      -{d} %
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {numPrice > 0 ? (
            <Text style={[type.callout, { color: t.textPrimary }]}>
              El comprador paga {formatCOP(finalPrice)} por {unit}
              {isSurplus ? <Text style={{ color: t.textTertiary, fontWeight: "400" }}> · antes {formatCOP(numPrice)}</Text> : null}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={{ flexDirection: "row", gap: spacing[2], alignItems: "flex-start" }}>
            <Icon name="alert-circle" size={18} color={t.danger} />
            <Text style={[type.footnote, { flex: 1, color: t.danger }]}>{error}</Text>
          </View>
        ) : null}

        <Button title="Guardar cambios" onPress={save} loading={saving} full size="lg" />
      </View>
    </BottomSheet>
  );
}
