import type { GarmentConfig, PieceId } from "@/garments/garment.config";
import type { Layer, TextLayer } from "@/design/types";
import { canvasFont, DEFAULT_FONT, textFontsById } from "./fonts";

// Medidas de las capas, siempre en cm de la pieza (x a la derecha, y hacia abajo, vista desde afuera).

let measureCtx: CanvasRenderingContext2D | null = null;
function measurer() {
  if (!measureCtx && typeof document !== "undefined") measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}

export function displayText(layer: TextLayer) {
  const font = textFontsById[layer.fontId] ?? textFontsById[DEFAULT_FONT]!;
  return font.uppercase ? layer.text.toLocaleUpperCase("es-AR") : layer.text;
}

/** Ancho y alto de la capa en cm (sin rotar). En texto incluye el contorno. */
export function layerSizeCm(layer: Layer): { w: number; h: number } {
  if (layer.kind === "image") return { w: layer.sizeCm, h: layer.sizeCm * layer.aspect };
  const font = textFontsById[layer.fontId] ?? textFontsById[DEFAULT_FONT]!;
  const ctx = measurer();
  let ratio = 0.6 * Math.max(1, layer.text.length);
  if (ctx) {
    ctx.font = canvasFont(font, 100);
    ratio = ctx.measureText(displayText(layer) || " ").width / 100;
  }
  const o = layer.outline.widthCm * 2;
  return { w: ratio * layer.sizeCm + o, h: layer.sizeCm + o };
}

/** ¿El punto (cm de la pieza) cae dentro de la capa, contando su rotación? */
export function hitLayer(layer: Layer, xCm: number, yCm: number, padCm = 0) {
  const { w, h } = layerSizeCm(layer);
  const a = (-layer.rotationDeg * Math.PI) / 180;
  const dx = xCm - layer.xCm, dy = yCm - layer.yCm;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= w / 2 + padCm && Math.abs(ly) <= h / 2 + padCm;
}

/** Punto de la capa (en su sistema local, cm) llevado a cm de la pieza. */
export function layerPointCm(layer: Layer, lx: number, ly: number) {
  const a = (layer.rotationDeg * Math.PI) / 180;
  return { x: layer.xCm + lx * Math.cos(a) - ly * Math.sin(a), y: layer.yCm + lx * Math.sin(a) + ly * Math.cos(a) };
}

export function cmToUv(garment: GarmentConfig, piece: string, xCm: number, yCm: number) {
  const spec = garment.pieces[piece as PieceId];
  if (!spec) return null;
  return { u: spec.uv.u + xCm / garment.cmPerUv, v: spec.uv.v + yCm / garment.cmPerUv };
}

/** UV (0..1, v hacia abajo) → pieza y cm dentro de ella. */
export function uvToPieceCm(garment: GarmentConfig, u: number, v: number) {
  for (const [id, spec] of Object.entries(garment.pieces)) {
    if (!spec) continue;
    if (u >= spec.uv.u && u <= spec.uv.u + spec.uv.w && v >= spec.uv.v && v <= spec.uv.v + spec.uv.h) {
      return { piece: id, xCm: (u - spec.uv.u) * garment.cmPerUv, yCm: (v - spec.uv.v) * garment.cmPerUv };
    }
  }
  return null;
}
