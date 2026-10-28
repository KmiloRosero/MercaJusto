import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { fontSize, motion, radius, spacing, type, useTheme, formatCOP, shadow } from "../../src/theme";
import { apiErrorMessage, getOrder, syncPayment, updateOrderStatus } from "../../src/api/client";
import { payOnline } from "../../src/lib/payOnline";
import { OrderStatus, PaymentMethod } from "../../src/api/types";
import { useAuth } from "../../src/store/auth";
import { BUYER_CAN_CANCEL, NEXT_ACTION } from "../../src/lib/orderStatus";
import { confirmDialog, showAlert } from "../../src/lib/dialog";
import MapPreview from "../../src/components/MapPreview";
import type { RouteStop } from "../../src/components/mapTypes";
import type { DeliveryView, Order } from "../../src/api/types";
import { sinceLabel } from "../../src/lib/geo";

import { FieldTile } from "../../src/components/FieldTile";
import { ErrorState, LoadingState } from "../../src/components/QueryState";
import { PressableScale } from "../../src/components/PressableScale";
const STEPS: { key: OrderStatus; label: string; icon: string; desc: string }[] = [
  { key: "CONFIRMED", label: "Pedido confirmado", icon: "checkmark-circle", desc: "El productor recibió tu pedido" },
  { key: "PREPARING", label: "Preparando", icon: "preparing", desc: "Están alistando tus productos" },
  { key: "IN_TRANSIT", label: "En camino", icon: "in_transit", desc: "El repartidor va hacia tu dirección" },
  { key: "DELIVERED", label: "Entregado", icon: "delivered", desc: "¡Disfruta tu cosecha fresca!" },
];

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  WOMPI: "En línea",
  CASH: "Efectivo" };

const STATUS_INDEX: Record<OrderStatus, number> = {
  // Solo los pedidos en línea sin pagar están en PENDING: aún no empieza ningún paso
  PENDING: -1,
  CONFIRMED: 0,
  PREPARING: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  CANCELLED: -1 };

// Pedido recién enviado: se ve una vez por compra, así que puede celebrarse un poco.
const PLACED_ENTER = FadeInDown.duration(320).easing(Easing.bezier(...motion.easeOut));
const PLACED_EXIT = FadeOut.duration(150);

/** Check que aparece con un pequeño rebote, justo después del aviso. */
function CheckPop({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withDelay(140, withTiming(1, { duration: 160 })));
    scale.set(withDelay(140, withSpring(1, { damping: 11, stiffness: 260 })));
  }, [reduceMotion, opacity, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Icon name="checkmark-circle" size={24} color={color} />
    </Animated.View>
  );
}

