// DesignState: el diseño completo como JSON. Es lo único que se guarda (borrador local y, más adelante, la base).
// Las imágenes de las capas NO van en el JSON: se guardan aparte (IndexedDB hoy, Supabase después) y el JSON
// las referencia por `assetId`.

export const DESIGN_VERSION = 1 as const;

/** Gráfico de fondo (patrones de patterns/registry.ts). Se dibuja encima de los colores por zona. */
export interface GraphicState {
  id: string;
  /** Colores de los canales, en el orden del registro (2 a 4). */
  channels: string[];
  /** Zonas de color donde va (ids de garment.config). */
  zones: string[];
  scaleCm: number;
  angleDeg: number;
  /** Variante de forma (texturas con azar). */
  variant: number;
}

interface LayerBase {
  id: string;
  name: string;
  /** Pieza donde va (id de garment.config). */
  piece: string;
  /** Centro, en cm desde la esquina superior izquierda de la pieza vista desde afuera. */
  xCm: number;
  yCm: number;
  /** Imagen: ancho en cm. Texto: alto de las letras (mayúsculas) en cm. */
  sizeCm: number;
  rotationDeg: number;
  hidden: boolean;
}

export interface RemoveBackground {
  enabled: boolean;
  /** Color a quitar (blanco por defecto, o el que elija el usuario). */
  color: string;
  /** 0-100: cuánto se aleja un color del elegido y se sigue quitando. */
  tolerance: number;
}

export interface ImageLayer extends LayerBase {
  kind: "image";
  /** Rol especial (el escudo usa la posición sugerida de la prenda). */
  role?: "crest";
  assetId: string;
  /** Alto / ancho de la imagen. */
  aspect: number;
  removeBg: RemoveBackground;
}

export interface TextLayer extends LayerBase {
  kind: "text";
  text: string;
  fontId: string;
  color: string;
  outline: { color: string; widthCm: number };
}

export type Layer = ImageLayer | TextLayer;

/** Un lugar del nombre o número (espalda, frente). */
export interface NameNumberSlot {
  enabled: boolean;
  piece: string;
  xCm: number;
  yCm: number;
  /** Alto de las letras / cifras en cm. */
  sizeCm: number;
}

/**
 * Nombre y número DE MUESTRA: sirven para diseñar cómo van. La lista de jugadores se carga en el pedido.
 * Comparten tipografía, color y contorno; cada lugar tiene su posición y tamaño.
 */
export interface NameNumberState {
  name: string;
  number: string;
  fontId: string;
  color: string;
  outline: { color: string; widthCm: number };
  slots: Record<"name" | "number" | "frontNumber", NameNumberSlot>;
}

export interface DesignState {
  version: typeof DESIGN_VERSION;
  garmentId: string;
  /** Color por zona (id de zona de garment.config → HEX "#RRGGBB"). */
  colors: Record<string, string>;
  graphic: GraphicState | null;
  /** Capas de abajo hacia arriba (la última se dibuja encima). */
  layers: Layer[];
  /** Se dibuja encima de las capas. Una plantilla no lo cambia. */
  nameNumber: NameNumberState;
}
