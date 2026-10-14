import { useCallback } from "react";
import { useCart } from "../store/cart";
import { toast } from "../store/toast";

/** Agrega a la canasta mostrando un aviso de éxito o error. */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  return useCallback(
    async (productId: string, quantity = 1, name?: string): Promise<boolean> => {
      const ok = await add(productId, quantity);
      if (ok) {
        toast.success(name ? `${name} agregado a tu canasta` : "Agregado a tu canasta");
      } else {
        toast.error(useCart.getState().error ?? "No se pudo agregar a la canasta");
        useCart.setState({ error: null });
      }
      return ok;
    },
    [add]
  );
}
