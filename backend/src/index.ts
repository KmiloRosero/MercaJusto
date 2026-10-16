import "dotenv/config";
import os from "os";
import path from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { categoriesRouter } from "./routes/categories";
import { ordersRouter } from "./routes/orders";
import { usersRouter } from "./routes/users";
import { cartRouter } from "./routes/cart";
import { uploadsRouter } from "./routes/uploads";
import { routesRouter } from "./routes/routes";
import { metricsRouter } from "./routes/metrics";
import { paymentsRouter } from "./routes/payments";
import { otpMode } from "./lib/otp";
import { cloudinaryEnabled } from "./lib/cloudinary";
import { wompiEnabled, wompiSandbox } from "./lib/wompi";
import { expireUnpaidOrders } from "./lib/payments";
import { errorHandler, NotFoundError } from "./middleware/errorHandler";
import { UPLOAD_DIR } from "./routes/uploads";

const app = express();
// Render termina TLS en un proxy: así req.protocol refleja https y req.ip es
// la IP real. Solo se confía en ese salto, para que nadie falsifique su IP.
app.set("trust proxy", 1);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Imágenes subidas (fotos de cosecha) servidas como estáticos
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mercajusto-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/users", usersRouter);
app.use("/api/cart", cartRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/routes", routesRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/payments", paymentsRouter);

app.use((_req, _res, next) => next(new NotFoundError()));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log("");
  console.log("🛒 MercaJusto API");
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Códigos de acceso: ${otpMode === "email" ? "correo con Brevo" : otpMode === "dev" ? "modo desarrollo (en pantalla)" : "SIN CONFIGURAR"}`);
  console.log(`   Fotos: ${cloudinaryEnabled ? "Cloudinary" : "disco local"}`);
  console.log(`   Pagos en línea: ${wompiEnabled ? `Wompi (${wompiSandbox ? "pruebas" : "producción"})` : "SIN CONFIGURAR"}`);
  // IPs de la red local: úsalas en EXPO_PUBLIC_API_URL para un celular físico
  for (const iface of Object.values(os.networkInterfaces()).flat()) {
    if (iface && iface.family === "IPv4" && !iface.internal) {
      console.log(`   Red local: http://${iface.address}:${PORT}/api`);
    }
  }
  console.log("");
});

// Pedidos en línea sin pagar: se cancelan y liberan el stock (cada 5 minutos).
setInterval(() => void expireUnpaidOrders(), 5 * 60_000).unref();
