# 🛒 MercaJusto

**Del campo directo a tu mesa.** Plataforma móvil que conecta productores campesinos de Nariño con compradores urbanos, eliminando intermediarios.

> Proyecto de grado — Ingeniería de Sistemas · Universidad de Nariño

---

## 📁 Estructura del monorepo

```
MercaJusto/
├── css/global.css            # Design tokens
├── backend/                  # API REST — Node + Express + TypeScript + Prisma
│   ├── prisma/schema.prisma  # Modelo de datos (SQLite)
│   ├── prisma/seed.ts        # Datos demo reales de Nariño
│   ├── src/routes/           # Endpoints (auth, productos, carrito, pedidos, rutas, métricas)
│   ├── src/lib/              # JWT, OTP, push, precios, motor de rutas (VRP)
│   └── docker-compose.yml    # Postgres+PostGIS opcional
└── mobile/                   # App móvil — React Native + Expo + TypeScript
    ├── app/                  # Pantallas (Expo Router, navegación por archivos)
    ├── src/components/       # Button, Pill, ProductCard, TopBar, Toast...
    ├── src/store/            # Zustand (auth, carrito, tema, avisos)
    ├── src/lib/              # Precios, diálogos, estados de pedido, notificaciones
    └── src/api/              # Cliente axios + tipos
```

---

## 🚀 Puesta en marcha

Requisitos: Node 18+ y, para probar en el celular, la app **Expo Go** (SDK 51).

### 1. Backend + base de datos

```bash
cd backend
npm install
cp .env.example .env     # solo la primera vez
npm run setup            # aplica migraciones, genera Prisma y carga datos demo
npm run dev              # API en http://localhost:4000
```

Al arrancar, la consola muestra la URL de la red local (por ejemplo `http://192.168.0.36:4000/api`). Esa es la que usa un celular físico.

Otros comandos:

```bash
npm run db:seed          # Repoblar con datos demo (borra lo existente)
npm run db:reset         # Borrar y recrear la base + seed
npm run prisma:studio    # Ver la base de datos en el navegador
npm run test:routing     # Prueba del motor de rutas (k-means + 2-opt)
```

### 2. App móvil

```bash
cd mobile
npm install
npm start                # Escanea el QR con Expo Go (mismo Wi-Fi que el PC)
npm run web              # Abrir la app en el navegador
npm run android          # Emulador Android
npm run typecheck        # Verificar tipos TypeScript
```

La app detecta sola la IP del PC en Expo Go y usa `10.0.2.2` en el emulador Android. Si algo no conecta, define la URL explícitamente:

```bash
# mobile/.env
EXPO_PUBLIC_API_URL=http://192.168.0.36:4000
```

> En Windows, si el celular no llega al backend, permite Node.js en el Firewall (red privada).

---

## 👤 Cuentas demo

El modo OTP de desarrollo está activo: el código siempre es **123456** (la app lo muestra en pantalla).

| Rol        | Celular (sin +57) | Nombre              |
|------------|-------------------|---------------------|
| Comprador  | 300 123 4567      | María Rodríguez     |
| Productor  | 310 456 7890      | José Tulio Enríquez |
| Repartidor | 301 111 2222      | Wilson López        |

Cualquier otro número crea una cuenta nueva (comprador o productor).

## 🎬 Guion de demostración

1. **Comprador (María):** explora el catálogo, filtra excedentes y entra a un producto. Agrega a la canasta: los excedentes ya cobran con descuento. Paga en el checkout (Nequi, Daviplata o efectivo) y ve el seguimiento.
2. **Productor (Don José):** en **Ventas** ve el pedido nuevo y lo avanza: *Empezar a preparar → Despachar → Marcar como entregado*. Al despachar se asigna un repartidor automáticamente.
3. **Comprador:** el seguimiento se actualiza solo (cada 15 s). Al entregarse, califica al productor y al repartidor. En **Perfil** ve su ahorro frente a plaza de mercado.
4. **Productor:** publica una cosecha nueva con foto, precio de plaza y modo excedente. En **Perfil** ve sus ingresos y sus publicaciones.

---

## 🔐 Reglas de negocio principales

- Comisión de la plataforma: 5 % del subtotal. Envío agrupado: $3.500.
- Excedentes: el descuento se aplica igual en la app y en el backend.
- Un pedido descuenta el stock en una sola transacción (no se sobrevende). Al cancelarlo, el stock se devuelve.
- Solo el comprador, los productores del pedido y el repartidor pueden ver un pedido.
  - El productor y el repartidor avanzan el estado.
  - El comprador solo puede cancelar antes de que se empiece a preparar.
- Solo el comprador califica, una vez por persona y por pedido.

## 📄 Licencia

Uso académico. Todos los derechos reservados al autor.

Hecho con ❤️ en Nariño, Colombia.
