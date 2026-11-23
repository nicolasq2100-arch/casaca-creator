"use client";

import { create } from "zustand";
import type { RemoveBackground } from "./types";

// Imágenes de las capas, guardadas en este dispositivo (IndexedDB: localStorage no alcanza para imágenes).
// Por cada imagen se guardan dos versiones, como pide CLAUDE.md:
// - original: el archivo tal cual lo subieron (para la ficha de fábrica);
// - copia liviana: WebP de hasta 1024 px y ~100 KB (para el 3D).
// Cuando exista Supabase, estas dos versiones van a los buckets `layers-original` y `layers`.

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"] as const;
const PREVIEW_MAX_SIDE = 1024;
const PREVIEW_TARGET_BYTES = 110 * 1024;

const DB_NAME = "casaca-creator";
const STORE = "assets";

export interface AssetMeta {
  id: string;
  name: string;
  originalType: string;
  originalBytes: number;
  /** Píxeles del original (para avisar si sale pixelado). 0 en SVG. */
  width: number;
  height: number;
  isVector: boolean;
  /** Si la imagen ya trae transparencia. */
  hasAlpha: boolean;
  /** Color promedio de las esquinas y si es parejo (fondo probable). */
  cornerColor: string;
  uniformCorners: boolean;
  previewType: string;
}

interface StoredAsset extends AssetMeta {
  original: Blob;
  preview: Blob;
  createdAt: number;
}

// ---------- IndexedDB ----------

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB no disponible"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("No se pudo abrir IndexedDB"));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Error de IndexedDB"));
      }),
  );
}

// ---------- estado en memoria (para dibujar sin esperar) ----------

interface AssetsStore {
  meta: Record<string, AssetMeta>;
  images: Record<string, CanvasImageSource>;
  failed: Record<string, true>;
  /** Si las imágenes no se pueden guardar en el dispositivo (modo privado, sin espacio). */
  persistError: boolean;
  version: number;
}

export const useAssets = create<AssetsStore>()(() => ({ meta: {}, images: {}, failed: {}, persistError: false, version: 0 }));

const bumpVersion = () => useAssets.setState((s) => ({ version: s.version + 1 }));

