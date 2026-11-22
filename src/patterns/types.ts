import type { PatternRing } from "@/garments/garment.config";

export type PatternCategory = "rayas" | "paneles" | "texturas" | "degrades";

export const PATTERN_CATEGORIES: { id: PatternCategory; label: string }[] = [
  { id: "rayas", label: "Rayas" },
  { id: "paneles", label: "Paneles" },
  { id: "texturas", label: "Texturas" },
  { id: "degrades", label: "Degradés" },
];

/** Parámetros que el usuario ajusta. Todo en cm / grados; el canal 0 es el principal. */
export interface PatternParams {
  channels: string[];
  scaleCm: number;
  angleDeg: number;
  variant: number;
}

/** Contexto de dibujo: el ctx ya está transformado a cm del anillo (x a lo largo de la vuelta, y hacia arriba). */
export interface PatternDrawContext {
  ctx: CanvasRenderingContext2D;
  ring: PatternRing;
  /** Rango x (cm del anillo) visible en esta pieza, con margen. */
  x0: number;
  x1: number;
  /** Rango y (cm del anillo) visible en esta pieza, con margen. */
  y0: number;
  y1: number;
  /** Desplazamiento x de la pieza en el anillo (para el espejo de los degradés inclinados). */
  pieceOffsetCm: number;
  pieceWidthCm: number;
  /** Extremos en y de todo el anillo (de la costura más baja al punto más alto). */
  ringYMin: number;
  ringYMax: number;
  pxPerCm: number;
  params: PatternParams;
}

export interface PatternDef {
  id: string;
  name: string;
  category: PatternCategory;
  /** 2 a 4 canales de color, con nombre y color por defecto (siempre de la paleta). */
  channels: { label: string; defaultHex: string }[];
  scale: { label: string; min: number; max: number; step: number; default: number };
  /** Solo si el ángulo puede variar sin romper el empalme en las costuras. */
  angle?: { min: number; max: number; default: number };
  /** Variantes de forma (texturas con azar). */
  variants?: number;
  /** Zonas donde va por defecto. */
  defaultZones: string[];
  /** Encuadre de la miniatura en cm del anillo del cuerpo (por defecto, pecho y costura del costado). */
  thumb?: { x0: number; y0: number; span: number };
  draw: (d: PatternDrawContext) => void;
}
