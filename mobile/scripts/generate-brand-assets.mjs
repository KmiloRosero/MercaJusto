// Genera los PNG de la marca (ícono, ícono adaptativo, favicon y splash nativo)
// desde la misma geometría que src/components/Logo.tsx, para que el splash
// nativo y el splash animado coincidan en el primer fotograma.
//
// Uso (necesita Chrome y puppeteer-core, que no es dependencia de la app):
//   npx -p puppeteer-core@23 node scripts/generate-brand-assets.mjs
//   CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" si Chrome está en otra ruta.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// puppeteer-core se trae con npx solo para este script; no es dependencia de la app.
// eslint-disable-next-line import/no-unresolved
import puppeteer from "puppeteer-core";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const BRAND = { field: "#1F6B3D", basket: "#FFFFFF", leaf: "#8FD3A1", leafVein: "#4E9E6A", fruit: "#A8501C" };

const leaf = `
  <path d="M56 46 C46 32 54 15 75 10 C78 26 72 40 56 46 Z" fill="${BRAND.leaf}"/>
  <path d="M57.5 43 C62 33 67 23 73 14" stroke="${BRAND.leafVein}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
const fruit = `
  <circle cx="38" cy="40" r="13" fill="${BRAND.fruit}"/>
  <circle cx="33.5" cy="34.5" r="3.4" fill="#FFFFFF" opacity="0.32"/>
  <path d="M38 27.5 C36 24 38.5 22 41 23.5" stroke="${BRAND.leafVein}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
const basket = `
  <path d="M22 48 C22 24 78 24 78 48" stroke="${BRAND.basket}" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M14.6 54 H85.4 L79 84 Q78 88.5 73.5 88.5 H26.5 Q22 88.5 21 84 Z" fill="${BRAND.basket}"/>
  <rect x="8" y="45" width="84" height="11" rx="5.5" fill="${BRAND.basket}"/>
  <line x1="36" y1="62" x2="37.6" y2="82" stroke="${BRAND.field}" stroke-width="4" stroke-linecap="round"/>
  <line x1="50" y1="62" x2="50" y2="82" stroke="${BRAND.field}" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="62" x2="62.4" y2="82" stroke="${BRAND.field}" stroke-width="4" stroke-linecap="round"/>`;

/** Una imagen cuadrada: fondo (o transparente) y la marca escalada al `share` del lado. */
function svg({ size, background, share, parts }) {
  const mark = size * share;
  const offset = (size - mark) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <g transform="translate(${offset} ${offset}) scale(${mark / 100})">${parts}</g>
  </svg>`;
}

const outputs = [
  // Ícono de la app: marca al 64 % sobre verde campo.
  { file: "icon.png", size: 1024, background: BRAND.field, share: 0.64, parts: leaf + fruit + basket },
  // Android recorta el ícono adaptativo en círculo: la marca cabe en la zona segura (66 %).
  { file: "adaptive-icon.png", size: 1024, background: null, share: 0.56, parts: leaf + fruit + basket },
  { file: "favicon.png", size: 48, background: BRAND.field, share: 0.8, parts: leaf + fruit + basket },
  // Splash nativo: solo la canasta vacía; el splash animado la llena.
  { file: "splash-icon.png", size: 520, background: null, share: 1, parts: basket },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
for (const o of outputs) {
  await page.setViewport({ width: o.size, height: o.size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(o)}</body></html>`);
  const png = await page.screenshot({ omitBackground: !o.background, clip: { x: 0, y: 0, width: o.size, height: o.size } });
  await writeFile(join(ASSETS, o.file), png);
  console.log("escrito", o.file);
}
await browser.close();
