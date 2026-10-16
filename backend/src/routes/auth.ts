import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { checkPassword, dummyPasswordHash, hashPassword } from "../lib/password";
import { createRateLimiter } from "../lib/rateLimit";
import { HttpError, UnauthorizedError } from "../middleware/errorHandler";
export const authRouter = Router();

// Celular colombiano en formato E.164: +57 y 10 dígitos que empiezan por 3.
const phoneField = z.string().regex(/^\+573\d{9}$/, "Escribe un celular colombiano de 10 dígitos");
const roleField = z.enum(["BUYER", "PRODUCER", "COURIER"]);
const passwordField = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

// Contra quien prueba contraseñas: 10 intentos cada 15 minutos por celular y 50 por hora por IP.
const limitPhone = createRateLimiter([
  { max: 10, windowMs: 15 * 60_000, message: "Demasiados intentos. Espera 15 minutos e intenta de nuevo." },
]);
const limitIp = createRateLimiter([
  { max: 50, windowMs: 60 * 60_000, message: "Demasiadas solicitudes desde esta red. Intenta más tarde." },
]);

const userInclude = (role: string) => ({
  addresses: true,
  ...(role === "PRODUCER" ? { products: { where: { isActive: true }, include: { category: true } } } : {}),
});

async function session(userId: string, role: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude(role) });
  return { token: signToken({ userId, role }), user };
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  phone: phoneField,
  password: passwordField,
  role: roleField,
});

// POST /api/auth/register — crea la cuenta y devuelve JWT + perfil
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    limitIp(req.ip ?? "unknown");

    const exists = await prisma.user.findUnique({ where: { phone: body.phone }, select: { id: true } });
    if (exists) throw new HttpError(409, "Ya hay una cuenta con ese celular. Inicia sesión.");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
    });
    res.status(201).json(await session(user.id, user.role));
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, "Escribe tu contraseña").max(128),
});

// POST /api/auth/login — valida celular + contraseña y devuelve JWT + perfil
authRouter.post("/login", async (req, res, next) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    limitIp(req.ip ?? "unknown");
    limitPhone(phone);

    const user = await prisma.user.findUnique({ where: { phone }, omit: { passwordHash: false } });
    const valid = await checkPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !valid) throw new UnauthorizedError("Celular o contraseña incorrectos");
    if (!user.isActive) throw new UnauthorizedError("Esta cuenta está desactivada");

    res.json(await session(user.id, user.role));
  } catch (err) {
    next(err);
  }
});
