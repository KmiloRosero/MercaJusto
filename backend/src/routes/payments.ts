import { Request, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { BadRequestError, ForbiddenError, HttpError, NotFoundError } from "../middleware/errorHandler";
import { checkoutUrl, getTransaction, verifyEvent, wompiEnabled, WompiTransaction } from "../lib/wompi";
import { applyTransaction, syncOrderPayment } from "../lib/payments";

export const paymentsRouter = Router();

// La app vuelve a sí misma al terminar de pagar. Solo se permiten sus propios
// esquemas y los orígenes web autorizados, para no servir de redirección abierta.
const WEB_ORIGINS = (process.env.APP_WEB_ORIGINS || "https://mercajusto.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedReturnUrl(url: string): boolean {
  if (/^(mercajusto|exp|exps):\/\//.test(url)) return true;
  try {
    return WEB_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

function publicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

const paymentFields = { id: true, status: true, paymentMethod: true, paymentStatus: true, paidAt: true } as const;

const checkoutSchema = z.object({ returnUrl: z.string().max(500).refine(isAllowedReturnUrl, "URL de regreso no permitida") });

// GET /api/payments/config — la app sabe si ofrecer el pago en línea
paymentsRouter.get("/config", (_req, res) => {
  res.json({ online: wompiEnabled });
});

// POST /api/payments/wompi/:orderId/checkout — abre (o reintenta) el pago en línea
paymentsRouter.post("/wompi/:orderId/checkout", requireAuth, async (req, res, next) => {
  try {
    if (!wompiEnabled) throw new HttpError(503, "El pago en línea no está disponible en este momento.");
    const { returnUrl } = checkoutSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { buyer: { select: { phone: true } } },
    });
    if (!order) throw new NotFoundError("Pedido no encontrado");
    if (order.buyerId !== req.user!.userId) throw new ForbiddenError("Este pedido no es tuyo");
    if (order.paymentMethod !== "WOMPI") throw new BadRequestError("Este pedido se paga en efectivo");
    if (order.paymentStatus === "PAID") throw new BadRequestError("Este pedido ya está pagado");
    if (order.status !== "PENDING") throw new BadRequestError("Este pedido ya no se puede pagar");

    // Referencia nueva en cada intento: Wompi no reutiliza referencias
    const reference = `${order.id}-${Date.now().toString(36)}`;
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentReference: reference, paymentStatus: "PENDING" },
    });

    const redirectUrl = `${publicBaseUrl(req)}/api/payments/wompi/return?to=${encodeURIComponent(returnUrl)}`;
    res.json({
      checkoutUrl: checkoutUrl({ reference, amountInCents: order.total * 100, redirectUrl, phone: order.buyer.phone }),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/wompi/:orderId/sync — la app pregunta cómo quedó el pago al volver
paymentsRouter.post("/wompi/:orderId/sync", requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId }, select: { buyerId: true } });
    if (!order) throw new NotFoundError("Pedido no encontrado");
    if (order.buyerId !== req.user!.userId) throw new ForbiddenError("Este pedido no es tuyo");
    await syncOrderPayment(req.params.orderId);
    res.json(await prisma.order.findUnique({ where: { id: req.params.orderId }, select: paymentFields }));
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/wompi/return — Wompi redirige aquí con ?id=<transacción>; se aplica y se vuelve a la app
paymentsRouter.get("/wompi/return", async (req, res) => {
  const to = typeof req.query.to === "string" && isAllowedReturnUrl(req.query.to) ? req.query.to : null;
  const txId = typeof req.query.id === "string" ? req.query.id : null;
  if (wompiEnabled && txId) {
    try {
      await applyTransaction(await getTransaction(txId));
    } catch (err) {
      console.error("❌ Regreso de Wompi:", err);
    }
  }
  const target = to ? JSON.stringify(to) : "null";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MercaJusto</title></head>
<body style="font-family:system-ui,sans-serif;background:#F7F8F3;color:#17211A;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px">
<div><h1 style="font-size:22px">Volviendo a MercaJusto…</h1>
<p style="color:#4A564D">Si la app no se abre sola, vuelve a ella para ver el estado de tu pedido.</p></div>
<script>var t=${target};if(t){location.replace(t);}</script></body></html>`);
});

// POST /api/payments/wompi/webhook — Wompi avisa cada cambio de una transacción
paymentsRouter.post("/wompi/webhook", async (req, res) => {
  const event = req.body as {
    event?: string;
    data?: { transaction?: WompiTransaction };
    timestamp?: number;
    signature?: { properties?: string[]; checksum?: string };
  };
  if (!wompiEnabled || !verifyEvent(event)) {
    return res.status(401).json({ error: "Firma inválida" });
  }
  try {
    if (event.event === "transaction.updated" && event.data?.transaction) {
      await applyTransaction(event.data.transaction);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook de Wompi:", err);
    // 500 hace que Wompi reintente más tarde
    res.status(500).json({ error: "No se pudo procesar el evento" });
  }
});
