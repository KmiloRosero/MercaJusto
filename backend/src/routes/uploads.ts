import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { BadRequestError } from "../middleware/errorHandler";

export const uploadsRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 4000}`;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
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
  res.status(201).json({ url: `${PUBLIC_URL}/uploads/${req.file.filename}` });
});
