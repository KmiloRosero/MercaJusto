import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { FreshnessOffer } from "./FreshnessOffer";
import { expiresAtFor, spoilDaysFrom } from "../lib/freshness";
import { fontSize, radius, spacing, type, useTheme } from "../theme";
import { apiErrorMessage, updateProduct } from "../api/client";
import type { Product } from "../api/types";
import { toast } from "../store/toast";
import { useAuth } from "../store/auth";

interface Props {
  product: Product;
  visible: boolean;
  onClose: () => void;
}

/**
 * Lo que cambia día a día en una cosecha publicada: precio, cantidad, si se
 * daña pronto (con su oferta) y modo excedente. Nombre, categoría y foto se quedan como se publicaron.
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
  const [spoilsIn, setSpoilsIn] = useState<number | null>(spoilDaysFrom(product.expiresAt));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unit = product.unit.toLowerCase();
  const numPrice = Number(price);

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
        expiresAt: spoilsIn !== null ? expiresAtFor(spoilsIn) : null,
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

        <FreshnessOffer
          spoilsIn={spoilsIn}
          onSpoilsIn={setSpoilsIn}
          isSurplus={isSurplus}
          onSurplus={setIsSurplus}
          discountPct={discountPct}
          onDiscount={setDiscountPct}
          price={numPrice || 0}
          unit={unit}
        />

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
