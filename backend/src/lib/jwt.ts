import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en producción");
}

const SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-production";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
/** Tiempo para completar el registro después de verificar el código. */
const REGISTRATION_TTL = "15m";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, SECRET) as JwtPayload & { purpose?: string };
  // Un token de registro no abre sesión: solo sirve para crear la cuenta.
  if (payload.purpose || !payload.userId) throw new Error("Token sin sesión");
  return payload;
}

/**
 * Prueba de que el correo ya se verificó, para crear la cuenta sin pedir
 * otro código (el código se gasta al aprobarlo).
 */
export function signRegistrationToken(email: string): string {
  return jwt.sign({ purpose: "register", email }, SECRET, { expiresIn: REGISTRATION_TTL } as jwt.SignOptions);
}

export function verifyRegistrationToken(token: string): string {
  const payload = jwt.verify(token, SECRET) as { purpose?: string; email?: string };
  if (payload.purpose !== "register" || !payload.email) throw new Error("Token de registro inválido");
  return payload.email;
}
