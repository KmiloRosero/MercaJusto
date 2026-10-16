import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { issueOtp, verifyOtp } from "../lib/otp";
import { signRegistrationToken, signToken, verifyRegistrationToken } from "../lib/jwt";
import { createRateLimiter } from "../lib/rateLimit";
import { BadRequestError, UnauthorizedError } from "../middleware/errorHandler";
export const authRouter = Router();

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Escribe un correo válido, por ejemplo nombre@gmail.com");
// Celular colombiano en formato E.164: +57 y 10 dígitos que empiezan por 3.
const phoneField = z.string().regex(/^\+573\d{9}$/, "Escribe un celular colombiano de 10 dígitos");
const roleField = z.enum(["BUYER", "PRODUCER", "COURIER"]);

// Máximo 1 código por minuto y 5 por hora por correo, y 15 por hora por IP.
const limitEmail = createRateLimiter([
  { max: 1, windowMs: 60_000, message: "Espera un minuto antes de pedir otro código." },
  { max: 5, windowMs: 60 * 60_000, message: "Pediste muchos códigos. Intenta de nuevo en una hora." },
]);
const limitIp = createRateLimiter([
  { max: 15, windowMs: 60 * 60_000, message: "Demasiadas solicitudes desde esta red. Intenta más tarde." },
]);

const otpSchema = z.object({ email: emailField });

// POST /api/auth/otp — envía el código al correo
authRouter.post("/otp", async (req, res, next) => {
  try {
    const { email } = otpSchema.parse(req.body);
    limitIp(req.ip ?? "unknown");
    limitEmail(email);
    const { devCode } = await issueOtp(email);
    res.json({
      ok: true,
      message: devCode ? `Modo desarrollo: el código es ${devCode}` : "Código enviado a tu correo",
      ...(devCode ? { devCode } : {}),
    });
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.union([
  // Paso normal: correo + código
  z.object({ email: emailField, code: z.string().regex(/^\d{6}$/, "El código tiene 6 dígitos") }),
  // Registro de un usuario nuevo con el correo ya verificado
  z.object({
    registrationToken: z.string().min(10),
    name: z.string().trim().min(2).max(80),
    phone: phoneField,
    role: roleField,
  }),
]);

const userInclude = (role: string) => ({
  addresses: true,
  ...(role === "PRODUCER" ? { products: { where: { isActive: true }, include: { category: true } } } : {}),
});

// POST /api/auth/verify — valida el código (o completa el registro) y devuelve JWT + perfil
authRouter.post("/verify", async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);

    let email: string;
    if ("code" in body) {
      email = body.email;
      const valid = await verifyOtp(email, body.code);
      if (!valid) throw new BadRequestError("Código inválido o expirado");
    } else {
      try {
        email = verifyRegistrationToken(body.registrationToken);
      } catch {
        throw new UnauthorizedError("Se venció el tiempo para crear la cuenta. Pide un código nuevo.");
      }
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (!("registrationToken" in body)) {
        // Correo verificado pero sin cuenta: la app pide nombre, celular y rol.
        throw new BadRequestError("USUARIO_NUEVO", { registrationToken: signRegistrationToken(email) });
      }
      user = await prisma.user.create({
        data: { email, phone: body.phone, name: body.name, role: body.role },
      });
    }

    const fullUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: userInclude(user.role),
    });
    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: fullUser });
  } catch (err) {
    next(err);
  }
});
