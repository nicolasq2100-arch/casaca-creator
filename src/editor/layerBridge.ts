// Puente entre la escena 3D (dentro del <Canvas>) y las asas de la capa (DOM encima de la escena).
// La escena escribe cada cuadro dónde está la capa en pantalla; las asas leen y se mueven sin re-render.

export interface LayerScreenGeometry {
  visible: boolean;
  /** Centro de la capa en px, relativo a la escena. */
  cx: number;
  cy: number;
  /** Cuánto se mueve en pantalla (px) por cada cm de la pieza en x y en y. */
  jx: [number, number];
  jy: [number, number];
  /** Medio ancho y medio alto (cm) y rotación (grados) de la capa. */
  halfW: number;
  halfH: number;
  rotationDeg: number;
}

export interface PieceHit {
  piece: string;
  xCm: number;
  yCm: number;
}

export const layerBridge = {
  geometry: null as LayerScreenGeometry | null,
  listeners: new Set<() => void>(),
  /** Punto de la tela bajo el puntero (cm de la pieza), o null. Lo registra la escena. */
  pick: null as null | ((clientX: number, clientY: number) => PieceHit | null),
  /** Activa o desactiva el giro de cámara (mientras se arrastra una capa). */
  setOrbit: null as null | ((enabled: boolean) => void),
  emit() {
    for (const fn of this.listeners) fn();
  },
};

/** Punto local de la capa (cm, con su rotación) → px de pantalla relativos a la escena. */
export function layerToScreen(g: LayerScreenGeometry, lx: number, ly: number): [number, number] {
  const a = (g.rotationDeg * Math.PI) / 180;
  const dx = lx * Math.cos(a) - ly * Math.sin(a);
  const dy = lx * Math.sin(a) + ly * Math.cos(a);
  return [g.cx + g.jx[0] * dx + g.jy[0] * dy, g.cy + g.jx[1] * dx + g.jy[1] * dy];
}
