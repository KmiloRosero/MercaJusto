import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { radius, spacing, type, useTheme, formatCOP } from "../theme";
import type { Order } from "../api/types";
import { NEXT_ACTION, ORDER_STATUS } from "../lib/orderStatus";
import { useCart } from "../store/cart";
import { toast } from "../store/toast";
import { Pill } from "./Pill";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { FieldTile } from "./FieldTile";
import { PressableScale } from "./PressableScale";

interface OrderCardProps {
  order: Order;
  isBuyer: boolean;
  /** Usuario actual: el productor ve solo sus líneas del pedido. */
  userId?: string;
  onPress: () => void;
  onAdvance?: (order: Order) => void;
  advancing?: boolean;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function when(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`;
}

/**
 * Pedido como en las apps de domicilio: la cosecha primero (foto o color del
 * campo), qué se compró, su estado y la acción que toca. El comprador puede
 * volver a pedir lo mismo con un toque; el productor avanza el pedido.
 */
export function OrderCard({ order, isBuyer, userId, onPress, onAdvance, advancing }: OrderCardProps) {
  const t = useTheme();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const [reordering, setReordering] = useState(false);
  const status = ORDER_STATUS[order.status];
  const action = !isBuyer ? NEXT_ACTION[order.status] : undefined;
  const lines = isBuyer ? order.items : order.items.filter((it) => it.product?.producerId === userId);
  const first = lines[0]?.product;
  const isDelivered = order.status === "DELIVERED";
  const reviewed = (order.reviews ?? []).some((r) => r.fromUserId === userId);

  // Vuelve a armar la canasta con lo mismo; lo que ya no está disponible se omite.
  const reorder = async () => {
    setReordering(true);
    let added = 0;
    for (const it of order.items) {
      const p = it.product;
      if (!p || !p.isActive || p.stock <= 0) continue;
      if (await addToCart(p.id, Math.min(it.quantity, p.stock))) added += 1;
    }
    setReordering(false);
    if (added === 0) {
      toast.error("Esos productos ya no están disponibles");
      useCart.setState({ error: null });
      return;
    }
    const missing = order.items.length - added;
    toast.success(missing > 0 ? `Agregamos ${added} producto${added !== 1 ? "s" : ""}; ${missing} ya no está${missing !== 1 ? "n" : ""} disponible${missing !== 1 ? "s" : ""}` : "Tu pedido está otra vez en la canasta");
    router.push("/(tabs)/cart");
  };

  // La tarjeta no es un botón: un botón no puede contener otros (las acciones).
  // Lo que abre el pedido es la parte de arriba; las acciones van aparte.
  return (
    <View
      style={{
        backgroundColor: t.bgCard,
        borderRadius: radius.lg,
        padding: spacing[4],
        gap: spacing[3],
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Pedido del ${when(order.createdAt)}, ${status.label}. Ver detalle`}
        style={{ flexDirection: "row", gap: spacing[3] }}
      >
        <View>
          <FieldTile category={first?.category} productName={first?.name} size={56} iconSize={28} radius={radius.md} />
          {lines.length > 1 ? (
            <View
              style={{
                position: "absolute",
                right: -6,
                bottom: -6,
                minWidth: 24,
                height: 24,
                paddingHorizontal: 5,
                borderRadius: radius.full,
                backgroundColor: t.inverseSurface,
                borderWidth: 2,
                borderColor: t.bgCard,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: t.onInverseSurface, fontSize: 12, fontWeight: "800" }}>+{lines.length - 1}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.callout, { color: t.textPrimary, fontWeight: "700" }]} numberOfLines={2}>
            {lines.map((it) => `${it.quantity} ${it.product?.unit ?? ""} ${it.product?.name ?? "Producto"}`.replace(/\s+/g, " ")).join(", ") ||
              `${order.items.length} producto${order.items.length !== 1 ? "s" : ""}`}
          </Text>
          <Text style={[type.footnote, { color: t.textTertiary, fontWeight: "400" }]} numberOfLines={1}>
            {!isBuyer && order.buyer ? `${order.buyer.name} · ` : ""}
            {when(order.createdAt)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2], marginTop: 2 }}>
            <Pill variant={status.variant} icon={status.icon}>
              {status.label}
            </Pill>
            <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary }}>
              {formatCOP(isBuyer ? order.total : lines.reduce((acc, it) => acc + it.subtotal, 0))}
            </Text>
          </View>
        </View>
      </PressableScale>

      {action && onAdvance ? (
        <Button
          title={action.label}
          icon={<Icon name={action.icon} size={18} color={t.onPrimary} />}
          onPress={() => onAdvance(order)}
          loading={advancing}
          full
        />
      ) : null}

      {isBuyer && isDelivered ? (
        <View style={{ flexDirection: "row", gap: spacing[2] }}>
          <Button
            title="Volver a pedir"
            size="sm"
            icon={<Icon name="refresh" size={16} color={t.onPrimary} />}
            loading={reordering}
            onPress={reorder}
            style={{ flex: 1 }}
          />
          {!reviewed ? (
            <Button
              title="Calificar"
              size="sm"
              variant="outline"
              icon={<Icon name="star-outline" size={16} color={t.primary} />}
              onPress={() => router.push(`/calificacion/${order.id}`)}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
