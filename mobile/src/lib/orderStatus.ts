import type { IconName } from "../components/Icon";
import type { OrderStatus } from "../api/types";

export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; icon: IconName; variant: "primary" | "success" | "warning" | "danger" | "accent" }
> = {
  PENDING: { label: "Pendiente", icon: "time-outline", variant: "warning" },
  CONFIRMED: { label: "Confirmado", icon: "checkmark-circle", variant: "primary" },
  PREPARING: { label: "Preparando", icon: "preparing", variant: "accent" },
  IN_TRANSIT: { label: "En camino", icon: "in_transit", variant: "accent" },
  DELIVERED: { label: "Entregado", icon: "delivered", variant: "success" },
  CANCELLED: { label: "Cancelado", icon: "close", variant: "danger" },
};

/** Siguiente paso que puede dar el productor/repartidor sobre un pedido. */
export const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: IconName }>> = {
  PENDING: { next: "CONFIRMED", label: "Confirmar pedido", icon: "checkmark-circle" },
  CONFIRMED: { next: "PREPARING", label: "Empezar a preparar", icon: "preparing" },
  PREPARING: { next: "IN_TRANSIT", label: "Despachar pedido", icon: "in_transit" },
  IN_TRANSIT: { next: "DELIVERED", label: "Marcar como entregado", icon: "delivered" },
};

/** El comprador solo puede cancelar antes de que se empiece a preparar. */
export const BUYER_CAN_CANCEL: OrderStatus[] = ["PENDING", "CONFIRMED"];
