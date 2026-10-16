import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { mailEnabled, sendMail } from "./mailer";
import { HttpError } from "../middleware/errorHandler";

// Solo para desarrollo local, sin correo: el código vuelve en la respuesta y la app lo muestra.
const DEV_MODE = process.env.OTP_DEV_MODE === "true" && process.env.NODE_ENV !== "production";
const SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-production";
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export type OtpMode = "email" | "dev" | "off";

export const otpMode: OtpMode = mailEnabled ? "email" : DEV_MODE ? "dev" : "off";

// Solo se guarda el hash: quien lea la base de datos no puede entrar con él.
const hashCode = (email: string, code: string) =>
  createHmac("sha256", SECRET).update(`${email}:${code}`).digest("hex");

function codeMail(code: string) {
  const text =
    `Tu código para entrar a MercaJusto es ${code}.\n\n` +
    `Vence en ${TTL_MINUTES} minutos. Si no lo pediste, ignora este correo.`;
  const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#17211a">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 4px;font-size:18px;font-weight:bold">MercaJusto</p>
    <p style="margin:0 0 20px;font-size:15px">Tu código para entrar es:</p>
    <p style="margin:0 0 20px;font-size:34px;font-weight:bold;letter-spacing:8px">${code}</p>
    <p style="margin:0;font-size:13px;color:#5b665e">Vence en ${TTL_MINUTES} minutos. Si no lo pediste, ignora este correo.</p>
  </div>
</body></html>`;
  return { subject: `${code} es tu código de MercaJusto`, text, html };
}

/** Genera un código de 6 dígitos y lo envía al correo. Invalida los anteriores. */
export async function issueOtp(email: string): Promise<{ devCode?: string }> {
  if (otpMode === "off") {
    throw new HttpError(503, "El envío de códigos no está disponible en este momento. Intenta más tarde.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpCode.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date() } });
  const record = await prisma.otpCode.create({
    data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000) },
  });

  if (otpMode === "dev") return { devCode: code };

  try {
    await sendMail({ to: email, ...codeMail(code) });
  } catch (err) {
    // Si el correo no salió, el código no debe quedar vivo.
    await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    throw err;
  }
  return {};
}

/** Comprueba el código. Se usa una sola vez y se anula tras 5 intentos fallidos. */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  const expected = Buffer.from(record.codeHash, "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    const { attempts } = await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    }
    return false;
  }

  // updateMany con consumedAt: null evita que dos peticiones usen el mismo código.
  const { count } = await prisma.otpCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return count === 1;
}
