import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { haversineKm } from "./routing";

// Aviso de excedente cerca: cuando un productor pone una cosecha en modo
// excedente, se avisa a los compradores cuya dirección de entrega queda a
// poca distancia de la finca. Convierte la sobreproducción en ventas antes
// de que se pierda, que es la razón de ser del modo excedente.

/** Radio del aviso: cubre Pasto y los municipios vecinos sin avisar a todo Nariño. */
export const SURPLUS_ALERT_RADIUS_KM = 60;

interface SurplusProduct {
  id: string;
  name: string;
  municipio: string;
  discountPct: number;
  latitude: number;
  longitude: number;
  producerId: string;
}

/** Fire and forget: nunca rompe la petición que lo dispara. */
export async function notifySurplusNearby(product: SurplusProduct): Promise<void> {
  try {
    const producer = await prisma.user.findUnique({ where: { id: product.producerId }, select: { name: true } });
    const buyers = await prisma.user.findMany({
      where: { role: "BUYER", pushTokens: { some: {} } },
      select: { id: true, addresses: { select: { latitude: true, longitude: true, isDefault: true } } },
    });

    const farm = { lat: product.latitude, lng: product.longitude };
    const firstName = producer?.name.split(" ")[0] ?? "Un productor";
    for (const b of buyers) {
      const addr = b.addresses.find((a) => a.isDefault) ?? b.addresses[0];
      if (!addr) continue;
      const km = haversineKm(farm, { lat: addr.latitude, lng: addr.longitude });
      if (km > SURPLUS_ALERT_RADIUS_KM) continue;
      void sendPushToUser(b.id, {
        title: `🌿 Excedente cerca: ${product.name} con ${product.discountPct}% de descuento`,
        body: `${firstName} tiene cosecha de sobra en ${product.municipio}. Cómprala antes de que se pierda.`,
        data: { productId: product.id },
      });
    }
  } catch (err) {
    console.warn("⚠️ Aviso de excedente falló (ignorado):", err);
  }
}
