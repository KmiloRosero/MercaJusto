# 🛒 MercaJusto

**Del campo directo a tu mesa.** Plataforma móvil que conecta productores campesinos de Nariño con compradores urbanos, eliminando intermediarios.

> Proyecto de grado — Ingeniería de Sistemas · Universidad de Nariño

---

## 📁 Estructura del monorepo

```
MercaJusto/
├── index.html              # Prototipo visual (mapa de pantallas)
├── css/global.css          # Design system (fuente de verdad)
├── pages/                  # 10 pantallas HTML de referencia
│
├── backend/                # API REST — Node + Express + TypeScript + Prisma
│   ├── prisma/schema.prisma  # Modelo de datos (SQLite por ahora)
│   ├── prisma/seed.ts        # Datos demo reales de Nariño
│   ├── src/                  # Endpoints, middleware, servicios
│   └── docker-compose.yml    # Postgres+PostGIS opcional (fase 3)
│
├── mobile/                 # App móvil — React Native + Expo + TypeScript
│   ├── app/                  # Expo Router (file-based navigation)
│   ├── src/theme/            # Tokens portados del global.css
│   ├── src/components/       # Button, Pill, Chip, ProductCard, TopBar...
│   ├── src/store/            # Zustand (auth, cart)
│   └── src/api/              # Cliente axios + tipos
│
└── docs/                   # (pendiente) diagramas, acta de sustentación
```

---

## 🚀 Arranque rápido

