import { createHash, timingSafeEqual } from "crypto";

// Llaves del panel de Wompi (Desarrolladores → Llaves del API y Secretos).
// Con llaves pub_test_/prv_test_ todo corre en el ambiente de pruebas (sandbox).
const PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY ?? "";
const INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET ?? "";
const EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET ?? "";

export const wompiEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY && INTEGRITY_SECRET && EVENTS_SECRET);
export const wompiSandbox = PUBLIC_KEY.startsWith("pub_test_");

const API_BASE = wompiSandbox ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1";
const CHECKOUT_URL = "https://checkout.wompi.co/p/";

export type WompiStatus = "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";

export interface WompiTransaction {
  id: string;
  reference: string;
  status: WompiStatus;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** URL del Web Checkout de Wompi: allí el comprador elige Nequi, PSE, tarjeta, etc. */
export function checkoutUrl(input: { reference: string; amountInCents: number; redirectUrl: string; phone?: string }) {
  const params = new URLSearchParams({
    "public-key": PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": String(input.amountInCents),
    reference: input.reference,
    // Integridad: SHA-256 de referencia + monto + moneda + secreto. Evita que alteren el monto.
    "signature:integrity": sha256(`${input.reference}${input.amountInCents}COP${INTEGRITY_SECRET}`),
    "redirect-url": input.redirectUrl,
  });
  if (input.phone) {
    params.set("customer-data:phone-number", input.phone.replace(/^\+57/, ""));
    params.set("customer-data:phone-number-prefix", "+57");
  }
  return `${CHECKOUT_URL}?${params.toString()}`;
}

/**
 * Verifica un evento del webhook: SHA-256 de los valores indicados en
 * `signature.properties`, el `timestamp` y el secreto de eventos.
 */
export function verifyEvent(event: {
  data?: Record<string, unknown>;
  timestamp?: number;
  signature?: { properties?: string[]; checksum?: string };
}): boolean {
  const props = event.signature?.properties;
  const checksum = event.signature?.checksum;
  if (!props?.length || !checksum || event.timestamp === undefined || !event.data) return false;

  const values = props.map((path) =>
    path.split(".").reduce<unknown>((obj, key) => (obj as Record<string, unknown> | undefined)?.[key], event.data)
  );
  const expected = sha256(`${values.join("")}${event.timestamp}${EVENTS_SECRET}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(checksum.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

async function wompiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${PRIVATE_KEY}` } });
  if (!res.ok) throw new Error(`Wompi ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export async function getTransaction(id: string): Promise<WompiTransaction> {
  const { data } = await wompiGet<{ data: WompiTransaction }>(`/transactions/${encodeURIComponent(id)}`);
  return data;
}

/** Última transacción de una referencia (o null si el comprador no llegó a pagar). */
export async function findTransactionByReference(reference: string): Promise<WompiTransaction | null> {
  const { data } = await wompiGet<{ data: WompiTransaction[] }>(
    `/transactions?reference=${encodeURIComponent(reference)}`
  );
  return data.find((t) => t.status === "APPROVED") ?? data[0] ?? null;
}
