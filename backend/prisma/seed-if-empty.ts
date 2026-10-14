// Carga los datos demo solo si la base está vacía (primer despliegue).
// Así reiniciar el servidor en producción no borra pedidos ni usuarios.
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  await prisma.$disconnect();
  if (users > 0) {
    console.log(`🌱 Base con ${users} usuarios: no se cargan datos demo`);
    return;
  }
  console.log("🌱 Base vacía: cargando datos demo...");
  execSync("tsx prisma/seed.ts", { stdio: "inherit" });
}

main().catch((e) => {
  console.error("❌ seed-if-empty:", e);
  process.exit(1);
});
