// Genera las miniaturas de las plantillas (/public/templates/<id>.webp) a partir del render 3D real.
//
// Uso (con la app corriendo, por ejemplo `npm run build && npx next start -p 3123`):
//   npm i --no-save puppeteer-core
//   BROWSER="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" node scripts/template-thumbs.mjs http://localhost:3123
//
// Aplica cada plantilla desde la sección Plantilla, gira a Frente y recorta la camiseta. Sin WebGL por GPU
// usa SwiftShader (más lento, mismo resultado). Para rehacer una sola: node scripts/template-thumbs.mjs <url> <id>

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const [, , BASE = "http://localhost:3123", ONLY] = process.argv;
const BROWSER = process.env.BROWSER;
if (!BROWSER) throw new Error("Falta BROWSER: ruta a Chrome o Edge.");
const OUT = path.resolve("public/templates");
fs.mkdirSync(OUT, { recursive: true });

const W = 320, H = 400; // 4:5, el doble del tamaño de la tarjeta
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: BROWSER,
  headless: "new",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await page.waitForFunction(() => document.querySelector("canvas") && !document.body.innerText.includes("Cargando camiseta"), { timeout: 120000 });
// Sin nombre ni número de muestra y sin el aviso: solo la base de la plantilla.
await page.addStyleTag({ content: ".toast-slot,.scene-bottom{display:none!important}" });
await page.evaluate(() => [...document.querySelectorAll(".tab-top")].find((b) => b.textContent.trim() === "Nombre")?.click());
await sleep(800);
for (const label of ["Nombre en la espalda", "Número en la espalda"]) {
  await page.evaluate((l) => {
    const sw = document.querySelector(`[role=switch][aria-label="${l}"]`);
    if (sw?.getAttribute("aria-checked") === "true") sw.click();
  }, label);
}
await page.evaluate(() => [...document.querySelectorAll(".tab-top")].find((b) => b.textContent.trim() === "Plantilla")?.click());
await sleep(800);

const cards = await page.evaluate(() => [...document.querySelectorAll(".template-card")].map((c, i) => ({ i, id: c.dataset.template ?? "" })));
for (const { i, id } of cards) {
  if (!id || (ONLY && id !== ONLY)) continue;
  await page.evaluate((k) => document.querySelectorAll(".template-card")[k]?.click(), i);
  await page.evaluate(() => [...document.querySelectorAll(".tool-btn")].find((b) => b.textContent.trim() === "Frente")?.click());
  await sleep(2200); // teñido + cámara
  const scene = await page.$eval(".editor-scene", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  // Encuadre fijo de la camiseta en la vista Frente (escritorio 1440 × 900).
  const cw = 544, ch = 680;
  const clip = { x: scene.x + scene.w / 2 - cw / 2, y: 195, width: cw, height: ch };
  const png = await page.screenshot({ clip, encoding: "base64" });
  const webp = await page.evaluate(
    async (b64, w, h) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL("image/webp", 0.86).split(",")[1];
    },
    png,
    W,
    H,
  );
  fs.writeFileSync(path.join(OUT, `${id}.webp`), Buffer.from(webp, "base64"));
  console.log(`${id}: ${Math.round(Buffer.from(webp, "base64").length / 1024)} KB`);
}
await browser.close();
