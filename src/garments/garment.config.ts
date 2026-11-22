// Datos de cada prenda: modelo, piezas del UV, zonas de color y medidas reales.
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
  /** Altura (cm, desde el borde de abajo) en la que los costados son rectos; arriba empieza la sisa. */
  straightSidesCm?: number;
}

/** Zona de color: grupo de piezas que el usuario pinta juntas. */
export interface ColorZone {
  id: string;
  label: string;
  pieces: PieceId[];
  /** Color con el que arranca un diseño nuevo. */
  defaultHex: string;
}

/**
 * Posición sugerida para una capa nueva, medida desde la esquina superior izquierda de la pieza,
 * vista desde afuera. Es el punto de partida, no un límite.
 */
export interface Placement {
  id: "crest" | "number" | "text" | "logo";
  piece: PieceId;
  xCm: number;
  yCm: number;
  /** Tamaño por defecto. */
  wCm: number;
  hCm: number;
  /** Si el usuario puede cambiar el tamaño. */
  resizable: boolean;
}

/**
 * Anillo para dibujar gráficos: piezas que se cosen formando una vuelta (cuerpo, manga, cuello).
 * x recorre la vuelta en cm (0 … circumferenceCm, periódica); y en cm desde la costura de abajo, hacia arriba.
 * Así una raya que cruza una costura sigue en la pieza de al lado.
 */
export interface PatternRing {
  id: string;
  circumferenceCm: number;
  /** Posiciones x de las costuras verticales (para el panel lateral). */
  seamsCm: number[];
  /** Altura hasta la que llegan los paneles de costura (axila). */
  panelTopCm: number;
  /** Altura del centro de la banda pectoral (o de la manga). */
  bandCenterCm: number;
  pieces: { piece: PieceId; xOffsetCm: number; yOffsetCm: number }[];
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
    /** Brillo rasante típico de la tela (MeshPhysicalMaterial.sheen), teñido con el color del diseño. */
    sheen: number;
    sheenRoughness: number;
    /** Intensidad del normal map de trama (0 = sin trama). */
    knitStrength: number;
    /** Cara interior: la textura del diseño multiplicada por este factor (en espacio lineal). */
    innerShade: number;
  };
  /** Caja de la prenda en metros, para encuadrar la cámara. */
  boundsM: { w: number; h: number };
  pieces: Partial<Record<PieceId, PieceSpec>>;
  /** Zonas de color en el orden en que se muestran. */
  colorZones: ColorZone[];
  patternRings: PatternRing[];
  placements: Placement[];
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
    // La muestra real mide 26,4 cm (4,38 por unidad UV), pero esa malla de algodón es más fina que una
    // deportiva y de cerca no se notaba: se usa 1,5× más gruesa (repetición de 39,5 cm).
    repeatPerUv: 2.92,
  },
  fabric: {
    roughness: 0.68,
    specularIntensity: 0.45,
    sheen: 0.35,
    sheenRoughness: 0.7,
    knitStrength: 2.4,
    innerShade: 0.55,
  },
  boundsM: { w: 0.578, h: 0.701 },
  pieces: {
    // Costados rectos: 44,7 cm desde el bajo hasta la sisa (DXF, pieza 41 y 44).
    front: { label: "Frente", uv: { u: 0.0295, v: 0.09499, w: 0.45116, h: 0.59357 }, sizeCm: { w: 52.06, h: 68.5 }, straightSidesCm: 44 },
    back: { label: "Espalda", uv: { u: 0.51934, v: 0.09499, w: 0.45116, h: 0.59357 }, sizeCm: { w: 52.06, h: 68.5 }, straightSidesCm: 44 },
    sleeve_l: { label: "Manga izq.", uv: { u: 0.57163, v: 0.77517, w: 0.34657, h: 0.15607 }, sizeCm: { w: 39.99, h: 18.01 } },
    sleeve_r: { label: "Manga der.", uv: { u: 0.04091, v: 0.76545, w: 0.34655, h: 0.15607 }, sizeCm: { w: 39.99, h: 18.01 } },
    cuff_l: { label: "Puño izq.", uv: { u: 0.58357, v: 0.94856, w: 0.32452, h: 0.02194 }, sizeCm: { w: 37.45, h: 2.53 } },
    cuff_r: { label: "Puño der.", uv: { u: 0.05446, v: 0.9416, w: 0.32453, h: 0.02195 }, sizeCm: { w: 37.45, h: 2.53 } },
    hem_front: { label: "Bajo frente", uv: { u: 0.0295, v: 0.71687, w: 0.45116, h: 0.02167 }, sizeCm: { w: 52.06, h: 2.5 } },
    hem_back: { label: "Bajo espalda", uv: { u: 0.51934, v: 0.71687, w: 0.45116, h: 0.02167 }, sizeCm: { w: 52.06, h: 2.5 } },
    collar: { label: "Cuello", uv: { u: 0.28029, v: 0.05917, w: 0.45754, h: 0.02167 }, sizeCm: { w: 52.8, h: 2.5 } },
  },
  colorZones: [
    // Frente y espalda son zonas separadas. El panel lateral (costado/axila) NO es zona: es un gráfico (etapa 2).
    { id: "front", label: "Frente", pieces: ["front"], defaultHex: "#F7F7F5" },
    { id: "back", label: "Espalda", pieces: ["back"], defaultHex: "#F7F7F5" },
    { id: "sleeves", label: "Mangas", pieces: ["sleeve_l", "sleeve_r"], defaultHex: "#F7F7F5" },
    { id: "collar", label: "Cuello", pieces: ["collar"], defaultHex: "#14213D" },
    { id: "cuffs", label: "Puños", pieces: ["cuff_l", "cuff_r"], defaultHex: "#14213D" },
    { id: "hem", label: "Bajo", pieces: ["hem_front", "hem_back"], defaultHex: "#F7F7F5" },
  ],
  // Vueltas para los gráficos. Visto desde afuera: el borde derecho del frente (+X, izquierda de quien la lleva)
  // se cose con el borde izquierdo de la espalda; el borde derecho de la espalda vuelve al izquierdo del frente.
  patternRings: [
    {
      id: "body",
      circumferenceCm: 104.12,
      seamsCm: [0, 52.06],
      panelTopCm: 44, // costados rectos hasta la sisa (DXF)
      bandCenterCm: 47, // pecho
      pieces: [
        { piece: "front", xOffsetCm: 0, yOffsetCm: 0 },
        { piece: "back", xOffsetCm: 52.06, yOffsetCm: 0 },
        // El bajo sigue debajo del cuerpo: franjas y degradés continúan.
        { piece: "hem_front", xOffsetCm: 0, yOffsetCm: -2.5 },
        { piece: "hem_back", xOffsetCm: 52.06, yOffsetCm: -2.5 },
      ],
    },
    {
      id: "sleeve_l",
      circumferenceCm: 39.99,
      seamsCm: [0],
      panelTopCm: 18.01,
      bandCenterCm: 9,
      pieces: [
        { piece: "sleeve_l", xOffsetCm: 0, yOffsetCm: 0 },
        { piece: "cuff_l", xOffsetCm: 1.27, yOffsetCm: -2.53 },
      ],
    },
    {
      id: "sleeve_r",
      circumferenceCm: 39.99,
      seamsCm: [0],
      panelTopCm: 18.01,
      bandCenterCm: 9,
      pieces: [
        { piece: "sleeve_r", xOffsetCm: 0, yOffsetCm: 0 },
        { piece: "cuff_r", xOffsetCm: 1.27, yOffsetCm: -2.53 },
      ],
    },
    {
      id: "collar",
      circumferenceCm: 52.8,
      seamsCm: [0],
      panelTopCm: 2.5,
      bandCenterCm: 1.25,
      pieces: [{ piece: "collar", xOffsetCm: 0, yOffsetCm: 0 }],
    },
  ],
  placements: [
    // Escudo: 8 × 8 cm por defecto, TAMAÑO AJUSTABLE por el usuario.
    // Centrado en el recuadro del molde (capa 8 del DXF, 3,8 × 3,8 cm, pecho izquierdo de quien la lleva:
    // esquina en x 33,41 / y 18,468 cm, centro en x 35,31 / y 20,37 cm). Ese recuadro de 3,8 cm es para
    // el logo de marca; la ubicación definitiva del logo todavía no está decidida.
    { id: "crest", piece: "front", xCm: 31.31, yCm: 16.37, wCm: 8, hCm: 8, resizable: true },
  ],
};

