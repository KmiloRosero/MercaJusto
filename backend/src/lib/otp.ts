import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";

// Envío real con Twilio Verify: Twilio genera, envía por SMS y valida el código.
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

// Solo para desarrollo local, sin SMS: código fijo que la app muestra en pantalla.
const DEV_MODE = process.env.OTP_DEV_MODE === "true" && process.env.NODE_ENV !== "production";
const DEV_CODE = process.env.OTP_DEV_CODE || "123456";
const DEV_TTL_SECONDS = 300;
const DEV_MAX_ATTEMPTS = 5;

export type OtpMode = "twilio" | "dev" | "off";

export const otpMode: OtpMode =
  TWILIO_SID && TWILIO_TOKEN && TWILIO_VERIFY_SID ? "twilio" : DEV_MODE ? "dev" : "off";

const notConfigured = () =>
  new HttpError(503, "El envío de códigos por SMS no está disponible en este momento. Intenta más tarde.");

async function twilio(path: string, body: Record<string, string>) {
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
  const res = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; code?: number; message?: string };
  return { ok: res.ok, httpStatus: res.status, data };
}

/** Envía un código al teléfono (formato E.164, p. ej. +573001234567). */
export async function issueOtp(phone: string): Promise<{ devCode?: string }> {
  if (otpMode === "twilio") {
    const { ok, httpStatus, data } = await twilio("Verifications", { To: phone, Channel: "sms" });
    if (!ok) {
      console.error(`[OTP] Twilio rechazó el envío (${httpStatus}):`, data.code, data.message);
      // 60200: número inválido · 60203: demasiados envíos al mismo número
      if (data.code === 60200) throw new HttpError(400, "Ese número de celular no es válido");
      if (data.code === 60203) throw new HttpError(429, "Pediste muchos códigos. Espera unos minutos.");
      throw new HttpError(502, "No pudimos enviar el SMS. Intenta de nuevo en un momento.");
    }
    return {};
  }

  if (otpMode === "dev") {
    await prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
    failedAttempts.delete(phone);
    await prisma.otpCode.create({
      data: { phone, code: DEV_CODE, expiresAt: new Date(Date.now() + DEV_TTL_SECONDS * 1000) },
    });
    return { devCode: DEV_CODE };
  }

  throw notConfigured();
}

// Intentos fallidos en modo desarrollo (Twilio lleva su propia cuenta).
const failedAttempts = new Map<string, number>();

/** Comprueba el código. Twilio lo da por usado al aprobarlo. */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  if (otpMode === "twilio") {
    const { ok, httpStatus, data } = await twilio("VerificationCheck", { To: phone, Code: code });
    // 404: no hay verificación pendiente (expiró, ya se usó o se agotaron los intentos)
    if (!ok && httpStatus !== 404) {
      console.error(`[OTP] Twilio no pudo validar (${httpStatus}):`, data.code, data.message);
      throw new HttpError(502, "No pudimos validar el código. Intenta de nuevo.");
    }
    return ok && data.status === "approved";
  }

  if (otpMode === "dev") {
    const record = await prisma.otpCode.findFirst({
      where: { phone, code, consumedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      const attempts = (failedAttempts.get(phone) ?? 0) + 1;
      failedAttempts.set(phone, attempts);
      if (attempts >= DEV_MAX_ATTEMPTS) {
        failedAttempts.delete(phone);
        await prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
      }
      return false;
    }
    failedAttempts.delete(phone);
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return true;
  }

  throw notConfigured();
}
