import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "../src/components/TopBar";
import { Button } from "../src/components/Button";
import { AddressSheet } from "../src/components/AddressSheet";
import { fontSize, radius, spacing, useTheme, formatCOP, shadow } from "../src/theme";
import { Address, PaymentMethod } from "../src/api/types";
import { createOrder, apiErrorMessage } from "../src/api/client";
import { useAuth } from "../src/store/auth";
import { useCart } from "../src/store/cart";

const PAYMENT_METHODS: Array<{
  key: PaymentMethod;
  icon: string;
  name: string;
  desc: string;
}> = [
  { key: "NEQUI", icon: "📱", name: "Nequi", desc: "Pago instantáneo" },
  { key: "DAVIPLATA", icon: "💳", name: "Daviplata", desc: "Billetera digital" },
  { key: "CASH", icon: "💵", name: "Efectivo contraentrega", desc: "Pagas al recibir tu pedido" },
];

const DELIVERY_FEE = 3500;
const PLATFORM_FEE_PCT = 0.05;
const SAVINGS_PCT = 0.35;

export default function Checkout() {
  const router = useRouter();
  const t = useTheme();
  const { user, refresh } = useAuth();
  const { items, subtotal, fetch: fetchCart, clear: clearCart } = useCart();

  const addresses = user?.addresses ?? [];

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("NEQUI");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Auto-seleccionar dirección por defecto
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddress(def);
    }
  }, [addresses, selectedAddress]);

  // Si el carrito está vacío y no estamos cargando, devolver
  useEffect(() => {
    if (items.length === 0 && !submitting) {
      // Pequeño delay para permitir que fetchCart termine
      const id = setTimeout(() => {
        if (useCart.getState().items.length === 0) {
          Alert.alert("Carrito vacío", "Agrega productos antes de finalizar la compra.", [
            { text: "OK", onPress: () => router.replace("/(tabs)/home") },
          ]);
        }
      }, 500);
      return () => clearTimeout(id);
    }
  }, [items.length, router, submitting]);

  const platformFee = Math.round(subtotal * PLATFORM_FEE_PCT);
  const total = subtotal + DELIVERY_FEE + platformFee;
  const savings = Math.round(subtotal * SAVINGS_PCT);

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
      // El backend ya vació el carrito y descontó stock; sincronizamos el store local
      await clearCart();
      await refresh();
      router.replace(`/seguimiento/${order.id}`);
    } catch (err) {
      Alert.alert("No se pudo crear el pedido", apiErrorMessage(err));
      setSubmitting(false);
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
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ Dirección de entrega ═══ */}
        <SectionCard title="📍 Entregar en">
          {selectedAddress ? (
            <Pressable
              onPress={() => setAddressSheetOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2] }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.md,
                  backgroundColor: t.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>📍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.textPrimary }}>
                  {selectedAddress.vereda ? `${selectedAddress.vereda}, ` : ""}
                  {selectedAddress.municipio}
                </Text>
                <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }} numberOfLines={2}>
                  {[selectedAddress.label, selectedAddress.detail].filter(Boolean).join(" — ")}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: t.primary, fontWeight: "600" }}>Cambiar</Text>
            </Pressable>
          ) : (
            <Button
              title={addresses.length === 0 ? "+ Agregar dirección de entrega" : "Seleccionar dirección"}
              variant="outline"
              full
              onPress={() => setAddressSheetOpen(true)}
            />
          )}
        </SectionCard>

        {/* ═══ Método de pago ═══ */}
        <SectionCard title="💳 Método de pago">
          <View style={{ gap: spacing[2] }}>
            {PAYMENT_METHODS.map((m) => {
              const selected = payment === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setPayment(m.key)}
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
                      backgroundColor: t.bgSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: t.textPrimary }}>{m.name}</Text>
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
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF" }} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        {/* ═══ Resumen del pedido ═══ */}
        <SectionCard title="🧺 Resumen">
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
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
                    backgroundColor: t.bgSecondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{it.product.category?.icon || "🌾"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: t.textPrimary }}>
                    {it.product.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: t.textTertiary }}>
                    {it.quantity} {it.product.unit} · {it.product.producer?.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.textPrimary }}>
                  {formatCOP(it.product.price * it.quantity)}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: spacing[3], gap: spacing[1] }}>
            <TotalRow label="Subtotal" value={formatCOP(subtotal)} color={t.textSecondary} />
            <TotalRow label="Envío" value={formatCOP(DELIVERY_FEE)} color={t.textSecondary} />
            <TotalRow
              label="Comisión plataforma (5%)"
              value={formatCOP(platformFee)}
              color={t.textTertiary}
              small
            />
            <TotalRow
              label="💚 Ahorro vs. tienda"
              value={`− ${formatCOP(savings)}`}
              color={t.success}
              small
            />
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
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.textPrimary }}>Total</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: t.primary }}>
                {formatCOP(total)}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* ═══ Notas ═══ */}
        <SectionCard title="📝 Notas para el productor o repartidor (opcional)">
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
          <Text style={{ fontSize: 11, color: t.textTertiary, marginTop: 4, textAlign: "right" }}>
            {notes.length}/300
          </Text>
        </SectionCard>
      </ScrollView>

      {/* ═══ CTA fijo ═══ */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing[4],
          backgroundColor: t.bgPrimary,
          borderTopWidth: 1,
          borderTopColor: t.border,
          ...shadow.lg,
        }}
      >
        <Button
          title={submitting ? "Procesando..." : `Pagar ${formatCOP(total)}`}
          onPress={onConfirm}
          disabled={!canSubmit}
          loading={submitting}
          full
          size="lg"
        />
        {!selectedAddress ? (
          <Text style={{ fontSize: 11, color: t.danger, textAlign: "center", marginTop: 6 }}>
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.bgPrimary,
        borderRadius: radius.lg,
        padding: spacing[4],
        ...shadow.sm,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: t.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: spacing[3],
        }}
      >
        {title}
      </Text>
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
      <Text style={{ fontSize: small ? 12 : 13, fontWeight: "600", color }}>{value}</Text>
    </View>
  );
}
