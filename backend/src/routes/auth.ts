import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { checkPassword, dummyPasswordHash, hashPassword } from "../lib/password";
import { createRateLimiter } from "../lib/rateLimit";
import { BadRequestError, HttpError, UnauthorizedError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
export const authRouter = Router();

// El correo se guarda en minúsculas para que "Ana@Gmail.com" y "ana@gmail.com" sean la misma cuenta.
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Escribe un correo válido, por ejemplo nombre@gmail.com");
// Celular colombiano en formato E.164: +57 y 10 dígitos que empiezan por 3.
const phoneField = z.string().regex(/^\+573\d{9}$/, "Escribe un celular colombiano de 10 dígitos");
const roleField = z.enum(["BUYER", "PRODUCER", "COURIER"]);
const passwordField = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

// Contra quien prueba contraseñas: 10 intentos cada 15 minutos por correo y 50 por hora por IP.
const limitEmail = createRateLimiter([
  { max: 10, windowMs: 15 * 60_000, message: "Demasiados intentos. Espera 15 minutos e intenta de nuevo." },
]);
// Cambiar la contraseña pide la actual: mismo límite, contado por cuenta.
const limitPasswordChange = createRateLimiter([
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
  email: emailField,
  phone: phoneField,
  password: passwordField,
  role: roleField,
});

// POST /api/auth/register — crea la cuenta y devuelve JWT + perfil
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    limitIp(req.ip ?? "unknown");

    const exists = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
    if (exists) throw new HttpError(409, "Ya hay una cuenta con ese correo. Inicia sesión.");

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
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
  email: emailField,
  password: z.string().min(1, "Escribe tu contraseña").max(128),
});

// POST /api/auth/login — valida correo + contraseña y devuelve JWT + perfil
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    limitIp(req.ip ?? "unknown");
    limitEmail(email);

    const user = await prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } });
    const valid = await checkPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !valid) throw new UnauthorizedError("Correo o contraseña incorrectos");
    if (!user.isActive) throw new UnauthorizedError("Esta cuenta está desactivada");

    res.json(await session(user.id, user.role));
  } catch (err) {
    next(err);
  }
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual").max(128),
  newPassword: passwordField,
});

// POST /api/auth/password — cambia la contraseña de la sesión actual
authRouter.post("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = passwordChangeSchema.parse(req.body);
    const userId = req.user!.userId;
    limitPasswordChange(userId);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!(await checkPassword(currentPassword, user.passwordHash))) {
      throw new BadRequestError("La contraseña actual no es correcta");
    }
    if (currentPassword === newPassword) {
      throw new BadRequestError("La contraseña nueva tiene que ser distinta de la actual");
    }

    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
