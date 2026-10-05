import { NextFunction, Request, Response } from "express";
import { JwtPayload, verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Falta el token de autenticación"));
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Token inválido o expirado"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError(`Se requiere rol: ${roles.join(" o ")}`));
    }
    next();
  };
}
