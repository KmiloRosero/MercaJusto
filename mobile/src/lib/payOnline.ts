import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { startPayment, syncPayment } from "../api/client";
import type { PaymentStatus } from "../api/types";

/**
 * Abre el checkout de Wompi en un navegador seguro dentro de la app. Wompi
 * vuelve a la app al terminar y aquí se confirma el resultado con el backend
 * (que a su vez lo confirma con Wompi), sin depender solo del webhook.
 */
export async function payOnline(orderId: string): Promise<PaymentStatus> {
  const returnUrl = Linking.createURL(`/seguimiento/${orderId}`);
  const checkoutUrl = await startPayment(orderId, returnUrl);
  await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
  const { paymentStatus } = await syncPayment(orderId);
  return paymentStatus;
}
