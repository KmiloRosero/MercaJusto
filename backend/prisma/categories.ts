// Catálogo base: las categorías son datos de referencia, no de prueba.
// Se ejecuta en cada arranque y es idempotente: crea las que falten y no toca
// usuarios, productos ni pedidos.
import { PrismaClient } from "@prisma/client";

export const CATEGORIES = [
  { name: "Tubérculos", icon: "🥔", slug: "tuberculos" },
  { name: "Verduras", icon: "🥬", slug: "verduras" },
  { name: "Frutas", icon: "🍎", slug: "frutas" },
  { name: "Granos", icon: "🫘", slug: "granos" },
  { name: "Lácteos y huevos", icon: "🥚", slug: "lacteos-huevos" },
  { name: "Café y cacao", icon: "☕", slug: "cafe-cacao" },
  { name: "Hierbas", icon: "🌿", slug: "hierbas" },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const c of CATEGORIES) {
      await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    }
    console.log(`🏷️ Categorías listas (${CATEGORIES.length})`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ categorías:", e);
    process.exit(1);
  });
}
