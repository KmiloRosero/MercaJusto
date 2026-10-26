import React, { useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP, radius, spacing, type, useTheme } from "../theme";
import {
  apiErrorMessage,
  getCourierBoard,
  takeOrder,
  updateOrderStatus,
  type AvailableOrder,
  type CourierOrder,
} from "../api/client";
import type { OrderStatus } from "../api/types";
import { useAuth } from "../store/auth";
import { toast } from "../store/toast";
import { confirmDialog, showAlert } from "../lib/dialog";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Pill } from "./Pill";
import { StatTile } from "./Charts";
import { ErrorState, LoadingState } from "./QueryState";
import MapPreview from "./MapPreview";

const GUTTER = spacing[5];

/** Abre la navegación (Google Maps) hacia un punto. Funciona en la web y en Android. */
function openDirections(lat: number, lng: number) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});
}

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

/**
 * Inicio del repartidor: solo lo que él puede hacer. Su ruta en el orden del
 * VRP, lo que debe recoger en las fincas y los pedidos listos que puede tomar.
 */
export function CourierHome() {
  const t = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["orders", "courier-board"],
    queryFn: getCourierBoard,
    // Los productores despachan y otros repartidores toman pedidos desde el otro lado.
    refetchInterval: 15_000,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const changeStatus = async (order: CourierOrder, status: OrderStatus, done: string) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status);
      toast.success(done);
      await refresh();
    } catch (err) {
      showAlert("No se pudo actualizar", apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const deliver = async (order: CourierOrder) => {
    const ok = await confirmDialog(
      "¿Entregaste el pedido?",
      order.cashToCollect > 0
        ? `Confirma que ${order.buyer.name.split(" ")[0]} recibió su cosecha y te pagó ${formatCOP(order.cashToCollect)} en efectivo.`
        : `Confirma que ${order.buyer.name.split(" ")[0]} recibió su cosecha. Ya está pagado en línea.`,
      { confirmText: "Sí, entregado" }
    );
    if (ok) changeStatus(order, "DELIVERED", "Entrega registrada");
  };

  const take = async (order: AvailableOrder) => {
    setBusyId(order.id);
    try {
      await takeOrder(order.id);
      toast.success("Pedido tomado: aparece en 'Por recoger'");
      await refresh();
    } catch (err) {
      showAlert("No se pudo tomar", apiErrorMessage(err));
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary, justifyContent: "center" }} edges={["top"]}>
        <LoadingState label="Cargando tu ruta…" />
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary, justifyContent: "center" }} edges={["top"]}>
        <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      </SafeAreaView>
    );
  }

  const { stats, route, toPickUp, available } = data;
  const next = route[0];
  const routeStops = route
    .filter((o) => o.address)
    .map((o, i) => ({ latitude: o.address!.lat, longitude: o.address!.lng, mine: i === 0 }));
  const origin = route[0]?.farm ? { latitude: route[0].farm.lat, longitude: route[0].farm.lng } : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[10] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={t.primary} />}
      >
        {/* Encabezado y cifras del día */}
        <View style={{ backgroundColor: t.bgPrimary, padding: GUTTER, gap: spacing[4] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.footnote, { color: t.textSecondary }]}>Hola, {user?.name.split(" ")[0]}</Text>
              <Text accessibilityRole="header" style={[type.title, { color: t.textPrimary }]}>
                Mi ruta de hoy
              </Text>
            </View>
            <Avatar name={user?.name} size={48} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <StatTile value={String(stats.inRoute)} label="en tu ruta" />
            <StatTile value={String(stats.deliveredToday)} label="entregas hoy" />
          </View>
          {stats.cashToCollect > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.warningLight }}>
              <Icon name="cash-outline" size={22} color={t.warning} />
              <Text style={[type.callout, { flex: 1, color: t.textPrimary }]}>
                Por cobrar en efectivo: <Text style={{ fontWeight: "800" }}>{formatCOP(stats.cashToCollect)}</Text>
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ruta en el orden del VRP */}
        <Section title="Tu ruta" count={route.length}>
          {route.length === 0 ? (
            <Empty icon="mci:map-marker-path" text="No tienes entregas en camino. Toma un pedido disponible o espera a que un productor despache." />
          ) : (
            <>
              <View style={{ borderRadius: radius.lg, overflow: "hidden" }}>
                <MapPreview origin={origin} destination={null} route={routeStops} highlightLabel="Siguiente" />
              </View>
              {next ? (
                <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                  Orden optimizado para recorrer menos kilómetros. Empieza por {next.buyer.name.split(" ")[0]} en {next.address?.municipio}.
                </Text>
              ) : null}
              {route.map((o, i) => (
                <StopCard
                  key={o.id}
                  order={o}
                  index={i}
                  isNext={i === 0}
                  busy={busyId === o.id}
                  onDeliver={() => deliver(o)}
                  onOpen={() => router.push(`/seguimiento/${o.id}`)}
                />
              ))}
            </>
          )}
        </Section>

        {/* Lo que ya tomó y debe recoger en la finca */}
        {toPickUp.length > 0 ? (
          <Section title="Por recoger" count={toPickUp.length}>
            {toPickUp.map((o) => (
              <View key={o.id} style={{ padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, gap: spacing[3] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
                  <Icon name="mci:barn" size={24} color={t.primary} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>
                      Finca de {o.farm?.producer.name ?? "productor"}
                    </Text>
                    <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
                      {[o.farm?.vereda, o.farm?.municipio].filter(Boolean).join(", ")} → entregar en {o.address?.municipio}
                    </Text>
                  </View>
                </View>
                <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>{o.items}</Text>
                {o.status === "PREPARING" ? (
                  <Button
                    title="Recogí el pedido · salir a entregar"
                    icon={<Icon name="in_transit" size={18} color={t.onPrimary} />}
                    full
                    loading={busyId === o.id}
                    onPress={() => changeStatus(o, "IN_TRANSIT", "Pedido en camino: tu ruta se reordenó")}
                  />
                ) : (
                  <Text style={[type.footnote, { color: t.warning, fontWeight: "700" }]}>
                    El productor aún lo está alistando. Te avisamos cuando esté listo.
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  {o.farm ? (
                    <Button title="Cómo llegar" size="sm" variant="outline" icon={<Icon name="navigate-outline" size={16} color={t.primary} />} onPress={() => openDirections(o.farm!.lat, o.farm!.lng)} style={{ flex: 1 }} />
                  ) : null}
                  {o.farm?.producer.phone ? (
                    <Button title="Llamar" size="sm" variant="outline" icon={<Icon name="call" size={16} color={t.primary} />} onPress={() => callPhone(o.farm!.producer.phone)} style={{ flex: 1 }} />
                  ) : null}
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {/* Pedidos listos que nadie ha tomado */}
        <Section title="Disponibles para tomar" count={available.length}>
          {available.length === 0 ? (
            <Empty icon="mci:basket-outline" text="No hay pedidos disponibles por ahora. Esta lista se actualiza sola." />
          ) : (
            available.map((o) => (
              <View key={o.id} style={{ padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, gap: spacing[3] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                  <Text style={[type.headline, { flex: 1, color: t.textPrimary }]}>
                    {o.from?.municipio ?? "Finca"} → {o.to?.municipio ?? "Entrega"}
                  </Text>
                  {o.distanceKm !== null ? (
                    <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "700" }]}>
                      {o.distanceKm.toLocaleString("es-CO", { maximumFractionDigits: 1 })} km
                    </Text>
                  ) : null}
                </View>
                <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
                  Recoger donde {o.from?.producerName.split(" ")[0] ?? "el productor"}
                  {o.from?.vereda ? ` (${o.from.vereda})` : ""} · {o.items}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                  <Pill variant={o.cashToCollect > 0 ? "warning" : "success"} icon={o.cashToCollect > 0 ? "cash-outline" : "checkmark-circle"}>
                    {o.cashToCollect > 0 ? `Cobrar ${formatCOP(o.cashToCollect)}` : "Pagado en línea"}
                  </Pill>
                  <View style={{ flex: 1 }} />
                  <Button title="Tomar pedido" size="sm" loading={busyId === o.id} onPress={() => take(o)} />
                </View>
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.bgPrimary, marginTop: spacing[2], padding: GUTTER, gap: spacing[3] }}>
      <Text accessibilityRole="header" style={[type.headline, { color: t.textPrimary }]}>
        {title} <Text style={{ color: t.textTertiary, fontWeight: "500" }}>({count})</Text>
      </Text>
      {children}
    </View>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.bgInput }}>
      <Icon name={icon} size={22} color={t.textSecondary} />
      <Text style={[type.footnote, { flex: 1, color: t.textSecondary, fontWeight: "400" }]}>{text}</Text>
    </View>
  );
}

/** Una parada de la ruta: a quién, dónde, qué cobrar y las acciones de la entrega. */
function StopCard({
  order,
  index,
  isNext,
  busy,
  onDeliver,
  onOpen,
}: {
  order: CourierOrder;
  index: number;
  isNext: boolean;
  busy: boolean;
  onDeliver: () => void;
  onOpen: () => void;
}) {
  const t = useTheme();
  const a = order.address;
  return (
    <View
      style={{
        padding: spacing[4],
        borderRadius: radius.lg,
        borderWidth: isNext ? 2 : 1,
        borderColor: isNext ? t.primary : t.border,
        backgroundColor: t.bgCard,
        gap: spacing[3],
      }}
    >
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.full,
            backgroundColor: isNext ? t.primary : t.bgInput,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: isNext ? t.onPrimary : t.textPrimary, fontSize: 16, fontWeight: "800" }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]}>
            {order.buyer.name}
            {isNext ? <Text style={{ color: t.primary }}> · siguiente</Text> : null}
          </Text>
          <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
            {[a?.detail, a?.vereda, a?.municipio].filter(Boolean).join(", ")}
          </Text>
          {order.etaMin != null ? (
            <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
              ~{order.etaMin} min · {order.kmFromStart?.toLocaleString("es-CO", { maximumFractionDigits: 1 })} km desde la finca
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[type.footnote, { color: t.textPrimary, fontWeight: "500" }]}>{order.items}</Text>
      {order.notes ? (
        <Text style={[type.footnote, { color: t.textSecondary, fontStyle: "italic", fontWeight: "400" }]}>“{order.notes}”</Text>
      ) : null}
      <Pill variant={order.cashToCollect > 0 ? "warning" : "success"} icon={order.cashToCollect > 0 ? "cash-outline" : "checkmark-circle"}>
        {order.cashToCollect > 0 ? `Cobrar ${formatCOP(order.cashToCollect)} en efectivo` : "Pagado en línea"}
      </Pill>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {a ? (
          <Button title="Cómo llegar" size="sm" variant="outline" icon={<Icon name="navigate-outline" size={16} color={t.primary} />} onPress={() => openDirections(a.lat, a.lng)} style={{ flex: 1 }} />
        ) : null}
        <Button title="Llamar" size="sm" variant="outline" icon={<Icon name="call" size={16} color={t.primary} />} onPress={() => callPhone(order.buyer.phone)} style={{ flex: 1 }} />
      </View>
      <Button
        title="Marcar como entregado"
        icon={<Icon name="checkmark-circle" size={18} color={isNext ? t.onPrimary : t.primary} />}
        variant={isNext ? "primary" : "outline"}
        full
        loading={busy}
        onPress={onDeliver}
      />
      <Button title="Ver detalle del pedido" size="sm" variant="ghost" onPress={onOpen} />
    </View>
  );
}
