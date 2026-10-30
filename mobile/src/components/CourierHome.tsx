import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useShareLocation, type ShareStatus } from "../lib/useShareLocation";
import { fetchRoadRoute } from "../lib/roadRoute";
import { sinceLabel } from "../lib/geo";
import { PageShader } from "./PageShader";
import { useDockInset } from "./ui/Dock";

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
  const dockInset = useDockInset();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { dismissed, dismiss, restoreDismissed } = useDismissedOrders(user?.id);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["orders", "courier-board"],
    queryFn: getCourierBoard,
    // Los productores despachan y otros repartidores toman pedidos desde el otro lado.
    refetchInterval: 15_000,
  });
  // Con entregas en camino, su celular comparte la ubicación en vivo con los compradores.
  const share = useShareLocation((data?.route.length ?? 0) > 0);

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
      toast.success("Aceptaste el pedido: está en 'Por recoger'");
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
  const visibleAvailable = available.filter((o) => !dismissed.includes(o.id));
  const hiddenCount = available.length - visibleAvailable.length;
  const next = route[0];
  const routeStops = route
    .filter((o) => o.address)
    .map((o, i) => ({ latitude: o.address!.lat, longitude: o.address!.lng, mine: i === 0 }));
  const origin = route[0]?.farm ? { latitude: route[0].farm.lat, longitude: route[0].farm.lng } : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <PageShader surface={t.bgSecondary} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[10] + dockInset }}
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

        {route.length > 0 ? (
          <View style={{ backgroundColor: t.bgPrimary, paddingHorizontal: GUTTER, paddingBottom: GUTTER }}>
            <LiveShareCard
              status={share.status}
              lastSentAt={share.lastSentAt}
              onSimulate={async () => {
                // Recorrido de demo por la carretera real: de la finca a cada entrega, en orden.
                const pts = [
                  ...(route[0]?.farm ? [{ latitude: route[0].farm.lat, longitude: route[0].farm.lng }] : []),
                  ...route.filter((o) => o.address).map((o) => ({ latitude: o.address!.lat, longitude: o.address!.lng })),
                ];
                const road = await fetchRoadRoute(pts);
                share.simulate(road.path);
              }}
              onStop={share.stopSimulation}
            />
          </View>
        ) : null}

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

        {/* Pedidos comprados que nadie ha tomado: el repartidor ve la ruta y decide */}
        <Section title="Pedidos disponibles" count={visibleAvailable.length}>
          {visibleAvailable.length === 0 ? (
            <Empty
              icon="mci:basket-outline"
              text="No hay pedidos disponibles por ahora. Cuando alguien compre, aparecerá aquí y te avisaremos."
            />
          ) : (
            visibleAvailable.map((o) => (
              <AvailableCard
                key={o.id}
                order={o}
                busy={busyId === o.id}
                onAccept={() => take(o)}
                onDismiss={() => dismiss(o.id)}
              />
            ))
          )}
          {hiddenCount > 0 ? (
            <Button title={`Mostrar los que ocultaste (${hiddenCount})`} size="sm" variant="ghost" onPress={restoreDismissed} />
          ) : null}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Pedidos que el repartidor rechazó ("No me interesa"): se guardan en el
 * celular, por cuenta, para que no le vuelvan a aparecer. Se pueden mostrar otra vez.
 */
function useDismissedOrders(userId?: string) {
  const key = `mercajusto.courierDismissed.${userId ?? "anon"}`;
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => setDismissed(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => {});
  }, [key]);

  const save = (ids: string[]) => {
    setDismissed(ids);
    AsyncStorage.setItem(key, JSON.stringify(ids.slice(-100))).catch(() => {});
  };

  return {
    dismissed,
    dismiss: (id: string) => save([...dismissed, id]),
    restoreDismissed: () => save([]),
  };
}

/**
 * Pedido disponible: de dónde a dónde, cuánto cobra y, al abrirlo, la ruta del
 * envío en el mapa con su tiempo y cuánto suma a la ruta que ya lleva.
 * Él decide: aceptarlo o "No me interesa".
 */
