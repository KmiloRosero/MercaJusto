/**
 * Backfill de `traditionalPrice` para bases de datos ya sembradas antes de
 * la migración `add_traditional_price`. Actualiza por nombre de producto con
 * los mismos precios de referencia (plaza de mercado / tienda tradicional)
 * que usa el seed. Idempotente: se puede correr varias veces.
 *
 * Uso: npm run db:backfill-prices
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const TRADITIONAL_PRICES: Record<string, number> = {
  "Papa criolla": 12000,
  "Papa pastusa": 5500,
  Mashua: 16000,
  "Oca roja": 13000,
  "Cebolla de hoja": 4000,
  Zanahoria: 4800,
  Remolacha: 6500,
  Cilantro: 2500,
  "Café pergamino seco": 32000,
  "Café molido artesanal": 26000,
  "Plátano hartón": 7000,
  "Huevos de campo": 19000,
  "Queso campesino": 16500,
  "Leche cruda": 4800,
  "Frijol bola roja": 290000,
  "Arroz de meseta": 5600,
  "Lulo andino": 32000,
  Maracuyá: 21000,
  Albahaca: 3500,
  Hierbabuena: 3000,
};

async function main() {
  let updated = 0;
  let missing = 0;
  for (const [name, traditionalPrice] of Object.entries(TRADITIONAL_PRICES)) {
    const result = await prisma.product.updateMany({
      where: { name, traditionalPrice: null },
      data: { traditionalPrice },
    });
    updated += result.count;
    if (result.count === 0) {
      const exists = await prisma.product.count({ where: { name } });
      if (exists === 0) missing += 1;
    }
  }
  const total = await prisma.product.count();
  const withPrice = await prisma.product.count({
    where: { NOT: { traditionalPrice: null } },
  });
  console.log(
    `✅ Backfill listo: ${updated} productos actualizados, ${withPrice}/${total} con traditionalPrice` +
      (missing ? ` (${missing} nombres del mapa no existen en la BD)` : "")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
