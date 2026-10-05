import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "../../src/components/TopBar";
import { Button } from "../../src/components/Button";
import { Pill } from "../../src/components/Pill";
import { Icon } from "../../src/components/Icon";
import { fontSize, radius, spacing, useTheme, formatCOP, shadow } from "../../src/theme";
import { getOrder } from "../../src/api/client";
import { OrderStatus } from "../../src/api/types";
import MapPreview from "../../src/components/MapPreview";

const STEPS: Array<{ key: OrderStatus; label: string; icon: string; desc: string }> = [
  { key: "CONFIRMED", label: "Pedido confirmado", icon: "checkmark-circle", desc: "El productor recibió tu pedido" },
  { key: "PREPARING", label: "Preparando", icon: "preparing", desc: "Están alistando tus productos" },
  { key: "IN_TRANSIT", label: "En camino", icon: "in_transit", desc: "El repartidor va hacia tu dirección" },
  { key: "DELIVERED", label: "Entregado", icon: "delivered", desc: "¡Disfruta tu cosecha fresca!" },
];

const STATUS_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 0,
  PREPARING: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  CANCELLED: -1,
};

export default function Seguimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
    refetchInterval: 15000, // actualiza cada 15s para simular tiempo real
  });

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

  if (isLoading || !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
        <TopBar showBack onBack={() => router.back()} title="Seguimiento" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={t.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = STATUS_INDEX[order.status];
  const isCancelled = order.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  const currentLabel =
    isCancelled ? "Pedido cancelado" :
    isDelivered ? "¡Entregado!" :
    STEPS[currentStep]?.label || "Procesando";

  const currentDesc =
    isCancelled ? "Este pedido fue cancelado." :
    STEPS[currentStep]?.desc || "Estamos procesando tu pedido.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgSecondary }} edges={["top"]}>
      <TopBar showBack onBack={() => router.back()} title="Seguimiento" />

      <ScrollView contentContainerStyle={{ paddingBottom: spacing[10] }}>
        {/* ═══ Mapa en vivo ═══ */}
        <MapPreview origin={origin} destination={destination} />

        {/* ═══ Status card ═══ */}
        <View
          style={{
            backgroundColor: t.bgPrimary,
            borderRadius: radius.xl,
            marginHorizontal: spacing[4],
            marginTop: -spacing[6],
            padding: spacing[5],
            ...shadow.md,
            overflow: "hidden",
          }}
        >
          {/* Barra de gradiente superior */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: t.primary,
            }}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing[4],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isCancelled ? t.danger : t.success,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: isCancelled ? t.danger : t.success,
                }}
              >
                {isCancelled ? "Cancelado" : isDelivered ? "Completado" : "En tiempo real"}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: t.textTertiary, fontWeight: "500" }}>
              #{order.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          <Text style={{ fontSize: 20, fontWeight: "800", color: t.textPrimary, marginBottom: 4 }}>
            {currentLabel}
          </Text>
          <Text style={{ fontSize: 13, color: t.textSecondary, marginBottom: spacing[4] }}>
            {currentDesc}
          </Text>

          {/* ═══ Repartidor ═══ */}
          {order.courier && !isCancelled ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                padding: spacing[3],
                backgroundColor: t.bgSecondary,
                borderRadius: radius.lg,
              }}
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
                  justifyContent: "center",
                }}
              >
                <Icon name="in_transit" size={24} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
                  {order.courier.name}
                </Text>
                <Text style={{ fontSize: 12, color: t.textSecondary }}>
                  Tu repartidor · ⭐ {order.courier.rating?.toFixed(1) || "—"}
                </Text>
              </View>
              {order.courier.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${order.courier!.phone}`)}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: radius.full,
                    backgroundColor: t.success,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Icon name="call" size={18} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ═══ Timeline ═══ */}
        {!isCancelled ? (
          <View
            style={{
              backgroundColor: t.bgPrimary,
              borderRadius: radius.lg,
              marginHorizontal: spacing[4],
              marginTop: spacing[4],
              padding: spacing[4],
              ...shadow.sm,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary, marginBottom: spacing[4] }}>
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
                          backgroundColor: i < currentStep ? t.success : t.border,
                        }}
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
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: state === "pending" ? t.textTertiary : "#FFF",
                        }}
                      >
                        {state === "completed" ? "✓" : step.icon}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: state === "pending" ? t.textTertiary : t.textPrimary,
                      }}
                    >
                      {step.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                      {step.desc}
                    </Text>
                    {state === "active" && order.createdAt ? (
                      <Text style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleString("es-CO", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
            borderRadius: radius.lg,
            marginHorizontal: spacing[4],
            marginTop: spacing[4],
            padding: spacing[4],
            ...shadow.sm,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing[3],
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary }}>
              🧺 Tu pedido
            </Text>
            <Text style={{ fontSize: 12, color: t.textTertiary }}>
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
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
                borderBottomColor: t.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], flex: 1 }}>
                <Text style={{ fontSize: 18 }}>{it.product?.category?.icon || "🌾"}</Text>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: t.textPrimary }}>
                    {it.product?.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: t.textTertiary }}>
                    {it.quantity} {it.product?.unit}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: t.textPrimary }}>
                {formatCOP(it.subtotal)}
              </Text>
            </View>
          ))}

          <View style={{ marginTop: spacing[3], gap: 4 }}>
            <Row label="Subtotal" value={formatCOP(order.subtotal)} color={t.textSecondary} />
            <Row label="Envío" value={formatCOP(order.deliveryFee)} color={t.textSecondary} />
            <Row label="Comisión" value={formatCOP(order.platformFee)} color={t.textTertiary} small />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: spacing[2],
                marginTop: spacing[1],
                borderTopWidth: 2,
                borderTopColor: t.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.textPrimary }}>Total</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", color: t.primary }}>
                {formatCOP(order.total)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: t.textTertiary }}>Pago</Text>
              <Pill variant={order.paymentStatus === "PAID" ? "success" : "warning"}>
                {order.paymentMethod} · {order.paymentStatus === "PAID" ? "Pagado" : "Pendiente"}
              </Pill>
            </View>
          </View>
        </View>

        {/* ═══ Dirección de entrega ═══ */}
        {order.deliveryAddress ? (
          <View
            style={{
              backgroundColor: t.bgPrimary,
              borderRadius: radius.lg,
              marginHorizontal: spacing[4],
              marginTop: spacing[4],
              padding: spacing[4],
              ...shadow.sm,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.textPrimary, marginBottom: spacing[2] }}>
              📍 Dirección de entrega
            </Text>
            <Text style={{ fontSize: 13, color: t.textSecondary }}>
              {[order.deliveryAddress.detail, order.deliveryAddress.vereda, order.deliveryAddress.municipio, order.deliveryAddress.departamento]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {order.notes ? (
              <Text style={{ fontSize: 12, color: t.textTertiary, marginTop: spacing[2], fontStyle: "italic" }}>
                📝 "{order.notes}"
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ═══ CTA calificar ═══ */}
        {isDelivered ? (
          <View style={{ marginHorizontal: spacing[4], marginTop: spacing[5], gap: spacing[2] }}>
            <Button
              title="⭐ Calificar pedido"
              full
              size="lg"
              onPress={() => router.push(`/calificacion/${order.id}`)}
            />
            <Button title="Volver al inicio" variant="ghost" full onPress={() => router.replace("/(tabs)/home")} />
          </View>
        ) : (
          <View style={{ marginHorizontal: spacing[4], marginTop: spacing[5] }}>
            <Button title="Volver al inicio" variant="outline" full onPress={() => router.replace("/(tabs)/home")} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
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
