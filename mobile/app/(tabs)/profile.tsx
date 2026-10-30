import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon, IconName } from "../../src/components/Icon";
import { AddressSheet } from "../../src/components/AddressSheet";
import { formatCOP, radius, spacing, type, useTheme, useThemeScheme } from "../../src/theme";
import { useAuth } from "../../src/store/auth";
import { useThemePreference } from "../../src/store/theme";
import { getImpactMetrics, getProducts } from "../../src/api/client";
import { confirmDialog, showAlert } from "../../src/lib/dialog";
import { effectivePrice } from "../../src/lib/pricing";
import { producerUrl, shareText } from "../../src/lib/share";

import { FieldTile } from "../../src/components/FieldTile";
import { PressableScale } from "../../src/components/PressableScale";
import { Avatar } from "../../src/components/Avatar";
import { PageShader } from "../../src/components/PageShader";
import { useDockInset } from "../../src/components/ui/Dock";

/**
 * Perfil al estilo de las apps de domicilio: encabezado con la persona, su
 * impacto como entrada destacada y la configuración en filas planas.
 */
export default function Profile() {
  const router = useRouter();
  const t = useTheme();
  const dockInset = useDockInset();
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

  const { data: impact } = useQuery({
    queryKey: ["orders", "impact", user?.id],
    queryFn: getImpactMetrics,
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
  const totals = impact?.totals;
  const roleLabel = isProducer ? "Productor" : user.role === "COURIER" ? "Repartidor" : "Comprador";
  const section = { backgroundColor: t.bgPrimary, marginTop: spacing[2], paddingHorizontal: spacing[5], paddingVertical: spacing[5] } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <PageShader surface={t.bgSecondary} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[10] + dockInset }}>
        {/* Encabezado */}
        <View style={[section, { marginTop: 0, flexDirection: "row", alignItems: "center", gap: spacing[4] }]}>
          <Avatar name={user.name} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text accessibilityRole="header" numberOfLines={2} style={[type.title, { color: t.textPrimary }]}>
              {user.name}
            </Text>
            {user.email ? (
              <Text numberOfLines={1} style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                {user.email}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: spacing[2], marginTop: 2 }}>
              <Pill variant="primary" icon={isProducer ? "preparing" : user.role === "COURIER" ? "in_transit" : "cart"}>
                {roleLabel}
              </Pill>
              {/* La calificación solo tiene sentido para quien la recibe: productor y repartidor */}
              {!isBuyer && user.ratingCount > 0 ? (
                <Pill variant="warning" icon="star">
                  {user.rating.toFixed(1)} ({user.ratingCount})
                </Pill>
              ) : null}
            </View>
          </View>
        </View>

        {/* Impacto: entrada destacada a "Mi impacto" / "Mis ventas" */}
        {totals && totals.ordersCount > 0 ? (
          <View style={section}>
            <PressableScale
              onPress={() => router.push("/impacto")}
              accessibilityRole="button"
              accessibilityLabel={isProducer ? "Ver mis ventas" : "Ver mi impacto"}
              style={{ padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.primaryLight, gap: spacing[1] }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <Icon name={isProducer ? "trending-up" : "leaf"} size={18} color={t.onPrimaryLight} />
                <Text style={[type.callout, { flex: 1, color: t.onPrimaryLight }]}>
                  {isProducer ? "Mis ventas" : "Mi impacto"}
                </Text>
                <Icon name="chevron-forward" size={18} color={t.onPrimaryLight} />
              </View>
              <Text style={{ color: t.onPrimaryLight, fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.6 }}>
                {formatCOP(isProducer ? totals.total : totals.savings)}
              </Text>
              <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "400" }]}>
                {isProducer
                  ? `Recibidos en ${totals.ordersCount} pedidos, sin intermediarios.`
                  : `Ahorrados frente a la plaza, comprando a ${totals.people} productores.`}
              </Text>
            </PressableScale>
          </View>
        ) : null}

        {/* Cosechas del productor */}
        {isProducer ? (
          <View style={[section, { gap: spacing[2] }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <Text accessibilityRole="header" style={[type.headline, { flex: 1, color: t.textPrimary }]}>
                Mis cosechas publicadas
              </Text>
              <Pill variant="primary">{products.length} activas</Pill>
            </View>

            {products.length === 0 ? (
              <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                Aún no has publicado cosechas. ¡Publica la primera!
              </Text>
            ) : (
              products.slice(0, 6).map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => router.push(`/producto/${p.id}`)}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], paddingVertical: spacing[2] }}
                >
                  <FieldTile category={p.category} productName={p.name} size={48} iconSize={24} radius={radius.md} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.callout, { color: t.textPrimary }]}>{p.name}</Text>
                    <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
                      {formatCOP(effectivePrice(p))}/{p.unit} · Quedan {p.stock}
                      {p.isSurplus ? ` · Excedente -${p.discountPct} %` : ""}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={t.textTertiary} />
                </PressableScale>
              ))
            )}

            <View style={{ flexDirection: "row", gap: spacing[2], marginTop: spacing[2] }}>
              <Button
                title="Publicar cosecha"
                icon={<Icon name="add" size={20} color={t.onPrimary} />}
                onPress={() => router.push("/publicar-cosecha")}
                style={{ flex: 1 }}
              />
              <Button
                title="Compartir"
                variant="outline"
                icon={<Icon name="logo-whatsapp" size={18} color={t.primary} />}
                onPress={() => shareText(`Compra mi cosecha directo, sin intermediarios, en MercaJusto: ${producerUrl(user.id)}`)}
              />
            </View>
          </View>
        ) : null}

        {/* Configuración en filas planas */}
        <View style={{ backgroundColor: t.bgPrimary, marginTop: spacing[2] }}>
          <Row icon={themeScheme === "dark" ? "moon" : "sunny"} label="Modo oscuro">
            <Switch
              accessibilityLabel="Activar modo oscuro"
              value={themeScheme === "dark"}
              onValueChange={(enabled) => setThemeMode(enabled ? "dark" : "light")}
              trackColor={{ false: t.gray300, true: t.primary }}
              thumbColor={t.bgPrimary}
            />
          </Row>
          <Row
            icon="location-outline"
            label={isProducer ? "Mis direcciones y fincas" : "Mis direcciones de entrega"}
            hint={`${user.addresses.length}`}
            onPress={() => setAddressesOpen(true)}
          />
          {isBuyer || isProducer ? (
            <Row icon="leaf-outline" label={isProducer ? "Mis ventas" : "Mi impacto"} onPress={() => router.push("/impacto")} />
          ) : null}
          <Row
            icon="receipt-outline"
            label={isBuyer ? "Mis pedidos" : isProducer ? "Pedidos por atender" : "Mis entregas"}
            onPress={() => router.push("/(tabs)/orders")}
          />
          <Row icon="lock-closed-outline" label="Cambiar contraseña" onPress={() => router.push("/cambiar-contrasena")} />
          <Row
            icon="card-outline"
            label="Métodos de pago"
            onPress={() =>
              showAlert(
                "Métodos de pago",
                "En línea: pagas con Nequi, PSE o tarjeta a través de Wompi, al confirmar el pedido.\nEfectivo: pagas al recibir el pedido."
              )
            }
          />
          <Row
            icon="shield-checkmark-outline"
            label="Garantía de precio justo"
            onPress={() =>
              showAlert(
                "Precio justo",
                "El productor fija su precio y lo recibe completo. MercaJusto cobra solo una comisión del 5% y el envío agrupado, así el comprador paga menos que en plaza."
              )
            }
          />
          <Row
            icon="document-text-outline"
            label="Términos y condiciones"
            last
            onPress={() =>
              showAlert(
                "Términos y condiciones",
                "MercaJusto conecta productores campesinos de Nariño con compradores. Los datos personales se usan solo para gestionar pedidos y entregas."
              )
            }
          />
        </View>

        <View style={[section, { gap: spacing[3] }]}>
          <Button
            title="Cerrar sesión"
            variant="outline"
            full
            icon={<Icon name="log-out-outline" size={18} color={t.primary} />}
            onPress={onLogout}
          />
          <Text style={[type.footnote, { textAlign: "center", color: t.textTertiary, fontWeight: "400" }]}>
            MercaJusto v1.0.0 · Hecho en Nariño, Colombia
          </Text>
        </View>
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

/** Fila de configuración: ícono, texto y chevron (o un control a la derecha). */
function Row({
  icon,
  label,
  hint,
  onPress,
  last,
  children,
}: {
  icon: IconName | string;
  label: string;
  hint?: string;
  onPress?: () => void;
  last?: boolean;
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[4],
        minHeight: 56,
        paddingHorizontal: spacing[5],
      }}
    >
      <Icon name={icon} size={22} color={t.textPrimary} />
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[2],
          alignSelf: "stretch",
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: t.border,
        }}
      >
        <Text style={[type.body, { flex: 1, color: t.textPrimary }]}>{label}</Text>
        {hint ? <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>{hint}</Text> : null}
        {children ?? <Icon name="chevron-forward" size={18} color={t.textTertiary} />}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {content}
    </PressableScale>
  );
}
