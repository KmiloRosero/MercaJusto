import { HttpError } from "../middleware/errorHandler";

// Correo transaccional con Brevo (plan gratis: 300 correos al día).
// El remitente tiene que estar verificado en Brevo → Senders.
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL;
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "MercaJusto";

export const mailEnabled = Boolean(BREVO_API_KEY && MAIL_FROM_EMAIL);

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail({ to, subject, text, html }: Mail): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: MAIL_FROM_NAME, email: MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    console.error(`[MAIL] Brevo rechazó el envío (${res.status}):`, data.code, data.message);
    throw new HttpError(502, "No pudimos enviar el correo. Intenta de nuevo en un momento.");
  }
}
