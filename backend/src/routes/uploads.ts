import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { BadRequestError } from "../middleware/errorHandler";

export const uploadsRouter = Router();

// En producción apunta a un volumen persistente (p. ej. /data/uploads)
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// Si PUBLIC_URL no está definido se usa el host con el que llegó la petición,
// así las fotos funcionan aunque cambie la IP de la red local.
function publicBaseUrl(req: Request): string {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

// La extensión se deriva del mimetype validado, nunca del nombre que manda el cliente
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype] ?? ".jpg";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new BadRequestError("Formato no permitido. Usa JPEG, PNG o WEBP."));
    }
    cb(null, true);
  },
});

// Traduce errores de multer (ej. archivo demasiado grande) a HttpError
function uploadSingle(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new BadRequestError("La imagen supera el límite de 5 MB"));
    }
    if (err) return next(err);
    next();
  });
}

// POST /api/uploads — sube una imagen y devuelve su URL pública
uploadsRouter.post("/", requireAuth, uploadSingle, (req, res) => {
  if (!req.file) throw new BadRequestError("No se recibió ningún archivo");
  res.status(201).json({ url: `${publicBaseUrl(req)}/uploads/${req.file.filename}` });
});
