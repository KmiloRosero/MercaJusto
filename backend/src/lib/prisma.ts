import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  // El hash de la contraseña nunca sale en una consulta, salvo que se pida a propósito (login).
  omit: { user: { passwordHash: true } },
});
