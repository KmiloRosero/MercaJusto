import { prisma } from "./prisma";

const TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;
const DEV_MODE = process.env.OTP_DEV_MODE === "true";
const DEV_CODE = process.env.OTP_DEV_CODE || "123456";

export async function issueOtp(phone: string): Promise<{ code: string; dev: boolean }> {
  // Invalida OTPs previos del mismo teléfono
  await prisma.otpCode.updateMany({
    where: { phone, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const code = DEV_MODE ? DEV_CODE : Math.floor(100000 + Math.random() * 900000).toString();
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

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: { phone, code, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
