// DesignState: el diseño completo como JSON. Es lo único que se guarda (borrador local y, más adelante, la base).
// Las etapas siguientes suman capas y nombre/número.

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

export interface DesignState {
  version: typeof DESIGN_VERSION;
  garmentId: string;
  /** Color por zona (id de zona de garment.config → HEX "#RRGGBB"). */
  colors: Record<string, string>;
  graphic: GraphicState | null;
}
