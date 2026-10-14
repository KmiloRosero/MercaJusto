import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { MulterError } from "multer";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso no encontrado") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "No autorizado") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Petición inválida", details?: unknown) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "El recurso ya existe") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join(".");
    return res.status(400).json({
      error: first ? `Dato inválido${field ? ` en "${field}"` : ""}: ${first.message}` : "Datos inválidos",
      details: err.flatten(),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Este registro ya existe" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Recurso no encontrado" });
    }
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Referencia inválida a otro registro" });
    }
  }

  if (err instanceof MulterError) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "La imagen supera el tamaño máximo permitido" : err.message;
    return res.status(400).json({ error: msg });
  }

  // JSON mal formado en el body
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "JSON inválido en la petición" });
  }

  console.error("💥 Unhandled error:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
