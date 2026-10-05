# 🛒 MercaJusto

**Del campo directo a tu mesa.** Plataforma móvil que conecta productores campesinos de Nariño con compradores urbanos, eliminando intermediarios.

> Proyecto de grado — Ingeniería de Sistemas · Universidad de Nariño

---

## 📁 Estructura del monorepo

```
MercaJusto/
├── css/global.css            # Design tokens
├── backend/                  # API REST — Node + Express + TypeScript + Prisma
│   ├── prisma/schema.prisma  # Modelo de datos (SQLite por ahora)
│   ├── prisma/seed.ts        # Datos demo reales de Nariño
│   ├── src/                  # Endpoints, middleware, servicios
│   └── docker-compose.yml    # Postgres+PostGIS opcional (fase 3)
├── mobile/                   # App móvil — React Native + Expo + TypeScript
│   ├── app/                  # Expo Router (file-based navigation)
│   ├── src/theme/            # Tokens portados del global.css
│   ├── src/components/       # Button, Pill, Chip, ProductCard, TopBar...
│   ├── src/store/            # Zustand (auth, cart)
│   └── src/api/              # Cliente axios + tipos
└── docs/                     # (pendiente) diagramas, acta de sustentación
```

```

### Mobile
```bash
cd mobile
npm run web              # Abrir la app en el navegador
npm start                # Expo DevTools
npm run android          # Abrir directo en emulador Android
npm run ios              # Abrir directo en simulador iOS (macOS)
npm run typecheck        # Verificar tipos TypeScript
```

Inicia primero el backend en otra terminal. La app web usa `http://localhost:4000`; Android Emulator y dispositivos físicos seleccionan su host local automáticamente. Puedes definir `EXPO_PUBLIC_API_URL` para sobrescribirlo.

---
### Backend
```bash
cd backend
npm run dev              # Servidor con hot-reload
npm run prisma:studio    # GUI de la base de datos
npm run db:seed          # Repoblar con datos demo
npm run db:reset         # Borrar y recrear DB + seed
```

## 📄 Licencia

Uso académico. Todos los derechos reservados al autor.

Hecho con ❤️ en Nariño, Colombia.
