# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

La app es Expo / React Native (SDK 57) y también se publica en web (https://mercajusto.vercel.app), pero el diseño se decide pensando primero en celulares Android usados con Expo Go. La web es respaldo para la demo; iOS funciona pero no es prioridad.

## Users

- **Comprador urbano (prioridad de diseño).** Personas en Pasto y otros municipios de Nariño que compran mercado fresco desde el celular: exploran cosechas, aprovechan excedentes con descuento, pagan y siguen el pedido hasta su puerta. Cuando hay que priorizar, se diseña para este usuario.
- **Productor campesino.** Agricultores de veredas de Nariño que publican su cosecha (foto, precio, cantidad, modo excedente), atienden sus ventas y avanzan el estado de los pedidos.
- **Repartidor.** Recibe entregas asignadas automáticamente y las marca como entregadas.

## Product Purpose

MercaJusto conecta directamente a productores campesinos de Nariño con compradores urbanos, sin intermediarios. El comprador paga un precio justo y menor que en la plaza de mercado; el productor recibe más por su cosecha y vende lo que le sobra en vez de perderlo. Éxito: que el comprador complete una compra con confianza y vea cuánto ahorró, y que el productor publique y venda sin ayuda.

Es el proyecto de grado de Ingeniería de Sistemas (Universidad de Nariño): además de funcionar, debe demostrar ante un jurado su impacto social y su calidad técnica.

## Positioning

Compra directa al campesino que cultiva la comida, con nombre, municipio y calificación del productor visibles; "modo excedente" que convierte la sobreproducción en descuentos en lugar de desperdicio; comparación explícita contra el precio de plaza de mercado para mostrar el ahorro; reparto agrupado con rutas optimizadas (motor VRP propio).

## Operating Context

- Flujo del comprador: catálogo y búsqueda → detalle del producto y del productor → canasta → checkout (Nequi, Daviplata o efectivo) → seguimiento en tiempo real (actualiza cada 15 s) → calificación del productor y del repartidor.
- Flujo del productor: publicar cosecha con foto, precio de plaza y modo excedente → Ventas: Empezar a preparar → Despachar (asigna repartidor) → Entregado.
- Acceso por número de celular colombiano (+57) con código OTP por SMS (en demo el código es 123456).
- Geografía real: municipios y veredas de Nariño (Pasto, Túquerres, Guaitarilla, Buesaco, La Vega…), con GPS y coordenadas de respaldo por municipio.
- Demostración en vivo ante jurado con cuentas demo (María compradora, José Tulio productor, Wilson repartidor), contra el backend desplegado en Render.

## Capabilities and Constraints

- Roles: BUYER, PRODUCER, COURIER; la navegación cambia por rol (la canasta solo existe para compradores; la pestaña de pedidos se llama Pedidos, Ventas o Entregas).
- Reglas de negocio: comisión de plataforma 5 % del subtotal, envío agrupado $3.500 COP, descuento de excedente aplicado igual en app y backend, stock descontado en una sola transacción, el comprador solo cancela antes de "Preparando", solo el comprador califica (una vez por persona y pedido).
- Moneda COP sin decimales; idioma español de Colombia.
- **Señal débil:** los productores están en veredas con internet lento o intermitente; las pantallas deben tolerar cargas lentas, mostrar estados claros y no perder lo que el usuario escribió.
- **Celulares de gama baja:** pantallas pequeñas y poco rendimiento; animaciones y peso de recursos medidos.
- **Backend en Render gratuito:** se duerme tras 15 min y tarda ~50 s en despertar; los datos demo se recargan en cada reinicio.
- Push notifications con Expo; en web no hay push.

## Brand Commitments

- Nombre: **MercaJusto**. Lema en uso: "Del campo directo a tu mesa" / "Del campo nariñense a tu mesa".
- Marca: canasta con verduras (`mobile/src/components/Logo.tsx`, `mobile/assets/icon.png`, `mobile/assets/splash-icon.png`).
- Voz: cercana, en español colombiano, tuteo; nombra a los productores por su nombre y su municipio.

## Evidence on Hand

- Datos demo reales de Nariño en `backend/prisma/seed.ts` (productores, productos, precios de plaza, pedidos de ejemplo).
- Métricas reales calculadas por la app: ahorro del comprador frente a la plaza, ingresos del productor.
- No hay fotos reales de productos ni de productores (se usan íconos por categoría), ni testimonios, ni cifras de usuarios reales: no inventarlos.

## Product Principles

1. **El productor tiene nombre.** Cada producto muestra quién lo cultivó y dónde; la confianza nace de esa cercanía.
2. **El ahorro se ve.** El precio justo se demuestra comparándolo con la plaza de mercado, no se afirma.
3. **Simple para cualquiera.** Textos cortos, íconos claros, objetivos táctiles grandes y pocas decisiones por pantalla, pensando en baja alfabetización digital.
4. **Funciona con mala señal y en celulares modestos.** Estados de carga y error claros, nada se pierde, nada pesa de más.
5. **Lista para demostrar.** Cada flujo debe poder mostrarse en vivo de principio a fin sin explicaciones adicionales.

## Accessibility & Inclusion

- Usuarios con baja alfabetización digital: lenguaje llano, íconos acompañados de texto, acciones principales evidentes.
- Objetivos táctiles amplios y texto legible en pantallas pequeñas; respetar el tamaño de fuente del sistema y la preferencia de movimiento reducido.
- Contraste suficiente para uso en exteriores (campo, plaza).