export default function Seguimiento() {
  const { id, nuevo } = useLocalSearchParams<{ id: string; nuevo?: string }>();
  const router = useRouter();
  const t = useTheme();
  const queryClient = useQueryClient();
  const me = useAuth((s) => s.user);
  const [updating, setUpdating] = useState(false);
  // Recién creado desde el checkout: se confirma el envío antes del seguimiento.
  const [justPlaced, setJustPlaced] = useState(nuevo === "1");

  const { data: order, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
    // En camino se actualiza cada 8 s para ver al repartidor moverse; si no, cada 15 s.
    refetchInterval: (query) => (query.state.data?.status === "IN_TRANSIT" ? 8000 : 15000),
  });

  // Pedido en línea que todavía no se paga (o cuyo pago fue rechazado)
  const awaitingPayment =
    !!order && order.paymentMethod === "WOMPI" && order.paymentStatus !== "PAID" && order.status === "PENDING";
  const paymentFailed = awaitingPayment && order?.paymentStatus === "FAILED";
  const [paying, setPaying] = useState(false);

  // Al abrir, se confirma con Wompi por si el pago se resolvió mientras no se miraba
  useEffect(() => {
    if (!awaitingPayment || !id) return;
    syncPayment(id)
      .then(() => refetch())
      .catch(() => {});
  }, [awaitingPayment, id, refetch]);

  const onPay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      const result = await payOnline(order.id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (result === "FAILED") showAlert("Pago rechazado", "Wompi no aprobó el pago. Puedes intentarlo con otro medio.");
    } catch (err) {
      showAlert("No se pudo abrir el pago", apiErrorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  // Coordenadas: finca del primer productor (origen) y dirección de entrega (destino)
  const { origin, destination } = useMemo(() => {
    if (!order) return { origin: null, destination: null } as {
      origin: { latitude: number; longitude: number } | null;
      destination: { latitude: number; longitude: number } | null;
    };
    const addr = order.deliveryAddress;
    const dest =
      addr && addr.latitude && addr.longitude
        ? { latitude: addr.latitude, longitude: addr.longitude }
        : null;
    let orig: { latitude: number; longitude: number } | null = null;
    for (const it of order.items) {
      const p = it.product;
      if (p?.latitude && p?.longitude) {
        orig = { latitude: p.latitude, longitude: p.longitude };
        break;
      }
    }
    return { origin: orig, destination: dest };
  }, [order]);

  // Ruta del VRP: con más de una parada, la línea las recorre todas en orden.
  const routeStops = useMemo<RouteStop[] | undefined>(() => {
    const stops = order?.delivery?.stops;
    if (!stops || stops.length < 2) return undefined;
    return stops.map((st) => ({ latitude: st.lat, longitude: st.lng, mine: st.mine }));
  }, [order]);

  const changeStatus = async (status: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, status);
      await queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      showAlert("No se pudo actualizar el pedido", apiErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const onCancel = async () => {
    const ok = await confirmDialog(
      "¿Cancelar pedido?",
      "Los productos volverán al inventario del productor.",
      { confirmText: "Sí, cancelar", cancelText: "No", destructive: true }
    );
    if (ok) changeStatus("CANCELLED");
  };

  if (error && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Seguimiento" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Seguimiento" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <LoadingState label="Cargando tu pedido…" />
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = STATUS_INDEX[order.status];
  const isBuyerView = order.buyerId === me?.id;
  const nextAction = !isBuyerView ? NEXT_ACTION[order.status] : undefined;
  const canCancel = isBuyerView && BUYER_CAN_CANCEL.includes(order.status);
  const reviewed = isBuyerView && (order.reviews ?? []).some((r) => r.fromUserId === me?.id);
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  // La acción que este estado necesita va en la tarjeta de estado, no al fondo:
  // pagar (o reintentar), avanzar el pedido (productor) o calificar al recibir.
  const primaryAction =
    isBuyerView && awaitingPayment ? (
      <Button
        title={paymentFailed ? "Intentar pagar de nuevo" : `Pagar ahora · ${formatCOP(order.total)}`}
        icon={<Icon name="card-outline" size={20} color={t.onPrimary} />}
        full
        size="lg"
        loading={paying}
        onPress={onPay}
      />
    ) : nextAction ? (
      <Button
        title={nextAction.label}
        icon={<Icon name={nextAction.icon} size={20} color={t.onPrimary} />}
        full
        size="lg"
        loading={updating}
        onPress={() => changeStatus(nextAction.next)}
      />
    ) : isDelivered && isBuyerView && !reviewed ? (
      <Button
        title="Calificar pedido"
        icon={<Icon name="star" size={20} color={t.onPrimary} />}
        full
        size="lg"
        onPress={() => router.push(`/calificacion/${order.id}`)}
      />
    ) : null;
  const showCall = !isDelivered && !isCancelled;

  const currentLabel =
    isCancelled ? "Pedido cancelado" :
    paymentFailed ? "Pago rechazado" :
    awaitingPayment ? "Esperando tu pago" :
    isDelivered ? "¡Entregado!" :
    STEPS[currentStep]?.label || "Procesando";

  const producerNames = [...new Set(order.items.map((it) => it.product?.producer?.name).filter(Boolean))]
    .map((n) => n!.split(" ")[0])
    .join(" y ");

  const currentDesc =
    isCancelled ? "Este pedido fue cancelado." :
    paymentFailed ? "Wompi no aprobó el pago. Puedes intentarlo de nuevo." :
    awaitingPayment ? "Paga en Wompi para que el productor reciba tu pedido. Tus productos están apartados." :
    STEPS[currentStep]?.desc || "Estamos procesando tu pedido.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Seguimiento" />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing[10] }}>
        {justPlaced && isBuyerView && !awaitingPayment ? (
          <Animated.View
            entering={PLACED_ENTER}
            exiting={PLACED_EXIT}
            accessibilityRole="alert"
            style={{
              margin: spacing[4],
              padding: spacing[4],
              gap: spacing[2],
              borderRadius: radius.lg,
              backgroundColor: t.successLight,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <CheckPop color={t.success} />
              <Text style={[type.headline, { flex: 1, color: t.textPrimary }]}>
                ¡Pedido enviado{producerNames ? ` a ${producerNames}` : ""}!
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.sm, color: t.textPrimary, lineHeight: 20 }}>
              {order.paymentMethod === "CASH"
                ? `Pagas ${formatCOP(order.total)} en efectivo cuando recibas tu cosecha.`
                : `Pagaste ${formatCOP(order.total)} en línea.`}{" "}
              Te avisaremos cuando el productor empiece a prepararlo.
            </Text>
            <Pressable
              onPress={() => setJustPlaced(false)}
              accessibilityRole="button"
              style={{ alignSelf: "flex-start", minHeight: 48, justifyContent: "center" }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: t.success }}>Entendido</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* ═══ Mapa en vivo ═══ */}
        <MapPreview
          origin={origin}
          destination={destination}
          route={routeStops}
          courier={order.live ? { latitude: order.live.courier.lat, longitude: order.live.courier.lng } : null}
          courierName={order.courier?.name.split(" ")[0]}
          height={300}
        />

        {/* ═══ Status card ═══ */}
        <View
          style={{
            backgroundColor: t.bgPrimary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -spacing[6],
            padding: spacing[5],
            ...shadow.md }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing[4] }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isCancelled ? t.danger : t.success }}
              />
              <Text style={[type.footnote, { fontWeight: "600", color: isCancelled ? t.danger : t.success }]}>
                {isCancelled ? "Cancelado" : isDelivered ? "Completado" : "En tiempo real"}
              </Text>
            </View>
            <Text style={[type.footnote, { color: t.textTertiary }]}>
              #{order.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          <Text style={[type.title, { color: t.textPrimary, marginBottom: spacing[1] }]}>
            {currentLabel}
          </Text>
          <Text style={[type.footnote, { fontWeight: "400", color: t.textSecondary, marginBottom: spacing[4] }]}>
            {currentDesc}
          </Text>

          {order.status === "IN_TRANSIT" ? <LiveCard order={order} /> : null}
          {order.delivery && !isCancelled ? <RouteCard delivery={order.delivery} isBuyer={isBuyerView} /> : null}

          {primaryAction ? (
            <View style={{ marginBottom: order.courier && !isCancelled ? spacing[4] : 0 }}>{primaryAction}</View>
          ) : null}

          {/* ═══ Repartidor ═══ */}
          {order.courier && !isCancelled ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                backgroundColor: t.bgInput,
                borderRadius: radius.lg }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.full,
                  backgroundColor: t.primary10,
                  borderWidth: 2,
                  borderColor: t.primary,
                  alignItems: "center",
                  justifyContent: "center" }}
              >
                <Icon name="in_transit" size={24} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.callout, { color: t.textPrimary }]}>
                  {order.courier.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={[type.footnote, { fontWeight: "400", color: t.textSecondary }]}>
                    {isBuyerView ? "Tu repartidor" : "Repartidor"} ·
                  </Text>
                  <Icon name="star" size={12} color={t.rating} />
                  <Text style={[type.footnote, { fontWeight: "400", color: t.textSecondary }]}>
                    {order.courier.rating ? order.courier.rating.toFixed(1) : "Nuevo"}
                  </Text>
                </View>
              </View>
              {order.courier.phone && showCall ? (
                <PressableScale
                  scaleTo={0.95}
                  onPress={() => Linking.openURL(`tel:${order.courier!.phone}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Llamar a ${order.courier.name}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radius.full,
                    backgroundColor: t.primary,
                    alignItems: "center",
                    justifyContent: "center" }}
                >
                  <Icon name="call" size={20} color={t.onPrimary} />
                </PressableScale>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ═══ Timeline ═══ */}
        {!isCancelled ? (
          <View
            style={{
              backgroundColor: t.bgPrimary,
              marginTop: spacing[2],
              paddingHorizontal: spacing[5],
              paddingVertical: spacing[5] }}
          >
            <Text style={[type.callout, { color: t.textPrimary, marginBottom: spacing[4] }]} accessibilityRole="header">
              Línea de tiempo
            </Text>

            <View style={{ paddingLeft: 32 }}>
              {STEPS.map((step, i) => {
                const state = i < currentStep ? "completed" : i === currentStep ? "active" : "pending";
                return (
                  <View key={step.key} style={{ marginBottom: i === STEPS.length - 1 ? 0 : spacing[5], position: "relative" }}>
                    {/* Línea vertical */}
                    {i < STEPS.length - 1 ? (
                      <View
                        style={{
                          position: "absolute",
                          left: -21,
                          top: 22,
                          bottom: -spacing[5],
                          width: 2,
                          backgroundColor: i < currentStep ? t.success : t.border }}
                      />
                    ) : null}
                    {/* Dot */}
                    <View
                      style={{
                        position: "absolute",
                        left: -32,
                        top: 2,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor:
                          state === "completed" ? t.success :
                          state === "active" ? t.primary : t.bgSecondary,
                        borderWidth: 2,
                        borderColor:
                          state === "completed" ? t.success :
                          state === "active" ? t.primary : t.border,
                        alignItems: "center",
                        justifyContent: "center" }}
                    >
                      <Icon
                        name={state === "completed" ? "checkmark" : step.icon}
                        size={12}
                        color={state === "pending" ? t.textTertiary : t.onPrimary}
                      />
                    </View>
                    <Text style={[type.callout, { color: state === "pending" ? t.textTertiary : t.textPrimary }]}>
                      {step.label}
                    </Text>
                    <Text style={[type.footnote, { fontWeight: "400", color: t.textSecondary, marginTop: 2 }]}>
                      {step.desc}
                    </Text>
                    {state === "active" && order.createdAt ? (
                      <Text style={[type.footnote, { fontWeight: "400", color: t.textTertiary, marginTop: 2 }]}>
                        {new Date(order.createdAt).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit" })}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ═══ Resumen del pedido ═══ */}
        <View
          style={{
            backgroundColor: t.bgPrimary,
            marginTop: spacing[2],
            paddingHorizontal: spacing[5],
            paddingVertical: spacing[5] }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing[3] }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="basket-outline" size={16} color={t.primary} />
              <Text style={[type.callout, { color: t.textPrimary }]} accessibilityRole="header">
                {isBuyerView ? "Tu pedido" : `Pedido de ${order.buyer?.name ?? "cliente"}`}
              </Text>
            </View>
            <Text style={[type.footnote, { fontWeight: "400", color: t.textTertiary }]}>
              {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {order.items.map((it) => (
            <View
              key={it.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: spacing[2],
                borderBottomWidth: 1,
                borderBottomColor: t.border }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], flex: 1 }}>
                <FieldTile category={it.product?.category} size={36} iconSize={18} radius={radius.sm} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.footnote, { color: t.textPrimary }]}>
                    {it.product?.name}
                  </Text>
                  <Text style={[type.footnote, { fontWeight: "400", color: t.textTertiary }]}>
                    {it.quantity} {it.product?.unit}
                  </Text>
                </View>
              </View>
              <Text style={[type.footnote, { fontWeight: "700", color: t.textPrimary }]}>
                {formatCOP(it.subtotal)}
              </Text>
            </View>
          ))}

          <View style={{ marginTop: spacing[3], gap: 4 }}>
            <Row label="Subtotal" value={formatCOP(order.subtotal)} color={t.textSecondary} />
            <Row label="Envío" value={formatCOP(order.deliveryFee)} color={t.textSecondary} />
            <Row label="Comisión MercaJusto (5 %)" value={formatCOP(order.platformFee)} color={t.textSecondary} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: spacing[2],
                marginTop: spacing[1],
                borderTopWidth: 2,
                borderTopColor: t.border }}
            >
              <Text style={[type.callout, { color: t.textPrimary }]}>Total</Text>
              <Text style={[type.headline, { color: t.textPrimary }]}>
                {formatCOP(order.total)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Text style={[type.footnote, { fontWeight: "400", color: t.textTertiary }]}>Pago</Text>
              <Pill variant={order.paymentStatus === "PAID" ? "success" : order.paymentStatus === "FAILED" ? "danger" : "warning"}>
                {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} ·{" "}
                {order.paymentStatus === "PAID"
                  ? "Pagado"
                  : order.paymentMethod === "CASH"
                    ? "Contraentrega"
                    : order.paymentStatus === "FAILED"
                      ? "Rechazado"
                      : "Pendiente"}
              </Pill>
            </View>
          </View>
        </View>

        {/* ═══ Dirección de entrega ═══ */}
        {order.deliveryAddress ? (
          <View
            style={{
              backgroundColor: t.bgPrimary,
              marginTop: spacing[2],
              paddingHorizontal: spacing[5],
              paddingVertical: spacing[5] }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing[2] }}>
              <Icon name="location" size={16} color={t.primary} />
              <Text style={[type.callout, { color: t.textPrimary }]} accessibilityRole="header">
                Dirección de entrega
              </Text>
            </View>
            <Text style={[type.footnote, { fontWeight: "400", color: t.textSecondary }]}>
              {[order.deliveryAddress.detail, order.deliveryAddress.vereda, order.deliveryAddress.municipio, order.deliveryAddress.departamento]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {order.notes ? (
              <View style={{ flexDirection: "row", gap: 6, marginTop: spacing[2] }}>
                <Icon name="create-outline" size={14} color={t.textTertiary} />
                <Text style={[type.footnote, { flex: 1, fontWeight: "400", color: t.textTertiary, fontStyle: "italic" }]}>
                  “{order.notes}”
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ═══ Acciones secundarias ═══ */}
        <View style={{ backgroundColor: t.bgPrimary, marginTop: spacing[2], padding: spacing[5], gap: spacing[2] }}>
          {isDelivered && isBuyerView && reviewed ? (
            <Text style={[type.footnote, { color: t.textSecondary, textAlign: "center", fontWeight: "400" }]}>
              Ya calificaste este pedido. ¡Gracias!
            </Text>
          ) : null}
          {canCancel ? (
            <Button title="Cancelar pedido" variant="ghost" full loading={updating} onPress={onCancel} />
          ) : null}
          <Button
            title={isBuyerView ? "Volver al inicio" : "Volver a mis ventas"}
            variant="outline"
            full
            onPress={() => router.replace(isBuyerView ? "/(tabs)/home" : "/(tabs)/orders")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={[type.footnote, { fontWeight: "400", color }]}>{label}</Text>
      <Text style={[type.footnote, { fontWeight: "600", color }]}>{value}</Text>
    </View>
  );
}

/**
 * Dónde va el pedido dentro de la ruta optimizada del repartidor: parada N de M,
 * llegada estimada y una tira con las entregas. El repartidor y el productor
 * ven además el orden de los municipios.
 */
function RouteCard({ delivery, isBuyer }: { delivery: DeliveryView; isBuyer: boolean }) {
  const t = useTheme();
  const { position, stopCount, etaMin, kmToStop, zoneLabel, totalDistanceKm, stops } = delivery;
  const before = position - 1;
  const km = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return (
    <View
      accessible
      accessibilityLabel={`Parada ${position} de ${stopCount}. Llega en unos ${etaMin} minutos.`}
      style={{ padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.primaryLight, gap: spacing[3], marginBottom: spacing[4] }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.full,
            backgroundColor: t.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="mci:map-marker-path" size={22} color={t.onPrimary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.headline, { color: t.onPrimaryLight }]}>
            {isBuyer ? `Tu pedido es la parada ${position} de ${stopCount}` : `Parada ${position} de ${stopCount}`}
          </Text>
          <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "500" }]}>
            Llega en ~{etaMin} min · {km(kmToStop)} km desde la finca
          </Text>
        </View>
      </View>

      {/* Tira de entregas en orden: la de este pedido resaltada */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: stopCount }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: i === before ? 8 : 6,
              borderRadius: 4,
              // Las entregas antes de la tuya en gris, la tuya en verde, las siguientes vacías.
              backgroundColor: i < before ? t.gray300 : i === before ? t.primary : t.bgCard,
            }}
          />
        ))}
      </View>
      <Text style={[type.footnote, { color: t.onPrimaryLight, fontWeight: "400" }]}>
        {before === 0 ? "Es la primera entrega de la ruta." : `Antes hay ${before} entrega${before !== 1 ? "s" : ""}.`} Ruta
        optimizada de {km(totalDistanceKm)} km ({zoneLabel}).
      </Text>

      {!isBuyer && stops.length > 1 ? (
        <View style={{ gap: 4 }}>
          {stops.map((st, i) => (
            <Text key={i} style={[type.footnote, { color: t.onPrimaryLight, fontWeight: st.mine ? "800" : "400" }]}>
              {i + 1}. {st.municipio ?? "Entrega"}
              {st.mine ? " · este pedido" : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Seguimiento en vivo: dónde va el repartidor, cuánto le falta y cuándo se
 * actualizó. Sin ubicación reciente, lo dice en vez de inventar una posición.
 */
function LiveCard({ order }: { order: Order }) {
  const t = useTheme();
  const live = order.live;
  const name = order.courier?.name.split(" ")[0] ?? "El repartidor";
  const pulse = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion || !live) return;
    pulse.set(withRepeat(withSequence(withTiming(1.8, { duration: 900 }), withTiming(1, { duration: 0 })), -1));
  }, [reduceMotion, live, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 2 - pulse.value, transform: [{ scale: pulse.value }] }));

  if (!live) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.bgInput, marginBottom: spacing[4] }}>
        <Icon name="navigate-outline" size={20} color={t.textSecondary} />
        <Text style={[type.footnote, { flex: 1, color: t.textSecondary, fontWeight: "400" }]}>
          {name} aún no comparte su ubicación. Te mostramos la ruta estimada; cuando la active, lo verás moverse en el mapa.
        </Text>
      </View>
    );
  }
  const km = live.remainingKm.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return (
    <View
      accessible
      accessibilityLabel={`${name} está a ${km} kilómetros. Llega en unos ${live.etaMin} minutos.`}
      style={{ padding: spacing[4], borderRadius: radius.lg, backgroundColor: t.accentLight, gap: spacing[2], marginBottom: spacing[4] }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <View style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: t.accent }, ring]} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent }} />
        </View>
        <Text style={[type.headline, { flex: 1, color: t.onAccentLight }]}>
          {name} está a {km} km · llega en ~{live.etaMin} min
        </Text>
      </View>
      <Text style={[type.footnote, { color: t.onAccentLight, fontWeight: "400" }]}>
        {live.stopsBefore > 0
          ? `Antes entrega a ${live.stopsBefore} cliente${live.stopsBefore !== 1 ? "s" : ""} más. `
          : "Va directo hacia ti. "}
        Ubicación en vivo, actualizada {sinceLabel(new Date(live.courier.at).getTime())}.
      </Text>
    </View>
  );
}
