import { randomInt } from "crypto";
import { prisma } from "./prisma";

const TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;
const DEV_MODE = process.env.OTP_DEV_MODE === "true";
const DEV_CODE = process.env.OTP_DEV_CODE || "123456";
const MAX_ATTEMPTS = 5;

// Intentos fallidos por teléfono (en memoria): al superar el máximo se
// invalidan los códigos vigentes y el usuario debe pedir uno nuevo.
const failedAttempts = new Map<string, number>();

export async function issueOtp(phone: string): Promise<{ code: string; dev: boolean }> {
  // Invalida OTPs previos del mismo teléfono
  await prisma.otpCode.updateMany({
    where: { phone, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  failedAttempts.delete(phone);

  const code = DEV_MODE ? DEV_CODE : randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);

  await prisma.otpCode.create({
    data: { phone, code, expiresAt },
  });

  if (!DEV_MODE) {
    // TODO: integrar Twilio SMS o WhatsApp Business API
    // await twilio.messages.create({ to: phone, body: `MercaJusto: tu código es ${code}` });
    console.log(`[OTP] Enviando SMS a ${phone}: ${code}`);
  }

  return { code, dev: DEV_MODE };
}

/**
 * Valida el código. Con `consume: false` solo comprueba (sirve para pedir el
 * registro de un usuario nuevo sin gastar el código).
 */
export async function verifyOtp(
  phone: string,
  code: string,
  { consume = true }: { consume?: boolean } = {}
): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: { phone, code, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    const attempts = (failedAttempts.get(phone) ?? 0) + 1;
    failedAttempts.set(phone, attempts);
    if (attempts >= MAX_ATTEMPTS) {
      failedAttempts.delete(phone);
      await prisma.otpCode.updateMany({
        where: { phone, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    }
    return false;
  }

  if (consume) {
    failedAttempts.delete(phone);
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  return true;
}
