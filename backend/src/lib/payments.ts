import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { findTransactionByReference, wompiEnabled, WompiTransaction } from "./wompi";

/** Minutos que se guarda el stock de un pedido en línea mientras se paga. */
const PAYMENT_WINDOW_MIN = Number(process.env.PAYMENT_WINDOW_MIN) || 30;

/** Avisa a cada productor del pedido que tiene algo que alistar. */
export async function notifyProducersOfNewOrder(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { product: { select: { producerId: true } } },
  });
  for (const producerId of new Set(items.map((it) => it.product.producerId))) {
    void sendPushToUser(producerId, {
      title: "🧺 ¡Nuevo pedido!",
      body: "Tienes un pedido nuevo para alistar. Revísalo en tu inicio.",
      data: { orderId },
    });
  }
}

/**
 * Aplica el resultado de una transacción de Wompi a su pedido. Es idempotente:
 * el webhook, el regreso del checkout y la sincronización pueden llegar en
 * cualquier orden y solo el primero que aprueba cambia el pedido.
 */
export async function applyTransaction(tx: WompiTransaction): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentReference: tx.reference } });
  if (!order || order.paymentStatus === "PAID") return;

  if (tx.status === "APPROVED") {
    if (tx.currency !== "COP" || tx.amount_in_cents !== order.total * 100) {
      console.error(`❌ Pago ${tx.id}: monto ${tx.amount_in_cents} ${tx.currency} no coincide con el pedido ${order.id}`);
      return;
    }
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: {
        paymentStatus: "PAID",
        paymentTransactionId: tx.id,
        paidAt: new Date(),
        ...(order.status === "PENDING" ? { status: "CONFIRMED" } : {}),
      },
    });
    if (count === 0) return;
    if (order.status === "CANCELLED") {
      // Su stock ya se devolvió: no se revive, se devuelve el dinero desde el panel de Wompi.
      console.error(`⚠️ Pedido ${order.id} pagado después de cancelarse (transacción ${tx.id}): reembolsar`);
      void sendPushToUser(order.buyerId, {
        title: "Tu pago llegó tarde",
        body: "El pedido ya se había cancelado. Te devolveremos el dinero.",
        data: { orderId: order.id },
      });
      return;
    }
    void sendPushToUser(order.buyerId, {
      title: "✅ Pago aprobado",
      body: "Recibimos tu pago. El productor ya puede alistar tu pedido.",
      data: { orderId: order.id },
    });
    await notifyProducersOfNewOrder(order.id);
    return;
  }

  if (tx.status === "DECLINED" || tx.status === "VOIDED" || tx.status === "ERROR") {
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: { not: "PAID" } },
      data: { paymentStatus: "FAILED", paymentTransactionId: tx.id },
    });
  }
}

/** Consulta a Wompi el último intento del pedido y lo aplica. */
export async function syncOrderPayment(orderId: string): Promise<void> {
  if (!wompiEnabled) return;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.paymentReference || order.paymentStatus === "PAID") return;
  const tx = await findTransactionByReference(order.paymentReference);
  if (tx) await applyTransaction(tx);
}

/**
 * Cancela los pedidos en línea que no se pagaron a tiempo y devuelve el stock.
 * Antes de cancelar pregunta a Wompi, por si el webhook no llegó.
 */
export async function expireUnpaidOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MIN * 60_000);
  const stale = await prisma.order.findMany({
    where: { paymentMethod: "WOMPI", paymentStatus: { not: "PAID" }, status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const { id } of stale) {
    try {
      await syncOrderPayment(id);
      await prisma.$transaction(async (db) => {
        // Condicional: si entre tanto se pagó o se canceló, no hace nada
        const { count } = await db.order.updateMany({
          where: { id, status: "PENDING", paymentStatus: { not: "PAID" } },
          data: { status: "CANCELLED" },
        });
        if (count === 0) return;
        const items = await db.orderItem.findMany({ where: { orderId: id } });
        for (const it of items) {
          await db.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } });
        }
      });
    } catch (err) {
      console.error(`❌ No se pudo expirar el pedido ${id}:`, err);
    }
  }
}
