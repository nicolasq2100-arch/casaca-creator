// Catálogo de gráficos. Todos originales: ninguno copia ni nombra el diseño de un club.
// Sumar un gráfico = sumar una entrada acá (el editor y la galería lo toman solos).
//
// Todos dibujan en cm del anillo (ver PatternRing en garment.config): x da la vuelta y es periódica,
// así que lo que cruza una costura sigue en la pieza de al lado.

import type { PatternDef, PatternDrawContext } from "./types";
import { cylinderFbm, seededRandom } from "./noise";

const DEG = Math.PI / 180;

// ---------- utilidades ----------

/**
 * Ajusta el período de una familia de rayas para que la vuelta entera tenga un número entero de rayas:
 * así empalman en TODAS las costuras (no solo en una).
 */
function seamlessPeriod(circ: number, normalAngle: number, wanted: number) {
  const span = Math.abs(circ * Math.cos(normalAngle));
  if (span < 1e-3) return wanted; // rayas horizontales: no dependen de x
  const n = Math.max(1, Math.round(span / wanted));
  return span / n;
}

/**
 * Rayas periódicas perpendiculares a `normalAngle` (rad). `bands` son tramos [desde, hasta) dentro del
 * período, con su color. Se dibujan rotando el ctx (s = x·cos + y·sin).
 */
function stripes(d: PatternDrawContext, normalAngle: number, period: number, phase: number, bands: { from: number; to: number; color: string }[]) {
  const { ctx, x0, x1, y0, y1 } = d;
  const c = Math.cos(normalAngle), s = Math.sin(normalAngle);
  const corners = [
    [x0, y0], [x1, y0], [x0, y1], [x1, y1],
  ] as const;
  let sMin = Infinity, sMax = -Infinity, tMin = Infinity, tMax = -Infinity;
  for (const [x, y] of corners) {
    const sv = x * c + y * s, tv = -x * s + y * c;
    sMin = Math.min(sMin, sv); sMax = Math.max(sMax, sv);
    tMin = Math.min(tMin, tv); tMax = Math.max(tMax, tv);
  }
  ctx.save();
  ctx.rotate(normalAngle);
  for (let k = Math.floor((sMin - phase) / period) - 1; k <= Math.ceil((sMax - phase) / period) + 1; k++) {
    const base = phase + k * period;
    for (const b of bands) {
      ctx.fillStyle = b.color;
      ctx.fillRect(base + b.from, tMin - 1, b.to - b.from, tMax - tMin + 2);
    }
  }
  ctx.restore();
}

/** Copias de un dibujo desplazadas una vuelta a cada lado, para cubrir el rango x de la pieza. */
function forEachWrap(d: PatternDrawContext, fn: (shift: number) => void) {
  const C = d.ring.circumferenceCm;
  for (let k = Math.floor(d.x0 / C) - 1; k <= Math.ceil(d.x1 / C) + 1; k++) fn(k * C);
}

/** Distancia "doblada" a lo largo de la vuelta (0 en x = 0, máxima en x = C/2): espejo sin cortes. */
const folded = (x: number, C: number) => {
  const m = ((x % C) + C) % C;
  return m <= C / 2 ? m : C - m;
};

/** Tramos de la pieza donde `folded` es lineal (cortes en múltiplos de C/2). */
function foldedSegments(d: PatternDrawContext) {
  const C = d.ring.circumferenceCm, half = C / 2;
  const segs: { a: number; b: number; rising: boolean }[] = [];
  let a = d.x0;
  while (a < d.x1) {
    const k = Math.floor(a / half);
    const b = Math.min(d.x1, (k + 1) * half);
    segs.push({ a, b, rising: ((k % 2) + 2) % 2 === 0 });
    a = b;
  }
  return segs;
}

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Extremos del anillo en y, para que los degradés arranquen en el borde real de la prenda. */
const ringYRange = (d: PatternDrawContext): [number, number] => [d.ringYMin, d.ringYMax];

/**
 * Degradé lineal con inclinación en espejo: s = y·cos a + folded(x)·sin a. Se dibuja por tramos lineales,
 * así frente y espalda se reflejan y empalman en las dos costuras.
 */