export const garments: Record<string, GarmentConfig> = {
  [jerseyPlayer.id]: jerseyPlayer,
};

/** Prendas del selector. Las que todavía no tienen modelo aparecen deshabilitadas. */
export interface GarmentCatalogEntry {
  id: string;
  label: string;
  status: "available" | "soon";
  /** Miniatura del render real (solo prendas disponibles). */
  thumbUrl?: string;
  /** Silueta de referencia mientras la prenda no existe. */
  silhouette: "jersey" | "goalkeeper" | "shorts" | "socks" | "kit";
}

export const garmentCatalog: GarmentCatalogEntry[] = [
  { id: "jersey-player", label: "Jugador", status: "available", thumbUrl: "/thumbs/jersey-player.webp", silhouette: "jersey" },
  { id: "jersey-goalkeeper", label: "Arquero", status: "soon", silhouette: "goalkeeper" },
  { id: "shorts", label: "Short", status: "soon", silhouette: "shorts" },
  { id: "socks", label: "Medias", status: "soon", silhouette: "socks" },
  { id: "kit", label: "Kit completo", status: "soon", silhouette: "kit" },
];

/** Convierte una posición en cm dentro de una pieza a coordenadas UV. */
export function pieceCmToUv(garment: GarmentConfig, piece: PieceId, xCm: number, yCm: number) {
  const spec = garment.pieces[piece];
  if (!spec) throw new Error(`La prenda ${garment.id} no tiene la pieza ${piece}`);
  return { u: spec.uv.u + xCm / garment.cmPerUv, v: spec.uv.v + yCm / garment.cmPerUv };
}
