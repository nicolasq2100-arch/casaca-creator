// Ruido de valor 3D con semilla, y su versión "en cilindro": periódica en x con período C,
// para que las texturas empalmen en las costuras de una vuelta (cuerpo, manga).

function hash3(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(z, 0x9e3779b1) ^ Math.imul(seed, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function valueNoise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/**
 * fBm en un cilindro: x (cm) da la vuelta con período `circ`, y (cm) es la altura.
 * `feature` es el tamaño típico de las manchas en cm. Devuelve ~0..1.
 */
export function cylinderFbm(xCm: number, yCm: number, circ: number, feature: number, seed: number, octaves = 3) {
  const radius = circ / (2 * Math.PI);
  const a = (xCm / circ) * Math.PI * 2;
  let px = (Math.cos(a) * radius) / feature;
  let pz = (Math.sin(a) * radius) / feature;
  let py = yCm / feature;
  let sum = 0, amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(px, py, pz, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    px *= 2.03;
    py *= 2.03;
    pz *= 2.03;
  }
  return sum / norm;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
