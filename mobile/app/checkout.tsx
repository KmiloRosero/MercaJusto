import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { AddressSheet } from "../src/components/AddressSheet";
import { Icon, IconName } from "../src/components/Icon";
import { fontSize, radius, spacing, type, useTheme, formatCOP, shadow } from "../src/theme";
import { Address, PaymentMethod } from "../src/api/types";
import { createOrder, apiErrorMessage } from "../src/api/client";
import { success } from "../src/lib/haptics";
import { useAuth } from "../src/store/auth";
import { useCart } from "../src/store/cart";
import { cartSavings } from "../src/lib/savings";
import { effectivePrice, orderTotals } from "../src/lib/pricing";
import { showAlert } from "../src/lib/dialog";
import { payOnline } from "../src/lib/payOnline";

import { FieldTile } from "../src/components/FieldTile";
import { FeeExplainer, SavingsNote } from "../src/components/SavingsNote";
import { PressableScale } from "../src/components/PressableScale";
const PAYMENT_METHODS: {
  key: PaymentMethod;
  icon: IconName;
  name: string;
  desc: string;
}[] = [
  { key: "WOMPI", icon: "card-outline", name: "Pago en línea", desc: "Nequi, PSE o tarjeta, con Wompi" },
  { key: "CASH", icon: "cash-outline", name: "Efectivo contraentrega", desc: "Pagas al recibir tu cosecha" },
];

