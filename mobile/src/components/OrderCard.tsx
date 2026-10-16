import React from "react";
import { Text, View } from "react-native";
import { fontSize, radius, spacing, useTheme, formatCOP } from "../theme";
import type { Order } from "../api/types";
import { NEXT_ACTION, ORDER_STATUS } from "../lib/orderStatus";
import { Pill } from "./Pill";
import { Button } from "./Button";
import { Icon } from "./Icon";
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

export function OrderCard({ order, isBuyer, userId, onPress, onAdvance, advancing }: OrderCardProps) {
  const t = useTheme();
  const status = ORDER_STATUS[order.status];
  const action = !isBuyer ? NEXT_ACTION[order.status] : undefined;
  const lines = isBuyer ? order.items : order.items.filter((it) => it.product?.producerId === userId);

  return (
    <PressableScale
      onPress={onPress}
      style={{
        backgroundColor: t.bgCard,
        borderRadius: radius.lg,
        padding: spacing[4],
        gap: spacing[2],
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: fontSize.xs, color: t.textTertiary, fontWeight: "700" }}>
          #{order.id.slice(-8).toUpperCase()}
        </Text>
        <Pill variant={status.variant} icon={status.icon}>
          {status.label}
        </Pill>
      </View>

      <Text style={{ fontSize: fontSize.base, fontWeight: "700", color: t.textPrimary }} numberOfLines={2}>
        {lines.map((it) => `${it.quantity} × ${it.product?.name ?? "Producto"}`).join(", ") ||
          `${order.items.length} producto${order.items.length !== 1 ? "s" : ""}`}
      </Text>

      <Text style={{ fontSize: fontSize.xs, color: t.textSecondary }}>
        {!isBuyer && order.buyer ? `${order.buyer.name} · ` : ""}
        {order.deliveryAddress ? `${order.deliveryAddress.municipio} · ` : ""}
        {new Date(order.createdAt).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: spacing[2],
          paddingTop: spacing[2],
          borderTopWidth: 1,
          borderTopColor: t.border,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: t.textPrimary }}>
          {formatCOP(isBuyer ? order.total : lines.reduce((acc, it) => acc + it.subtotal, 0))}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: t.primary, fontSize: fontSize.sm, fontWeight: "700" }}>
            {isBuyer ? "Seguimiento" : "Ver detalle"}
          </Text>
          <Icon name="arrow-forward" size={14} color={t.primary} />
        </View>
      </View>

      {action && onAdvance ? (
        <Button
          title={action.label}
          icon={<Icon name={action.icon} size={18} color={t.onPrimary} />}
          onPress={() => onAdvance(order)}
          loading={advancing}
          full
          style={{ marginTop: spacing[2] }}
        />
      ) : null}
    </PressableScale>
  );
}
