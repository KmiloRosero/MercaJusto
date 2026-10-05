import "dotenv/config";
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
import { errorHandler, NotFoundError } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Imágenes subidas (fotos de cosecha) servidas como estáticos
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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

app.use((_req, _res, next) => next(new NotFoundError()));
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log("");
  console.log("🛒 MercaJusto API");
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log("");
});
