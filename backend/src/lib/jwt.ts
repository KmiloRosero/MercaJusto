import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET es obligatorio en producción");
}

const SECRET = process.env.JWT_SECRET || "dev-secret-do-not-use-in-production";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, SECRET) as JwtPayload & { purpose?: string };
  // Tokens con otro propósito (p. ej. los de registro de versiones anteriores) no abren sesión.
  if (payload.purpose || !payload.userId) throw new Error("Token sin sesión");
  return payload;
}