function tiltedGradient(d: PatternDrawContext, length: number, stops: [number, string][]) {
  const { ctx, y0, y1, ring } = d;
  const a = d.params.angleDeg * DEG;
  const ca = Math.cos(a), sa = Math.sin(a);
  const [ry0, ry1] = ringYRange(d);
  const half = ring.circumferenceCm / 2;
  // s mínimo en el anillo: desde donde arranca el degradé.
  const sStart = Math.min(ry0 * ca, ry1 * ca) + Math.min(0, half * sa);
  for (const seg of foldedSegments(d)) {
    // Dentro del tramo: folded(x) = ±x + k  →  s = y·ca ± x·sa + cte.
    const fa = folded(seg.a + 1e-6, ring.circumferenceCm);
    const dir = seg.rising ? 1 : -1;
    // Punto de s = sStart y dirección del gradiente en (x, y).
    const gx = dir * sa, gy = ca;
    const norm = Math.hypot(gx, gy) || 1;
    // Origen: un punto del tramo con s = sStart.
    const sAtA = y0 * ca + fa * sa;
    const ox = seg.a + ((sStart - sAtA) * gx) / (norm * norm);
    const oy = y0 + ((sStart - sAtA) * gy) / (norm * norm);
    const grad = ctx.createLinearGradient(ox, oy, ox + (gx / norm) * length, oy + (gy / norm) * length);
    for (const [t, c] of stops) grad.addColorStop(t, c);
    ctx.fillStyle = grad;
    ctx.fillRect(seg.a, y0, seg.b - seg.a, y1 - y0);
  }
}

// Campos de ruido cacheados por pieza (lo caro es el ruido; recolorear es barato).
const fieldCache = new Map<string, { w: number; h: number; data: Float32Array }>();
function noiseField(d: PatternDrawContext, res: number, feature: number, seed: number, octaves: number) {
  const key = [d.ring.id, d.x0.toFixed(2), d.x1.toFixed(2), d.y0.toFixed(2), d.y1.toFixed(2), res, feature, seed, octaves].join("|");
  const hit = fieldCache.get(key);
  if (hit) return hit;
  const w = Math.max(2, Math.ceil((d.x1 - d.x0) * res));
  const h = Math.max(2, Math.ceil((d.y1 - d.y0) * res));
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const y = d.y1 - (j + 0.5) / res; // fila 0 = arriba
    for (let i = 0; i < w; i++) {
      data[j * w + i] = cylinderFbm(d.x0 + (i + 0.5) / res, y, d.ring.circumferenceCm, feature, seed, octaves);
    }
  }
  const out = { w, h, data };
  if (fieldCache.size > 48) fieldCache.clear();
  fieldCache.set(key, out);
  return out;
}

