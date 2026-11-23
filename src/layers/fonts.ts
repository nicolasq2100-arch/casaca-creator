"use client";

import { create } from "zustand";

// Tipografías para textos y números de la camiseta (todas OFL, de Google Fonts).
// Se cargan con next/font en layout.tsx (variables CSS) y se esperan antes de dibujar en el canvas.

export interface TextFont {
  id: string;
  label: string;
  cssVar: string;
  weight: number;
  /** Alto de las mayúsculas / tamaño de la fuente (para que "alto de letra en cm" sea real). */
  capRatio: number;
  uppercase: boolean;
}

export const textFonts: TextFont[] = [
  { id: "shoulders", label: "Dorsal", cssVar: "--ff-shoulders", weight: 800, capRatio: 0.74, uppercase: true },
  { id: "anton", label: "Pesada", cssVar: "--ff-anton", weight: 400, capRatio: 0.73, uppercase: true },
  { id: "teko", label: "Angosta", cssVar: "--ff-teko", weight: 600, capRatio: 0.6, uppercase: true },
  { id: "graduate", label: "Universitaria", cssVar: "--ff-graduate", weight: 400, capRatio: 0.7, uppercase: true },
  { id: "barlow-c", label: "Clásica", cssVar: "--ff-barlow-c", weight: 700, capRatio: 0.7, uppercase: false },
];

export const textFontsById: Record<string, TextFont> = Object.fromEntries(textFonts.map((f) => [f.id, f]));
export const DEFAULT_FONT = "shoulders";

export function fontFamily(font: TextFont) {
  if (typeof document === "undefined") return "sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue(font.cssVar).trim();
  return v || "sans-serif";
}

/** Fuente CSS para el canvas, con el tamaño en px que da el alto de letra pedido. */
export function canvasFont(font: TextFont, capHeightPx: number) {
  return `${font.weight} ${Math.max(1, capHeightPx / font.capRatio)}px ${fontFamily(font)}`;
}

/** Sube cada vez que termina de cargar una tipografía (el canvas se redibuja). */
export const useFontsVersion = create<{ version: number }>()(() => ({ version: 0 }));

const requested = new Set<string>();
export function ensureFont(font: TextFont) {
  if (typeof document === "undefined" || requested.has(font.id)) return;
  requested.add(font.id);
  document.fonts
    .load(canvasFont(font, 40))
    .then(() => useFontsVersion.setState((s) => ({ version: s.version + 1 })))
    .catch(() => requested.delete(font.id));
}
