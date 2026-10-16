import { createHash } from "crypto";

// Credenciales del panel de Cloudinary (Dashboard → API Keys).
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || "mercajusto/productos";

export const cloudinaryEnabled = Boolean(CLOUD && KEY && SECRET);

/** Firma de Cloudinary: parámetros ordenados, unidos con & y el secreto al final, en SHA-1. */
function sign(params: Record<string, string>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + SECRET).digest("hex");
}

/**
 * Sube una imagen y devuelve su URL HTTPS permanente. El original se limita a
 * 1600 px para no guardar fotos de 12 MP que nadie va a ver completas.
 */
export async function uploadToCloudinary(file: Buffer, mimeType: string): Promise<string> {
  const params = {
    folder: FOLDER,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    transformation: "c_limit,w_1600,h_1600",
  };
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }));
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", KEY!);
  form.append("signature", sign(params));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(`Cloudinary: ${data.error?.message ?? res.status}`);
  }
  return data.secure_url;
}
