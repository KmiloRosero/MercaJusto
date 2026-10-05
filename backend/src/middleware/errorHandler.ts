import { NextFunction, Request, Response } from "express";

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

export class BadRequestError extends HttpError {
  constructor(message = "Petición inválida", details?: unknown) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details,
    });
  }

  console.error("💥 Unhandled error:", err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
