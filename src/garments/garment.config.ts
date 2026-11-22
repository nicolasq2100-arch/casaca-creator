// Datos de cada prenda: modelo, piezas del UV y medidas reales.
// Sumar una prenda = sumar un GLB en /public/models + una entrada acá.

export type PieceId =
  | "front"
  | "back"
  | "sleeve_l"
  | "sleeve_r"
  | "cuff_l"
  | "cuff_r"
  | "hem_front"
  | "hem_back"
  | "collar";

/** Rectángulo en espacio UV (0..1, v = 0 arriba, igual que el canvas). */
export interface UvRect {
  u: number;
  v: number;
  w: number;
  h: number;
}

export interface PieceSpec {
  label: string;
  /** Caja de la isla UV, vista desde afuera de la prenda. */
  uv: UvRect;
  /** Medida neta de la pieza (sin margen de costura), del molde DXF. */
  sizeCm: { w: number; h: number };
}

/** Zona de ubicación medida desde la esquina superior izquierda de la pieza, vista desde afuera. */
export interface PlacementZone {
  id: "crest" | "number" | "text" | "logo";
  piece: PieceId;
  xCm: number;
  yCm: number;
  wCm: number;
  hCm: number;
}

export interface GarmentConfig {
  id: string;
  label: string;
  modelUrl: string;
  /** Talle del molde con el que se midió todo. */
  sampleSize: string;
  /** Centímetros reales por unidad UV (igual en todas las piezas). */
  cmPerUv: number;
  knit: {
    normalUrl: string;
    /** Repeticiones de la trama por unidad UV (tamaño real de la muestra / cmPerUv). */
    repeatPerUv: number;
  };
  /** Acabado de la tela; reemplaza los valores del GLB (los de CLO daban un brillo de plástico). */
  fabric: {
    roughness: number;
    specularIntensity: number;
    /** Brillo rasante típico de la tela (MeshPhysicalMaterial.sheen). */
    sheen: number;
    sheenRoughness: number;
  };
  /** Caja de la prenda en metros, para encuadrar la cámara. */
  boundsM: { w: number; h: number };
  pieces: Partial<Record<PieceId, PieceSpec>>;
  zones: PlacementZone[];
}

// Camiseta de jugador. Fuente: export de CLO (talle M), molde DXF en mm.
// UV medido sobre modelos-optimizados/jersey-player.glb; 1 unidad UV = 1154,0 mm en las 9 piezas.
export const jerseyPlayer: GarmentConfig = {
  id: "jersey-player",
  label: "Camiseta de jugador",
  modelUrl: "/models/jersey-player.glb",
  sampleSize: "M",
  cmPerUv: 115.4,
  knit: {
    normalUrl: "/models/fabric-knit-normal.jpg",
    repeatPerUv: 4.38, // muestra de 26,4 cm (Poly Haven "Cotton Jersey")
  },
  fabric: { roughness: 0.68, specularIntensity: 0.45, sheen: 0.35, sheenRoughness: 0.7 },
  boundsM: { w: 0.578, h: 0.701 },
  pieces: {
    front: { label: "Frente", uv: { u: 0.0295, v: 0.09499, w: 0.45116, h: 0.59357 }, sizeCm: { w: 52.06, h: 68.5 } },
    back: { label: "Espalda", uv: { u: 0.51934, v: 0.09499, w: 0.45116, h: 0.59357 }, sizeCm: { w: 52.06, h: 68.5 } },
    sleeve_l: { label: "Manga izq.", uv: { u: 0.57163, v: 0.77517, w: 0.34657, h: 0.15607 }, sizeCm: { w: 39.99, h: 18.01 } },
    sleeve_r: { label: "Manga der.", uv: { u: 0.04091, v: 0.76545, w: 0.34655, h: 0.15607 }, sizeCm: { w: 39.99, h: 18.01 } },
    cuff_l: { label: "Puño izq.", uv: { u: 0.58357, v: 0.94856, w: 0.32452, h: 0.02194 }, sizeCm: { w: 37.45, h: 2.53 } },
    cuff_r: { label: "Puño der.", uv: { u: 0.05446, v: 0.9416, w: 0.32453, h: 0.02195 }, sizeCm: { w: 37.45, h: 2.53 } },
    hem_front: { label: "Bajo frente", uv: { u: 0.0295, v: 0.71687, w: 0.45116, h: 0.02167 }, sizeCm: { w: 52.06, h: 2.5 } },
    hem_back: { label: "Bajo espalda", uv: { u: 0.51934, v: 0.71687, w: 0.45116, h: 0.02167 }, sizeCm: { w: 52.06, h: 2.5 } },
    collar: { label: "Cuello", uv: { u: 0.28029, v: 0.05917, w: 0.45754, h: 0.02167 }, sizeCm: { w: 52.8, h: 2.5 } },
  },
  zones: [
    // Recuadro del molde (capa 8 del DXF): pecho izquierdo de quien la lleva.
    { id: "crest", piece: "front", xCm: 33.41, yCm: 18.468, wCm: 3.807, hCm: 3.807 },
  ],
};

export const garments: Record<string, GarmentConfig> = {
  [jerseyPlayer.id]: jerseyPlayer,
};

/** Convierte una posición en cm dentro de una pieza a coordenadas UV. */
export function pieceCmToUv(garment: GarmentConfig, piece: PieceId, xCm: number, yCm: number) {
  const spec = garment.pieces[piece];
  if (!spec) throw new Error(`La prenda ${garment.id} no tiene la pieza ${piece}`);
  return { u: spec.uv.u + xCm / garment.cmPerUv, v: spec.uv.v + yCm / garment.cmPerUv };
}
