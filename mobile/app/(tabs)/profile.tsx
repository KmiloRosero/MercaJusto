import React, { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon, IconName } from "../../src/components/Icon";
import { AddressSheet } from "../../src/components/AddressSheet";
import { fontSize, formatCOP, radius, spacing, useTheme, useThemeScheme } from "../../src/theme";
import { useAuth } from "../../src/store/auth";
import { useThemePreference } from "../../src/store/theme";
import { getFairPriceMetrics, getProducts } from "../../src/api/client";
import { confirmDialog, showAlert } from "../../src/lib/dialog";
import { effectivePrice } from "../../src/lib/pricing";

export default function Profile() {
  const router = useRouter();
  const t = useTheme();
  const themeScheme = useThemeScheme();
  const setThemeMode = useThemePreference((s) => s.setMode);
  const { user, logout, refresh } = useAuth();
  const [addressesOpen, setAddressesOpen] = useState(false);

  const isProducer = user?.role === "PRODUCER";
  const isBuyer = user?.role === "BUYER";

  const { data: myProducts } = useQuery({
    queryKey: ["products", "mine", user?.id],
    queryFn: () => getProducts({ producerId: user!.id, limit: 50 }),
    enabled: isProducer && !!user,
  });

  const { data: metrics } = useQuery({
    queryKey: ["orders", "metrics", user?.id],
    queryFn: getFairPriceMetrics,
    enabled: !!user && (isBuyer || isProducer),
  });

  const onLogout = async () => {
    const ok = await confirmDialog("Cerrar sesión", "¿Seguro que quieres salir?", {
      confirmText: "Salir",
      destructive: true,
    });
    if (!ok) return;
    await logout();
    router.replace("/(auth)/onboarding");
  };

  if (!user) return null;

  const products = myProducts?.products ?? [];
  const roleLabel = isProducer ? "Productor" : user.role === "COURIER" ? "Repartidor" : "Comprador";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar title="Mi perfil" />

      <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[10] }}>
        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: radius.xl,
            padding: spacing[5],
            alignItems: "center",
            gap: spacing[2],
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: t.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing[2],
              borderWidth: 2,
              borderColor: t.primary,
            }}
          >
            <Text style={{ fontSize: 36, fontWeight: "800", color: t.primary }}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: t.textPrimary }}>{user.name}</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Icon name="call" size={14} color={t.textSecondary} />
            <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>{user.phone}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[2] }}>
            <Pill variant={isProducer ? "success" : "primary"} icon={isProducer ? "preparing" : "cart"}>
              {roleLabel}
            </Pill>
            {user.ratingCount > 0 ? (
              <Pill variant="warning" icon="star">
                {user.rating.toFixed(1)} ({user.ratingCount})
              </Pill>
            ) : null}
          </View>
        </View>

        {/* Impacto del precio justo */}
        {metrics && metrics.ordersCount > 0 ? (
          <View
            style={{
              backgroundColor: t.bgCard,
              borderRadius: radius.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: t.border,
              gap: spacing[3],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="trending-up" size={18} color={t.success} />
              <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                {isProducer ? "Tus ventas directas" : "Tu impacto con MercaJusto"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              {isProducer ? (
                <>
                  <StatBox label="Ingresos" value={formatCOP(metrics.totals.producerRevenue)} color={t.success} />
                  <StatBox label="Pedidos" value={String(metrics.ordersCount)} color={t.primary} />
                </>
              ) : (
                <>
                  <StatBox label="Ahorro vs. plaza" value={formatCOP(metrics.totals.buyerSavingsTotal)} color={t.success} />
                  <StatBox label="Pedidos" value={String(metrics.ordersCount)} color={t.primary} />
                </>
              )}
            </View>
            <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
              {isProducer
                ? "Recibes el 100% del precio de tu cosecha: sin intermediarios."
                : `Pagaste ${metrics.totals.buyerSavingsPct}% menos que en plaza y el dinero llegó directo al campo.`}
            </Text>
          </View>
        ) : null}

        {isProducer ? (
          <View
            style={{
              backgroundColor: t.bgCard,
              borderRadius: radius.lg,
              padding: spacing[4],
              borderWidth: 1,
              borderColor: t.border,
              gap: spacing[3],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="storefront" size={18} color={t.primary} />
              <Text style={{ flex: 1, fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>
                Mis cosechas publicadas
              </Text>
              <Pill variant="primary">{products.length} activas</Pill>
            </View>

            {products.length === 0 ? (
              <Text style={{ fontSize: fontSize.sm, color: t.textSecondary }}>
                Aún no has publicado cosechas. ¡Publica la primera!
              </Text>
            ) : (
              products.slice(0, 6).map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/producto/${p.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[3],
                    paddingVertical: spacing[2],
                    borderTopWidth: 1,
                    borderTopColor: t.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Icon name={p.category?.name || "leaf"} size={22} color={t.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>{p.name}</Text>
                    <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>
                      {formatCOP(effectivePrice(p))}/{p.unit} · Stock {p.stock}
                      {p.isSurplus ? ` · Excedente -${p.discountPct}%` : ""}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={t.textTertiary} />
                </Pressable>
              ))
            )}

            <Button
              title="Publicar nueva cosecha"
              variant="accent"
              full
              icon={<Icon name="add" size={20} color="#FFFFFF" />}
              onPress={() => router.push("/publicar-cosecha")}
            />
          </View>
        ) : null}

        <View
          style={{
            backgroundColor: t.bgCard,
            borderRadius: radius.lg,
            padding: spacing[4],
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.primaryLight,
            }}
          >
            <Icon name={themeScheme === "dark" ? "moon" : "sunny"} size={20} color={t.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }}>Modo oscuro</Text>
            <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
              {themeScheme === "dark" ? "Apariencia oscura activa" : "Apariencia clara activa"}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Activar modo oscuro"
            value={themeScheme === "dark"}
            onValueChange={(enabled) => setThemeMode(enabled ? "dark" : "light")}
            trackColor={{ false: t.gray300, true: t.primary }}
            thumbColor={t.bgPrimary}
          />
        </View>

        <View style={{ gap: spacing[2] }}>
          <MenuItem
            icon="location-outline"
            label={isProducer ? "Mis direcciones y fincas" : "Mis direcciones de entrega"}
            hint={`${user.addresses.length} guardada${user.addresses.length !== 1 ? "s" : ""}`}
            onPress={() => setAddressesOpen(true)}
          />
          <MenuItem
            icon="receipt-outline"
            label={isBuyer ? "Mis pedidos" : "Mis ventas"}
            onPress={() => router.push("/(tabs)/orders")}
          />
          <MenuItem
            icon="card-outline"
            label="Métodos de pago"
            onPress={() =>
              showAlert(
                "Métodos de pago",
                "Nequi y Daviplata: pago inmediato desde tu billetera.\nEfectivo: pagas al recibir el pedido."
              )
            }
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Garantía de precio justo"
            onPress={() =>
              showAlert(
                "Precio justo",
                "El productor fija su precio y lo recibe completo. MercaJusto cobra solo una comisión del 5% y el envío agrupado, así el comprador paga menos que en plaza."
              )
            }
          />
          <MenuItem
            icon="document-text-outline"
            label="Términos y condiciones"
            onPress={() =>
              showAlert(
                "Términos y condiciones",
                "MercaJusto conecta productores campesinos de Nariño con compradores. Los datos personales se usan solo para gestionar pedidos y entregas."
              )
            }
          />
        </View>

        <Button
          title="Cerrar sesión"
          variant="outline"
          full
          icon={<Icon name="log-out-outline" size={18} color={t.primary} />}
          onPress={onLogout}
        />

        <Text style={{ textAlign: "center", color: t.textTertiary, fontSize: fontSize.xs, marginTop: spacing[2] }}>
          MercaJusto v1.0.0 · Hecho en Nariño, Colombia
        </Text>
      </ScrollView>

      <AddressSheet
        visible={addressesOpen}
        addresses={user.addresses}
        selectedId={(user.addresses.find((a) => a.isDefault) ?? user.addresses[0])?.id ?? null}
        onSelect={() => {}}
        onClose={() => setAddressesOpen(false)}
        onCreated={() => refresh()}
        onDeleted={() => refresh()}
      />
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.bgSecondary,
        borderRadius: radius.md,
        padding: spacing[3],
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: t.textTertiary, textAlign: "center", marginTop: 2, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName | string;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: t.bgCard,
        borderRadius: radius.md,
        padding: spacing[4],
        gap: spacing[3],
        borderWidth: 1,
        borderColor: t.border,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Icon name={icon} size={20} color={t.primary} />
      <Text style={{ flex: 1, fontSize: fontSize.base, color: t.textPrimary, fontWeight: "600" }}>{label}</Text>
      {hint ? <Text style={{ fontSize: fontSize.xs, color: t.textTertiary }}>{hint}</Text> : null}
      <Icon name="chevron-forward" size={18} color={t.textTertiary} />
    </Pressable>
  );
}