/** Pinta una imagen de campo (fila 0 = arriba) sobre el rango de la pieza, en el ctx en cm (y hacia arriba). */
function blitField(d: PatternDrawContext, w: number, h: number, paint: (img: ImageData) => void) {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  if (!octx) return;
  const img = octx.createImageData(w, h);
  paint(img);
  octx.putImageData(img, 0, 0);
  d.ctx.save();
  d.ctx.imageSmoothingEnabled = true;
  d.ctx.scale(1, -1);
  d.ctx.drawImage(off, d.x0, -d.y1, d.x1 - d.x0, d.y1 - d.y0);
  d.ctx.restore();
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------- catálogo ----------

const BODY = ["front", "back"];

export const patterns: PatternDef[] = [
  {
    id: "bastones",
    name: "Bastones",
    category: "rayas",
    channels: [
      { label: "Bastón", defaultHex: "#63C6B5" },
      { label: "Filete", defaultHex: "#55585B" },
    ],
    scale: { label: "Ancho", min: 2, max: 16, step: 0.5, default: 7 },
    defaultZones: BODY,
    draw: (d) => {
      const w = d.params.scaleCm;
      const f = Math.max(0.5, w * 0.08);
      const P = seamlessPeriod(d.ring.circumferenceCm, 0, w * 2);
      stripes(d, 0, P, 0, [
        { from: 0, to: w, color: d.params.channels[0]! },
        { from: w, to: w + f, color: d.params.channels[1]! },
        { from: -f, to: 0, color: d.params.channels[1]! },
      ]);
    },
  },
  {
    id: "franjas",
    name: "Franjas",
    category: "rayas",
    channels: [
      { label: "Franja", defaultHex: "#B5502E" },
      { label: "Filete", defaultHex: "#D8C29D" },
    ],
    scale: { label: "Alto", min: 2, max: 16, step: 0.5, default: 6 },
    defaultZones: BODY,
    draw: (d) => {
      const w = d.params.scaleCm;
      const f = Math.max(0.5, w * 0.08);
      stripes(d, 90 * DEG, w * 2, 0, [
        { from: 0, to: w, color: d.params.channels[0]! },
        { from: w, to: w + f, color: d.params.channels[1]! },
      ]);
    },
  },
  {
    id: "diagonales",
    name: "Diagonales",
    category: "rayas",
    channels: [
      { label: "Diagonal", defaultHex: "#2B2B2B" },
      { label: "Línea fina", defaultHex: "#F26B1D" },
    ],
    scale: { label: "Ancho", min: 1.5, max: 12, step: 0.5, default: 4 },
    angle: { min: 15, max: 165, default: 40 },
    defaultZones: BODY,
    draw: (d) => {
      const w = d.params.scaleCm;
      const normal = (d.params.angleDeg + 90) * DEG;
      const P = seamlessPeriod(d.ring.circumferenceCm, normal, w * 2.6);
      const f = Math.max(0.4, w * 0.12);
      const mid = w + (P - w) / 2;
      stripes(d, normal, P, 0, [
        { from: 0, to: w, color: d.params.channels[0]! },
        { from: mid - f / 2, to: mid + f / 2, color: d.params.channels[1]! },
      ]);
    },
  },
  {
    id: "faja",
    name: "Faja",
    category: "rayas",
    channels: [
      { label: "Faja", defaultHex: "#2850A0" },
      { label: "Borde", defaultHex: "#F3E3B5" },
    ],
    scale: { label: "Ancho", min: 5, max: 24, step: 0.5, default: 13 },
    angle: { min: 20, max: 70, default: 35 },
    defaultZones: BODY,
    draw: (d) => {
      // Una sola faja por vuelta: hélice con período = la vuelta, así cruza las costuras sin saltos.
      const w = d.params.scaleCm;
      const normal = (d.params.angleDeg + 90) * DEG;
      const P = seamlessPeriod(d.ring.circumferenceCm, normal, Infinity);
      const center = (d.ring.circumferenceCm / 4) * Math.cos(normal) + d.ring.bandCenterCm * 0.85 * Math.sin(normal);
      const f = Math.max(0.6, w * 0.07);
      stripes(d, normal, P, center - w / 2, [
        { from: -f, to: 0, color: d.params.channels[1]! },
        { from: 0, to: w, color: d.params.channels[0]! },
        { from: w, to: w + f, color: d.params.channels[1]! },
      ]);
    },
  },
  {
    id: "panel-lateral",
    name: "Panel lateral",
    category: "paneles",
    channels: [
      { label: "Panel", defaultHex: "#14213D" },
      { label: "Vivo", defaultHex: "#D7261E" },
    ],
    scale: { label: "Ancho", min: 4, max: 18, step: 0.5, default: 9 },
    defaultZones: [...BODY, "hem"],
    thumb: { x0: 30, y0: -2.5, span: 44 },
    draw: (d) => {
      // Franja centrada en cada costura del costado, desde el bajo hasta la axila.
      const w = d.params.scaleCm;
      const v = Math.max(0.5, w * 0.06);
      const top = Math.min(d.y1, d.ring.panelTopCm);
      if (top <= d.y0) return;
      const { ctx } = d;
      forEachWrap(d, (shift) => {
        for (const seam of d.ring.seamsCm) {
          const xs = seam + shift;
          ctx.fillStyle = d.params.channels[0]!;
          ctx.fillRect(xs - w / 2, d.y0, w, top - d.y0);
          ctx.fillStyle = d.params.channels[1]!;
          ctx.fillRect(xs - w / 2 - v, d.y0, v, top - d.y0);
          ctx.fillRect(xs + w / 2, d.y0, v, top - d.y0);
        }
      });
    },
  },
  {
    id: "banda-pectoral",
    name: "Banda pectoral",
    category: "paneles",
    channels: [
      { label: "Banda", defaultHex: "#A87D1E" },
      { label: "Filetes", defaultHex: "#2B2B2B" },
    ],
    scale: { label: "Alto", min: 4, max: 22, step: 0.5, default: 11 },
    defaultZones: BODY,
    draw: (d) => {
      const h = d.params.scaleCm;
      const f = Math.max(0.5, h * 0.07);
      const cy = d.ring.bandCenterCm;
      const { ctx } = d;
      ctx.fillStyle = d.params.channels[0]!;
      ctx.fillRect(d.x0, cy - h / 2, d.x1 - d.x0, h);
      ctx.fillStyle = d.params.channels[1]!;
      ctx.fillRect(d.x0, cy + h / 2, d.x1 - d.x0, f);
      ctx.fillRect(d.x0, cy - h / 2 - f, d.x1 - d.x0, f);
    },
  },
  {
    id: "camuflado",
    name: "Camuflado",
    category: "texturas",
    channels: [
      { label: "Mancha clara", defaultHex: "#A89262" },
      { label: "Mancha media", defaultHex: "#6B6B2F" },
      { label: "Mancha oscura", defaultHex: "#0B4D2C" },
    ],
    scale: { label: "Tamaño", min: 4, max: 30, step: 1, default: 12 },
    variants: 9,
    defaultZones: [...BODY, "sleeves"],
    draw: (d) => {
      const field = noiseField(d, 5, d.params.scaleCm, 1000 + d.params.variant * 17, 3);
      const cols = d.params.channels.map(hexRgb);
      const levels = [0.46, 0.55, 0.63];
      blitField(d, field.w, field.h, (img) => {
        for (let k = 0; k < field.data.length; k++) {
          const n = field.data[k]!;
          let layer = -1;
          for (let l = levels.length - 1; l >= 0; l--) if (n > levels[l]!) { layer = l; break; }
          if (layer < 0) continue;
          const a = smooth(levels[layer]!, levels[layer]! + 0.012, n);
          const c = cols[layer]!;
          img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2];
          img.data[k * 4 + 3] = Math.round(255 * (layer > 0 ? 1 : a));
        }
      });
    },
  },
  {
    id: "topografico",
    name: "Topográfico",
    category: "texturas",
    channels: [
      { label: "Curva maestra", defaultHex: "#55585B" },
      { label: "Curva fina", defaultHex: "#C9C9C6" },
    ],
    scale: { label: "Separación", min: 1, max: 6, step: 0.25, default: 2.25 },
    variants: 9,
    defaultZones: [...BODY, "sleeves"],
    draw: (d) => {
      const res = 7;
      const field = noiseField(d, res, 26, 2000 + d.params.variant * 31, 2);
      // Curvas por unidad de ruido: el fBm varía ~0,22 por cada 10 cm, así la separación queda cerca de la elegida.
      const K = 120 / d.params.scaleCm;
      const maj = hexRgb(d.params.channels[0]!);
      const min = hexRgb(d.params.channels[1]!);
      const { w, h, data } = field;
      blitField(d, w, h, (img) => {
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const k = j * w + i;
            const v = data[k]! * K;
            // Pendiente local para que el grosor de la línea sea parejo (en cm).
            const gx = (data[j * w + Math.min(w - 1, i + 1)]! - data[j * w + Math.max(0, i - 1)]!) * K * res * 0.5;
            const gy = (data[Math.min(h - 1, j + 1) * w + i]! - data[Math.max(0, j - 1) * w + i]!) * K * res * 0.5;
            const grad = Math.hypot(gx, gy) || 1e-6;
            const nearest = Math.round(v);
            const distCm = Math.abs(v - nearest) / grad;
            const major = nearest % 5 === 0;
            const half = major ? 0.3 : 0.17;
            const a = 1 - smooth(half * 0.6, half, distCm);
            if (a <= 0) continue;
            const c = major ? maj : min;
            img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2];
            img.data[k * 4 + 3] = Math.round(255 * a);
          }
        }
      });
    },
  },
  {
    id: "glitch",
    name: "Glitch",
    category: "texturas",
    channels: [
      { label: "Barra 1", defaultHex: "#1BA6B6" },
      { label: "Barra 2", defaultHex: "#E8538F" },
      { label: "Barra 3", defaultHex: "#0D1526" },
    ],
    scale: { label: "Alto de barra", min: 1, max: 8, step: 0.25, default: 3 },
    variants: 9,
    defaultZones: BODY,
    draw: (d) => {
      // Filas de barras cortadas, sembradas por anillo: mismas filas en todas las piezas del anillo.
      const C = d.ring.circumferenceCm;
      const rand = seededRandom(3000 + d.params.variant * 7919 + Math.round(C * 10));
      const { ctx } = d;
      let y = -6;
      while (y < 90) {
        const rowH = d.params.scaleCm * (0.35 + rand() * 0.9);
        const count = 2 + Math.floor(rand() * 4);
        for (let b = 0; b < count; b++) {
          const len = d.params.scaleCm * (2 + rand() * 9);
          const x = rand() * C;
          const color = d.params.channels[Math.floor(rand() * d.params.channels.length)]!;
          const inset = rand() < 0.35 ? rowH * 0.5 : 0;
          if (y + rowH < d.y0 || y > d.y1) continue;
          ctx.fillStyle = color;
          forEachWrap(d, (shift) => ctx.fillRect(x + shift, y + inset, len, rowH - inset));
        }
        y += rowH + d.params.scaleCm * rand() * 1.4;
      }
    },
  },
  {
    id: "degrade",
    name: "Degradé",
    category: "degrades",
    channels: [
      { label: "Color pleno (borde)", defaultHex: "#74B4E0" },
      { label: "Color de transición", defaultHex: "#A9D3F0" },
    ],
    scale: { label: "Alto", min: 8, max: 70, step: 1, default: 32 },
    angle: { min: -45, max: 225, default: 0 },
    defaultZones: [...BODY, "hem"],
    thumb: { x0: 4, y0: -2.5, span: 44 },
    draw: (d) => {
      const [c0, c1] = d.params.channels as [string, string];
      tiltedGradient(d, d.params.scaleCm, [
        [0, rgba(c0, 1)],
        [0.45, rgba(c1, 0.85)],
        [1, rgba(c1, 0)],
      ]);
    },
  },
  {
    id: "degrade-radial",
    name: "Degradé radial",
    category: "degrades",
    channels: [
      { label: "Centro", defaultHex: "#1F3A93" },
      { label: "Aro", defaultHex: "#1BA6B6" },
    ],
    scale: { label: "Radio", min: 8, max: 50, step: 1, default: 36 },
    defaultZones: BODY,
    thumb: { x0: 4, y0: 25, span: 44 },
    draw: (d) => {
      // Centro en el pecho de cada anillo; copias a una vuelta para empalmar (radio ≤ media vuelta).
      const C = d.ring.circumferenceCm;
      const r = Math.min(d.params.scaleCm, C / 2 - 0.5);
      const cx = C / 4, cy = d.ring.bandCenterCm;
      const [c0, c1] = d.params.channels as [string, string];
      const { ctx } = d;
      forEachWrap(d, (shift) => {
        const g = ctx.createRadialGradient(cx + shift, cy, 0, cx + shift, cy, r);
        // Núcleo pleno grande y un aro definido: se lee como un estallido buscado, no como una mancha.
        g.addColorStop(0, rgba(c0, 1));
        g.addColorStop(0.38, rgba(c0, 1));
        g.addColorStop(0.62, rgba(c1, 0.95));
        g.addColorStop(1, rgba(c1, 0));
        ctx.fillStyle = g;
        ctx.fillRect(cx + shift - r, cy - r, r * 2, r * 2);
      });
    },
  },
  {
    id: "trama-puntos",
    name: "Trama de puntos",
    category: "degrades",
    channels: [
      { label: "Puntos", defaultHex: "#2B2B2B" },
      { label: "Puntos alternos", defaultHex: "#8A8B8C" },
    ],
    scale: { label: "Alto", min: 10, max: 70, step: 1, default: 30 },
    angle: { min: -45, max: 225, default: 0 },
    defaultZones: BODY,
    thumb: { x0: 4, y0: -2.5, span: 44 },
    draw: (d) => {
      // Medio tono: puntos que se achican a lo largo del degradé; grilla con paso que entra justo en la vuelta.
      const C = d.ring.circumferenceCm;
      const step = C / Math.max(1, Math.round(C / 1.6));
      const a = d.params.angleDeg * DEG;
      const ca = Math.cos(a), sa = Math.sin(a);
      const [ry0, ry1] = ringYRange(d);
      const sStart = Math.min(ry0 * ca, ry1 * ca) + Math.min(0, (C / 2) * sa);
      const { ctx } = d;
      const rows = { from: Math.floor(d.y0 / step) - 1, to: Math.ceil(d.y1 / step) + 1 };
      for (let row = rows.from; row <= rows.to; row++) {
        const y = row * step;
        const odd = ((row % 2) + 2) % 2 === 1;
        ctx.fillStyle = d.params.channels[odd ? 1 : 0]!;
        const xShift = odd ? step / 2 : 0;
        for (let x = Math.floor(d.x0 / step) * step - step; x <= d.x1 + step; x += step) {
          const px = x + xShift;
          const sv = y * ca + folded(px, C) * sa;
          const t = (sv - sStart) / d.params.scaleCm;
          if (t >= 1) continue;
          const radius = step * 0.47 * Math.pow(1 - Math.max(0, t), 0.85);
          if (radius < 0.04) continue;
          ctx.beginPath();
          ctx.arc(px, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },
];

export const patternsById: Record<string, PatternDef> = Object.fromEntries(patterns.map((p) => [p.id, p]));