export default function Checkout() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const { items, subtotal, fetch: fetchCart } = useCart();

  const addresses = user?.addresses ?? [];

  // Sin elección explícita, se usa la dirección predeterminada (o la primera)
  const [pickedAddress, setSelectedAddress] = useState<Address | null>(null);
  const selectedAddress =
    pickedAddress ?? addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("WOMPI");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (items.length === 0 && !submitting) {
      const id = setTimeout(() => {
        // Solo si la canasta cargó de verdad: un fallo de red no es "canasta vacía".
        const cart = useCart.getState();
        if (cart.loaded && cart.items.length === 0) {
          showAlert("Canasta vacía", "Agrega productos antes de finalizar la compra.").then(() =>
            router.replace("/(tabs)/home")
          );
        }
      }, 500);
      return () => clearTimeout(id);
    }
  }, [items.length, router, submitting]);

  const { deliveryFee, platformFee, total } = orderTotals(subtotal);
  const savings = cartSavings(items);

  const canSubmit = !!selectedAddress && items.length > 0 && !submitting;

  const onConfirm = async () => {
    if (!selectedAddress) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        deliveryAddressId: selectedAddress.id,
        paymentMethod: payment,
        notes: notes.trim() || undefined,
      });
      // El backend ya vació la canasta al crear el pedido
      useCart.setState({ items: [], subtotal: 0, error: null });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (payment === "WOMPI") {
        try {
          if ((await payOnline(order.id)) === "PAID") success();
        } catch {
          // El pedido ya existe: desde el seguimiento se puede volver a intentar el pago
        }
      } else {
        success();
      }
      await refresh();
      router.replace(`/seguimiento/${order.id}?nuevo=1`);
    } catch (err) {
      setSubmitting(false);
      await showAlert("No se pudo crear el pedido", apiErrorMessage(err));
      fetchCart();
    }
  };

  const onAddressCreated = async (addr: Address) => {
    setSelectedAddress(addr);
    await refresh();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Finalizar compra" />

      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 150 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dirección de entrega */}
        <SectionCard title="Dirección de entrega" icon="location">
          {selectedAddress ? (
            <PressableScale
              onPress={() => setAddressSheetOpen(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                paddingVertical: spacing[2],
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: radius.md,
                  backgroundColor: t.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="location" size={22} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
                  {selectedAddress.vereda ? `${selectedAddress.vereda}, ` : ""}
                  {selectedAddress.municipio}
                </Text>
                <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }} numberOfLines={2}>
                  {[selectedAddress.label, selectedAddress.detail].filter(Boolean).join(" — ")}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: t.primary, fontWeight: "700" }}>Cambiar</Text>
            </PressableScale>
          ) : (
            <Button
              title={addresses.length === 0 ? "+ Agregar dirección de entrega" : "Seleccionar dirección"}
              variant="outline"
              full
              onPress={() => setAddressSheetOpen(true)}
            />
          )}
        </SectionCard>

        {/* Método de pago */}
        <SectionCard title="Método de pago" icon="wallet-outline">
          <View style={{ gap: spacing[2] }}>
            {PAYMENT_METHODS.map((m) => {
              const selected = payment === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setPayment(m.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${m.name}. ${m.desc}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[3],
                    padding: spacing[3],
                    borderRadius: radius.lg,
                    borderWidth: 1.5,
                    borderColor: selected ? t.primary : t.border,
                    backgroundColor: selected ? t.primaryLight : t.bgPrimary,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: selected ? t.primary : t.bgSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={m.icon} size={20} color={selected ? t.onPrimary : t.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>{m.name}</Text>
                    <Text style={{ fontSize: 12, color: t.textSecondary }}>{m.desc}</Text>
                  </View>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: radius.full,
                      borderWidth: 2,
                      borderColor: selected ? t.primary : t.border,
                      backgroundColor: selected ? t.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.onPrimary }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], marginTop: spacing[3] }}>
            <Icon name="shield-checkmark-outline" size={16} color={t.textSecondary} />
            <Text style={{ flex: 1, fontSize: 13, color: t.textSecondary, lineHeight: 18 }}>
              Puedes cancelar el pedido hasta que el productor empiece a prepararlo.
            </Text>
          </View>
          {payment === "WOMPI" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], marginTop: spacing[2] }}>
              <Icon name="information-circle-outline" size={16} color={t.textSecondary} />
              <Text style={{ flex: 1, fontSize: 13, color: t.textSecondary, lineHeight: 18 }}>
                Al confirmar abrimos Wompi para que pagues. Tus productos quedan apartados 30 minutos.
              </Text>
            </View>
          ) : null}
        </SectionCard>

        {/* Resumen del pedido */}
        <SectionCard title="Resumen del pedido" icon="cart">
          <View style={{ gap: spacing[1] }}>
            {items.map((it) => (
              <View
                key={it.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[3],
                  paddingVertical: spacing[2],
                  borderBottomWidth: 1,
                  borderBottomColor: t.border,
                }}
              >
                <FieldTile category={it.product.category} size={40} iconSize={20} radius={radius.sm} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: t.textPrimary }}>
                    {it.product.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: t.textTertiary }}>
                    {it.quantity} {it.product.unit} · {it.product.producer?.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: t.textPrimary }}>
                  {formatCOP(effectivePrice(it.product) * it.quantity)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: spacing[3], gap: spacing[1] }}>
            <TotalRow label="Subtotal" value={formatCOP(subtotal)} color={t.textSecondary} />
            <TotalRow label="Envío agrupado" value={formatCOP(deliveryFee)} color={t.textSecondary} />
            <TotalRow label="Comisión MercaJusto (5 %)" value={formatCOP(platformFee)} color={t.textSecondary} />
            <FeeExplainer />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: spacing[3],
                marginTop: spacing[2],
                borderTopWidth: 2,
                borderTopColor: t.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary }}>Total a pagar</Text>
              <Text style={{ fontSize: 22, fontWeight: "800", color: t.textPrimary }}>
                {formatCOP(total)}
              </Text>
            </View>
            <View style={{ marginTop: spacing[2] }}>
              <SavingsNote amount={savings} />
            </View>
          </View>
        </SectionCard>

        {/* Notas adicionales */}
        <SectionCard title="Notas de entrega (opcional)" icon="create-outline">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej. Entregar después de las 2pm, llamar al llegar..."
            placeholderTextColor={t.textTertiary}
            multiline
            maxLength={300}
            style={{
              minHeight: 72,
              padding: spacing[3],
              borderRadius: radius.md,
              backgroundColor: t.bgInput,
              borderWidth: 1.5,
              borderColor: t.border,
              fontSize: fontSize.sm,
              color: t.textPrimary,
              textAlignVertical: "top",
            }}
          />
          <Text style={[type.footnote, { fontWeight: "400", color: t.textTertiary, marginTop: 4, textAlign: "right" }]}>
            {notes.length}/300
          </Text>
        </SectionCard>
      </ScrollView>

      {/* CTA Fijo */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing[4],
          paddingBottom: spacing[4] + insets.bottom,
          backgroundColor: t.bgPrimary,
          borderTopWidth: 1,
          borderTopColor: t.border,
          ...shadow.lg,
        }}
      >
        <Button
          title={submitting ? "Procesando…" : `Confirmar pedido · ${formatCOP(total)}`}
          icon={<Icon name="checkmark-circle" size={20} color={t.onPrimary} />}
          onPress={onConfirm}
          disabled={!canSubmit}
          loading={submitting}
          full
          size="lg"
        />
        {!selectedAddress ? (
          <Text style={[type.footnote, { color: t.danger, textAlign: "center", marginTop: 6, fontWeight: "600" }]}>
            Selecciona una dirección de entrega para continuar
          </Text>
        ) : null}
      </View>

      <AddressSheet
        visible={addressSheetOpen}
        addresses={addresses}
        selectedId={selectedAddress?.id ?? null}
        onSelect={setSelectedAddress}
        onClose={() => setAddressSheetOpen(false)}
        onCreated={onAddressCreated}
      />
    </SafeAreaView>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon?: IconName; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.bgPrimary,
        borderRadius: radius.lg,
        padding: spacing[4],
        borderWidth: 1,
        borderColor: t.border,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing[3] }}>
        {icon ? <Icon name={icon} size={18} color={t.primary} /> : null}
        <Text style={[type.headline, { fontSize: 16, color: t.textPrimary }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function TotalRow({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color: string;
  small?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontSize: small ? 12 : 13, color }}>{label}</Text>
      <Text style={{ fontSize: small ? 12 : 13, fontWeight: "700", color }}>{value}</Text>
    </View>
  );
}
