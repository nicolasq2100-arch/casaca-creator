import { allFabricColors, type FabricColor } from "./fabricPalette";

const HEX_RE = /^#[0-9A-F]{6}$/;

/** Normaliza "c8102e", "#c8102e" o "#C8102E" a "#C8102E". Devuelve null si no es un HEX de 6 dígitos. */
export function normalizeHex(input: string): string | null {
  const v = input.trim().toUpperCase();
  const withHash = v.startsWith("#") ? v : `#${v}`;
  return HEX_RE.test(withHash) ? withHash : null;
}

export const isHex = (v: unknown): v is string => typeof v === "string" && HEX_RE.test(v);

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** sRGB → CIELAB (D65). */
export function hexToLab(hex: string): [number, number, number] {
  const [R, G, B] = hexToRgb(hex).map((v) => lin(v / 255)) as [number, number, number];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

/** Diferencia de color CIEDE2000. */
export function deltaE2000(a: [number, number, number], b: [number, number, number]): number {
  const [L1, a1, b1] = a;
  const [L2, a2, b2] = b;
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (x: number, y: number) => {
    const v = Math.atan2(y, x) / rad;
    return v < 0 ? v + 360 : v;
  };
  const h1p = hue(a1p, b1);
  const h2p = hue(a2p, b2);
  const dL = L2 - L1;
  const dC = C2p - C1p;
  let dh = C1p * C2p === 0 ? 0 : h2p - h1p;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hm = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hm += h1p + h2p < 360 ? 360 : -360;
    hm /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hm - 30) * rad) +
    0.24 * Math.cos(2 * hm * rad) +
    0.32 * Math.cos((3 * hm + 6) * rad) -
    0.2 * Math.cos((4 * hm - 63) * rad);
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const SC = 1 + 0.045 * Cmp;
  const SH = 1 + 0.015 * Cmp * T;
  const RT = -2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

export interface ColorName {
  /** Nombre a mostrar ("Rojo intenso" o "Personalizado"). */
  name: string;
  /** Si no es de la paleta, el color de la paleta más parecido. */
  nearest?: FabricColor;
  inPalette: boolean;
}

/** Nombre legible de cualquier HEX: el de la paleta si coincide, o el más parecido si no. */
export function describeColor(hex: string): ColorName {
  const exact = allFabricColors.find((c) => c.hex === hex);
  if (exact) return { name: exact.name, inPalette: true };
  const lab = hexToLab(hex);
  let nearest = allFabricColors[0]!;
  let best = Infinity;
  for (const c of allFabricColors) {
    const d = deltaE2000(lab, hexToLab(c.hex));
    if (d < best) {
      best = d;
      nearest = c;
    }
  }
  return { name: "Personalizado", nearest, inPalette: false };
}

/** Texto de una línea para listas: "Rojo intenso" o "Personalizado, parecido a Rojo intenso". */
export function colorLabel(hex: string): string {
  const d = describeColor(hex);
  return d.inPalette || !d.nearest ? d.name : `Personalizado, parecido a ${d.nearest.name}`;
}

/** Luminancia relativa (para decidir texto claro u oscuro sobre una muestra). */
export function relativeLuminance(hex: string): number {
  const [R, G, B] = hexToRgb(hex).map((v) => lin(v / 255)) as [number, number, number];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
