---
version: 1
slug: "mobile"
primary_target: "mobile"
related_targets: []
---

# Surface brief: MercaJusto mobile app

Scope: all screens of the Expo app in `mobile/` (buyer, producer, courier). Visitor mode: **Operate**.
Audience/job: urban buyer in Pasto completing a purchase with confidence; campesino producer publishing and selling. Constraints: outdoor daylight use, low-end Android phones, low digital literacy, weak signal. Material 3 controls and navigation stay standard.
Build path: code-led (Operate surface, no image generation).

2026-10-17: the user asked for the buyer flow "igual que Rappi", keeping MercaJusto green (chosen over a coral palette). Buyer flow = Inicio, Buscar, producto, productor, Canasta, Checkout, tab bar. Producer/courier/auth/seguimiento keep the previous treatment.

## Direction contract

THESIS: The buyer flow plays the delivery-super-app canon (Rappi) straight: address on top, big search, category circles, swipeable promo banners, "tiendas" rails, price-first product cards whose "+" turns into an inline stepper, and a floating "Ver canasta" bar. It refuses the earlier quiet catalog layout; the product truth (named producers, plaza comparison, excedente) rides inside the canon.

OWN-WORLD: Pure white ground, soft grey #F4F5F3 wells, MercaJusto field green #1F6B3D as the single action colour (solid circular "+", stepper, cart bar, active tab); clay only where a price opportunity is the subject (discount tags, the Excedentes circle and the excedentes promo banner, which is about discounts); category circles keep their field colours (the colcha survives as the category row). Bold system type, price heavier than name, 16-20px radii, flat cards, shadow only on floating bar and buttons over images.

STORY: The buyer recognises the app pattern instantly, adds produce in one tap without leaving the list, sees who grew it and the plaza savings, and checks out from the floating bar.

FIRST VIEWPORT: Address row (pin, "Entregar en", municipio ▾, avatar) → full-width rounded search → horizontal row of 64px category circles with labels (Excedentes first in clay) → paged promo banner (88% width, dots). Below: "Productores cerca" rail, "Excedentes de hoy" rail, then the grid. Floating green "Ver canasta · N · $total" bar above the tab bar when the cart has items.

FORM: Canon (category standard) pinned by the user, Rappi as the craft bar; concept-seed not run because a user-pinned direction beats the roll. Seed key: user-pinned-canon-rappi. Signature interaction: card "+" expands into a green pill stepper in place, with the cart bar sliding up on first add.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