### Requisitos
- **Node.js 20+** (verifica con `node -v`)
- **npm 10+** o pnpm/yarn
- **Expo Go** en tu celular (para probar la app móvil) — [App Store](https://apps.apple.com/app/expo-go/id982107779) · [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 1. Backend

```bash
cd backend
cp .env.example .env            # en Windows: copy .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

API disponible en `http://localhost:4000`.
Healthcheck: `http://localhost:4000/health`

**Credenciales demo** (seed):
- Comprador: `+573001234567` (María Rodríguez) — OTP dev: `123456`
- Productor: `+573104567890` (Don José - Túquerres)
- Productor: `+573156789012` (Doña Rosa - Guaitarilla)
- Productor: `+573258901234` (Carmen Inés - Ipiales)
- Repartidor: `+573011112222` (Wilson)

### 2. Mobile

```bash
cd mobile
npm install
npm start
```

Se abre Expo DevTools. Escanea el QR con **Expo Go** en tu celular.

> ⚠️ **Importante:** si corres en un celular físico, el `localhost` del backend no es accesible. Cambia `API_URL` en `mobile/src/api/client.ts` por la IP LAN de tu máquina (ej. `http://192.168.0.15:4000`), o usa `EXPO_PUBLIC_API_URL` como variable de entorno.
>
> En emulador Android usa `10.0.2.2` en vez de `localhost`.

### 3. Probar la API sin la app

```bash
# Salud
curl http://localhost:4000/health

# Catálogo
curl "http://localhost:4000/api/products?limit=5"

# Auth OTP (dev)
curl -X POST http://localhost:4000/api/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+573001234567"}'

# Verify (usa el código del paso anterior, en dev es 123456)
curl -X POST http://localhost:4000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+573001234567","code":"123456"}'

# Con el token devuelto:
TOKEN=eyJ...
curl http://localhost:4000/api/users/me -H "Authorization: Bearer $TOKEN"
```

---

## 🗺️ Endpoints principales

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/auth/otp` | Envía código SMS | ❌ |
| POST | `/api/auth/verify` | Valida código y devuelve JWT | ❌ |
| GET | `/api/categories` | Lista categorías | ❌ |
| GET | `/api/products` | Catálogo con filtros (category, municipio, surplus, search, sort) | ❌ |
| GET | `/api/products/:id` | Detalle con reseñas | ❌ |
| POST | `/api/products` | Publicar cosecha | 👨‍🌾 PRODUCER |
| PATCH | `/api/products/:id` | Editar cosecha | 👨‍🌾 dueño |
| DELETE | `/api/products/:id` | Desactivar | 👨‍🌾 dueño |
| POST | `/api/uploads` | Subir foto (multipart, máx 5 MB) | ✅ |
| GET | `/api/cart` | Mi carrito | 🛍️ BUYER |
| POST | `/api/cart/items` | Agregar item | 🛍️ BUYER |
| PATCH | `/api/cart/items/:id` | Cambiar cantidad | 🛍️ BUYER |
| POST | `/api/orders` | Checkout | 🛍️ BUYER |
| GET | `/api/orders/mine` | Mis pedidos (según rol) | ✅ |
| GET | `/api/orders/:id` | Detalle del pedido | ✅ |
| PATCH | `/api/orders/:id/status` | Cambiar estado | ✅ |
| POST | `/api/orders/:id/reviews` | Calificar | ✅ |
| GET | `/api/users/me` | Mi perfil | ✅ |
| PATCH | `/api/users/me` | Editar perfil | ✅ |
| POST | `/api/users/me/push-token` | Registrar token Expo Push | ✅ |
| DELETE | `/api/users/me/push-token` | Desregistrar token (logout) | ✅ |
| GET | `/api/users/:id` | Perfil público | ❌ |

---

## 🗄️ Modelo de datos

Ver `backend/prisma/schema.prisma`. Entidades principales:

- **User** — rol: `BUYER` | `PRODUCER` | `COURIER`
- **Address** — con lat/lng para agrupación geográfica
- **Category** — iconos emoji
- **Product** — incluye `isSurplus`, `discountPct`, `harvestDate`
- **CartItem** — carrito persistente por usuario
- **Order** + **OrderItem** — con estados `PENDING → CONFIRMED → PREPARING → IN_TRANSIT → DELIVERED`
- **DeliveryRoute** — agrupa varios Orders por zona (fase 3)
- **Review** — calificación mutua productor ↔ comprador

---

## 🗓️ Roadmap

### ✅ Fase 1 (completada)
- [x] Backend scaffold (Express + TS + Prisma + SQLite)
- [x] Schema completo + seeds con datos reales de Nariño
- [x] Auth OTP simulado con JWT
- [x] CRUD productos + catálogo con filtros
- [x] Carrito persistente
- [x] Checkout básico + historial de pedidos
- [x] Reseñas mutuas
- [x] Mobile scaffold (Expo + Router + Zustand + TanStack Query)
- [x] Design system portado (tokens, Button, Pill, Chip, Card, TopBar, ProductCard, Banner)
- [x] Pantallas: onboarding, login OTP, home funcional, search, cart, orders, profile, producto/[id]

### ✅ Fase 2 — completa
- [x] **Checkout completo** — selector de dirección con bottom sheet, métodos de pago (Nequi/Daviplata/Efectivo), resumen con ahorro estimado, notas, CTA fijo, POST /orders → navegación a seguimiento
- [x] **Gestión de direcciones** — listar, seleccionar, crear nueva con GPS (expo-location + reverse geocode)
- [x] **Seguimiento funcional** — tarjeta de estado en tiempo real (refetch 15s), línea de tiempo de 4 pasos, tarjeta del repartidor con botón de llamada, resumen del pedido, dirección de entrega, CTA de calificación al entregar
- [x] **Calificación con estrellas interactivas** — tras la entrega, califica a cada productor y al repartidor con estrellas + comentario, y muestra el ahorro estimado del pedido
- [x] **Perfil productor: publicar cosecha** — formulario con categoría, precio, unidad, stock, modo excedente (descuento 10/20/30%) y georreferenciación de la finca (expo-location). Contador real de productos activos en el perfil
- [x] **Fotos reales de cosecha** — endpoint `POST /api/uploads` (multer, almacenamiento local servido en `/uploads`, máx. 5 MB, JPEG/PNG/WEBP), selector de cámara/galería con `expo-image-picker` en el formulario de publicación, y renderizado de la foto en catálogo y detalle del producto
- [x] **Notificaciones push** — modelo `PushToken` + endpoints `POST/DELETE /api/users/me/push-token`, envío con `expo-server-sdk` al cambiar el estado del pedido (fire-and-forget), y registro del token Expo en la app con `expo-notifications` al iniciar sesión
- [x] **Mapa real en seguimiento** — `react-native-maps` con marcador de la finca (origen), la dirección de entrega (destino) y polilínea de ruta, ajustando el encuadre automáticamente

### 🔬 Fase 3 — diferenciador técnico
- [ ] Migrar SQLite → PostgreSQL + PostGIS
- [x] Agrupación geográfica de pedidos (k-means o DBSCAN sobre lat/lng)
- [x] VRP simplificado (nearest neighbor + 2-opt) para rutas del repartidor — `backend/src/lib/routing.ts` + `POST /api/routes/optimize`
- [ ] Dashboard de "precio justo" — métricas comparativas vs. tiendas tradicionales
- [ ] Integración real con Nequi / Daviplata (o pasarela Wompi)

### 🌐 Fase 4 — deploy y validación
- [ ] Backend en Railway o Render (free tier)
- [ ] Mobile: build APK con EAS Build
- [ ] Piloto con 5-10 productores reales en un municipio
- [ ] Documentación de sustentación

---

## 💡 El caso de negocio (resumen ejecutivo)

**Problema:** en Nariño, ~180.000 pequeños productores venden a intermediarios que les pagan ~20% del precio final. Un bulto de papa criolla: productor recibe $60-80k, en plaza se vende a $180-250k.

**Solución:** app que conecta directo productor ↔ consumidor (o tienda pequeña) con agrupación de pedidos para hacer viable la logística rural.

**Modelo de negocio:**
1. Comisión plana 5-8% (vs. 25-40% de intermediarios)
2. Tarifa de ruta agrupada ($3-5k por pedido)
3. Suscripción premium para tiendas/restaurantes ($30-50k/mes)
4. Futuro: score crediticio para préstamos agrícolas

**Diferenciador técnico:** optimización de rutas (VRP) + agrupación geográfica de pedidos → esto no es solo CRUD, es algoritmo defendible ante jurado.

**Impacto social medible:** el productor pasa de recibir $X a $Y. KPI vendible a Apps.co, Innpulsa, SENA.

---

## 🛠️ Comandos útiles

### Backend
```bash
cd backend
npm run dev              # Servidor con hot-reload
npm run prisma:studio    # GUI de la base de datos
npm run db:seed          # Repoblar con datos demo
npm run db:reset         # Borrar y recrear DB + seed
```

### Mobile
```bash
cd mobile
npm start                # Expo DevTools
npm run android          # Abrir directo en emulador Android
npm run ios              # Abrir directo en simulador iOS (macOS)
npm run typecheck        # Verificar tipos TypeScript
```

---

## 📄 Licencia

Uso académico. Todos los derechos reservados al autor.

Hecho con ❤️ en Nariño, Colombia.
