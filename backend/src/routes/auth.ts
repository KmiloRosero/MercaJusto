import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { issueOtp, verifyOtp } from "../lib/otp";
import { signToken } from "../lib/jwt";
import { BadRequestError } from "../middleware/errorHandler";
export const authRouter = Router();

const phoneSchema = z.object({
  phone: z.string().min(10).max(20),
  role: z.enum(["BUYER", "PRODUCER"]).optional(),
});

const verifySchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().length(6),
  name: z.string().min(2).optional(),
  role: z.enum(["BUYER", "PRODUCER"]).optional(),
});

// POST /api/auth/otp — envía código al teléfono
authRouter.post("/otp", async (req, res, next) => {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const { code, dev } = await issueOtp(phone);
    res.json({
      ok: true,
      message: dev ? "Modo desarrollo: el código es 123456" : "Código enviado por SMS",
      ...(dev ? { devCode: code } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify — valida código y devuelve JWT + perfil completo
authRouter.post("/verify", async (req, res, next) => {
  try {
    const { phone, code, name, role } = verifySchema.parse(req.body);

    const valid = await verifyOtp(phone, code);
    if (!valid) throw new BadRequestError("Código inválido o expirado");

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      if (!name) {
        throw new BadRequestError("USUARIO_NUEVO", {
          phone,
          message: "Usuario no registrado. Envía `name` y `role` para crearlo.",
        });
      }
      user = await prisma.user.create({
        data: { phone, name, role: role || "BUYER" },
      });
    }

    // Recargar con relaciones para devolver el perfil completo
    const fullUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        addresses: true,
        ...(user.role === "PRODUCER"
          ? { products: { where: { isActive: true }, include: { category: true } } }
          : {}),
      },
    });

    const token = signToken({ userId: user.id, phone: user.phone, role: user.role });

    res.json({ token, user: fullUser });
  } catch (err) {
    next(err);
  }
});