function AvailableCard({
  order,
  busy,
  onAccept,
  onDismiss,
}: {
  order: AvailableOrder;
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const km = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  const p = order.preview;

  return (
    <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard, overflow: "hidden" }}>
      {open && p ? (
        <MapPreview
          origin={{ latitude: p.from.lat, longitude: p.from.lng }}
          destination={{ latitude: p.to.lat, longitude: p.to.lng }}
        />
      ) : null}
      <View style={{ padding: spacing[4], gap: spacing[3] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <Text style={[type.headline, { flex: 1, color: t.textPrimary }]}>
            {order.from?.municipio ?? "Finca"} → {order.to?.municipio ?? "Entrega"}
          </Text>
          {order.distanceKm !== null ? (
            <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "700" }]}>{km(order.distanceKm)} km</Text>
          ) : null}
        </View>
        <Text style={[type.footnote, { color: t.textSecondary, fontWeight: "400" }]}>
          Recoger donde {order.from?.producerName.split(" ")[0] ?? "el productor"}
          {order.from?.vereda ? ` (${order.from.vereda})` : ""} · {order.items}
        </Text>

        {open && p ? (
          <View style={{ gap: spacing[2], padding: spacing[3], borderRadius: radius.md, backgroundColor: t.bgInput }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <Icon name="time-outline" size={18} color={t.textSecondary} />
              <Text style={[type.footnote, { flex: 1, color: t.textPrimary, fontWeight: "500" }]}>
                Unos {p.etaMin} min de la finca a la entrega
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <Icon name="mci:map-marker-path" size={18} color={t.textSecondary} />
              <Text style={[type.footnote, { flex: 1, color: t.textPrimary, fontWeight: "500" }]}>
                {p.extraKm === null
                  ? "Sería tu primera entrega de la ruta."
                  : p.extraKm < 1
                    ? "Casi no suma kilómetros: queda de camino en tu ruta."
                    : `Si lo aceptas, tu ruta suma ${km(p.extraKm)} km.`}
              </Text>
            </View>
            <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]}>
              La dirección exacta y el teléfono del cliente aparecen cuando aceptas.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <Pill variant={order.cashToCollect > 0 ? "warning" : "success"} icon={order.cashToCollect > 0 ? "cash-outline" : "checkmark-circle"}>
            {order.cashToCollect > 0 ? `Cobrar ${formatCOP(order.cashToCollect)}` : "Pagado en línea"}
          </Pill>
          <View style={{ flex: 1 }} />
          {p ? (
            <Button
              title={open ? "Ocultar ruta" : "Ver la ruta"}
              size="sm"
              variant="ghost"
              icon={<Icon name="map-outline" size={16} color={t.primary} />}
              onPress={() => setOpen((v) => !v)}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Button title="No me interesa" size="sm" variant="outline" onPress={onDismiss} style={{ flex: 1 }} />
          <Button
            title="Aceptar pedido"
            size="sm"
            icon={<Icon name="checkmark-circle" size={16} color={t.onPrimary} />}
            loading={busy}
            onPress={onAccept}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
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

/**
 * Estado de la ubicación en vivo del repartidor y el botón de recorrido
 * simulado para la demo (avanza por la carretera real sin moverse de la silla).
 */
function LiveShareCard({
  status,
  lastSentAt,
  onSimulate,
  onStop,
}: {
  status: ShareStatus;
  lastSentAt: number | null;
  onSimulate: () => void;
  onStop: () => void;
}) {
  const t = useTheme();
  const [, force] = useState(0);
  // Refresca el "hace N s" cada 5 s.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  const text =
    status === "simulating"
      ? "Recorrido de demostración en curso: los compradores te ven avanzar por la ruta."
      : status === "sharing"
        ? "Compartiendo tu ubicación en vivo con tus clientes."
        : status === "denied"
          ? "Sin permiso de ubicación: tus clientes no te ven en el mapa. Actívalo en los ajustes del celular."
          : "Activando tu ubicación…";
  const live = status === "sharing" || status === "simulating";
  return (
    <View style={{ padding: spacing[4], borderRadius: radius.lg, backgroundColor: live ? t.primaryLight : t.warningLight, gap: spacing[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: live ? t.primary : t.warning }} />
        <Text style={[type.footnote, { flex: 1, color: live ? t.onPrimaryLight : t.textPrimary, fontWeight: "600" }]}>
          {text}
          {lastSentAt ? ` Última vez ${sinceLabel(lastSentAt)}.` : ""}
        </Text>
      </View>
      {status === "simulating" ? (
        <Button title="Detener recorrido de demostración" size="sm" variant="outline" onPress={onStop} />
      ) : (
        <Button
          title="Simular recorrido (demo)"
          size="sm"
          variant="outline"
          icon={<Icon name="mci:moped" size={16} color={t.primary} />}
          onPress={onSimulate}
        />
      )}
    </View>
  );
}
