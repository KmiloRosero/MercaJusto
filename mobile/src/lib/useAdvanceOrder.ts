import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiErrorMessage, updateOrderStatus } from "../api/client";
import type { Order } from "../api/types";
import { NEXT_ACTION } from "./orderStatus";
import { showAlert } from "./dialog";

/** Avanza un pedido a su siguiente estado (productor o repartidor) y refresca las listas. */
export function useAdvanceOrder() {
  const queryClient = useQueryClient();
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const advance = async (order: Order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    setAdvancingId(order.id);
    try {
      await updateOrderStatus(order.id, action.next);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
    } catch (err) {
      showAlert("No se pudo actualizar", apiErrorMessage(err));
    } finally {
      setAdvancingId(null);
    }
  };

  return { advance, advancingId };
}