async function decode(blob: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function" && blob.type !== "image/svg+xml") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Safari viejo: cae a <img>.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // La imagen ya está decodificada; la URL se puede soltar.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** SVG sin ancho/alto: el tamaño sale del viewBox. */
async function svgSize(file: Blob): Promise<{ w: number; h: number } | null> {
  const text = await file.text();
  const vb = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (vb) return { w: Number(vb[1]), h: Number(vb[2]) };
  const w = /\swidth\s*=\s*["']([\d.]+)/i.exec(text), h = /\sheight\s*=\s*["']([\d.]+)/i.exec(text);
  return w && h ? { w: Number(w[1]), h: Number(h[1]) } : null;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export class UploadError extends Error {}

/**
 * Valida, guarda el original y genera la copia liviana. Devuelve los datos de la imagen.
 * Los mensajes de error son para mostrar tal cual.
 */
export async function saveUpload(file: File): Promise<AssetMeta> {
  const type = file.type || (file.name.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "");
  if (!(ACCEPTED_TYPES as readonly string[]).includes(type)) {
    throw new UploadError("Ese archivo no es PNG, JPG ni SVG. Exportalo en uno de esos formatos y volvé a subirlo.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 });
    throw new UploadError(`El archivo pesa ${mb} MB y el máximo es 10 MB. Probá exportarlo más liviano.`);
  }
  const isVector = type === "image/svg+xml";

  let img: CanvasImageSource & { width: number; height: number };
  try {
    img = await decode(file);
  } catch {
    throw new UploadError("No pudimos abrir la imagen. Puede estar dañada; probá exportarla de nuevo.");
  }
  let w = img.width, h = img.height;
  if (isVector && (!w || !h)) {
    const s = await svgSize(file);
    if (!s) throw new UploadError("El SVG no indica su tamaño (viewBox). Exportalo de nuevo con viewBox.");
    w = s.w;
    h = s.h;
  }
  if (!w || !h) throw new UploadError("No pudimos leer el tamaño de la imagen.");

  // Copia liviana: lado mayor ≤ 1024 px (los SVG se rasterizan a 1024).
  const scale = isVector ? PREVIEW_MAX_SIDE / Math.max(w, h) : Math.min(1, PREVIEW_MAX_SIDE / Math.max(w, h));
  const pw = Math.max(1, Math.round(w * scale)), ph = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new UploadError("El navegador no tiene memoria para procesar la imagen. Cerrá otras pestañas y probá de nuevo.");
  ctx.drawImage(img, 0, 0, pw, ph);
  const analysis = analyze(ctx, pw, ph);

  let preview: Blob | null = null;
  for (const q of [0.9, 0.82, 0.72, 0.6, 0.5]) {
    preview = await toBlob(canvas, "image/webp", q);
    if (!preview || preview.type !== "image/webp" || preview.size <= PREVIEW_TARGET_BYTES) break;
  }
  // Safari sin codificador WebP: la copia queda en PNG (conserva la transparencia).
  if (!preview || preview.type !== "image/webp") preview = await toBlob(canvas, "image/png");
  if (!preview) throw new UploadError("No pudimos preparar la imagen. Probá de nuevo.");

  const meta: AssetMeta = {
    id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name.replace(/\.[^.]+$/, "") || "Imagen",
    originalType: type,
    originalBytes: file.size,
    width: isVector ? 0 : w,
    height: isVector ? 0 : h,
    isVector,
    previewType: preview.type,
    ...analysis,
  };

  const record: StoredAsset = { ...meta, original: file, preview, createdAt: Date.now() };
  try {
    await tx("readwrite", (s) => s.put(record));
  } catch {
    useAssets.setState({ persistError: true });
  }
  const bitmap = await decode(preview);
  useAssets.setState((s) => ({
    meta: { ...s.meta, [meta.id]: meta },
    images: { ...s.images, [meta.id]: bitmap },
    version: s.version + 1,
  }));
  return meta;
}

function analyze(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4 * 7) {
    if (data[i]! < 250) {
      hasAlpha = true;
      break;
    }
  }
  const samples: number[][] = [];
  const n = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  for (const [cx, cy] of [[0, 0], [w - n, 0], [0, h - n], [w - n, h - n]] as const) {
    let r = 0, g = 0, b = 0, c = 0;
    for (let y = cy; y < cy + n; y++) {
      for (let x = cx; x < cx + n; x++) {
        const k = (y * w + x) * 4;
        r += data[k]!;
        g += data[k + 1]!;
        b += data[k + 2]!;
        c++;
      }
    }
    samples.push([r / c, g / c, b / c]);
  }
  const avg = [0, 1, 2].map((i) => samples.reduce((a, s) => a + s[i]!, 0) / samples.length);
  const spread = Math.max(...samples.map((s) => Math.hypot(s[0]! - avg[0]!, s[1]! - avg[1]!, s[2]! - avg[2]!)));
  const hex = `#${avg.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return { hasAlpha, cornerColor: hex, uniformCorners: spread < 18 };
}

/** Carga a memoria (para dibujar) las imágenes que el diseño usa y todavía no están. */
export async function ensureAssets(ids: string[]) {
  const { images, failed } = useAssets.getState();
  const missing = ids.filter((id) => !images[id] && !failed[id]);
  if (!missing.length) return;
  for (const id of missing) {
    try {
      const rec = await tx<StoredAsset | undefined>("readonly", (s) => s.get(id) as IDBRequest<StoredAsset | undefined>);
      if (!rec) throw new Error("no está");
      const { original: _o, preview, createdAt: _c, ...meta } = rec;
      const bitmap = await decode(preview);
      useAssets.setState((s) => ({ meta: { ...s.meta, [id]: meta }, images: { ...s.images, [id]: bitmap } }));
    } catch {
      useAssets.setState((s) => ({ failed: { ...s.failed, [id]: true } }));
    }
  }
  bumpVersion();
}

/** Borra del dispositivo las imágenes que ningún diseño guardado usa. */
export async function pruneAssets(keep: Set<string>) {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
    for (const k of keys) if (typeof k === "string" && !keep.has(k)) await tx("readwrite", (s) => s.delete(k));
  } catch {
    // Sin IndexedDB no hay nada que limpiar.
  }
}

// ---------- quitar fondo ----------

const processedCache = new Map<string, HTMLCanvasElement>();

/**
 * Copia liviana con el fondo quitado (chroma key con borde suave). Se calcula una vez por combinación
 * de imagen, color y tolerancia.
 */
export function imageForLayer(assetId: string, rb: RemoveBackground): CanvasImageSource | null {
  const src = useAssets.getState().images[assetId];
  if (!src) return null;
  if (!rb.enabled) return src;
  const key = `${assetId}|${rb.color}|${rb.tolerance}`;
  const hit = processedCache.get(key);
  if (hit) return hit;
  const s = src as CanvasImageSource & { width: number; height: number };
  const c = document.createElement("canvas");
  c.width = s.width;
  c.height = s.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(s, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const n = parseInt(rb.color.slice(1), 16);
  const tr = (n >> 16) & 255, tg = (n >> 8) & 255, tb = n & 255;
  // Tolerancia 0-100 → distancia RGB 0-220; el borde se suaviza en una franja para no dejar serrucho.
  const lo = (rb.tolerance / 100) * 220;
  const hi = lo + 18 + lo * 0.25;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.hypot(d[i]! - tr, d[i + 1]! - tg, d[i + 2]! - tb);
    if (dist >= hi) continue;
    const t = dist <= lo ? 0 : (dist - lo) / (hi - lo);
    d[i + 3] = Math.round(d[i + 3]! * t * t * (3 - 2 * t));
  }
  ctx.putImageData(img, 0, 0);
  if (processedCache.size > 24) processedCache.clear();
  processedCache.set(key, c);
  return c;
}
