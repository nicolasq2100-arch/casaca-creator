import * as THREE from "three";

// Índice UV → superficie 3D de una malla: dado un punto del UV, encuentra el triángulo que lo contiene
// y devuelve la posición y la normal en el mundo. Sirve para ubicar las asas de una capa sobre la tela.

const GRID = 48;

export class UvIndex {
  private uvs: Float32Array;
  private pos: Float32Array;
  private nor: Float32Array;
  private tris: Uint32Array;
  private cells: number[][];
  private u0 = Infinity;
  private v0 = Infinity;
  private du = 1;
  private dv = 1;

  constructor(private mesh: THREE.Mesh) {
    const g = mesh.geometry;
    const uv = g.getAttribute("uv");
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const count = uv.count;
    this.uvs = new Float32Array(count * 2);
    this.pos = new Float32Array(count * 3);
    this.nor = new Float32Array(count * 3);
    let u1 = -Infinity, v1 = -Infinity;
    for (let i = 0; i < count; i++) {
      // getX/getY desnormalizan los atributos cuantizados (KHR_mesh_quantization).
      const u = uv.getX(i), v = uv.getY(i);
      this.uvs[i * 2] = u;
      this.uvs[i * 2 + 1] = v;
      this.u0 = Math.min(this.u0, u); u1 = Math.max(u1, u);
      this.v0 = Math.min(this.v0, v); v1 = Math.max(v1, v);
      this.pos.set([p.getX(i), p.getY(i), p.getZ(i)], i * 3);
      this.nor.set([n.getX(i), n.getY(i), n.getZ(i)], i * 3);
    }
    this.du = (u1 - this.u0) / GRID || 1;
    this.dv = (v1 - this.v0) / GRID || 1;
    const index = g.getIndex();
    this.tris = index ? new Uint32Array(index.array) : Uint32Array.from({ length: count }, (_, i) => i);
    this.cells = Array.from({ length: GRID * GRID }, () => []);
    for (let t = 0; t < this.tris.length; t += 3) {
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      for (let k = 0; k < 3; k++) {
        const vi = this.tris[t + k]!;
        a = Math.min(a, this.uvs[vi * 2]!); b = Math.max(b, this.uvs[vi * 2]!);
        c = Math.min(c, this.uvs[vi * 2 + 1]!); d = Math.max(d, this.uvs[vi * 2 + 1]!);
      }
      const ia = this.cellX(a), ib = this.cellX(b), ic = this.cellY(c), id = this.cellY(d);
      for (let y = ic; y <= id; y++) for (let x = ia; x <= ib; x++) this.cells[y * GRID + x]!.push(t);
    }
  }

  private cellX(u: number) {
    return Math.min(GRID - 1, Math.max(0, Math.floor((u - this.u0) / this.du)));
  }
  private cellY(v: number) {
    return Math.min(GRID - 1, Math.max(0, Math.floor((v - this.v0) / this.dv)));
  }

  /** Posición y normal (en el mundo) del punto UV, o null si cae fuera de la pieza. */
  locate(u: number, v: number, outPos: THREE.Vector3, outNormal: THREE.Vector3): boolean {
    if (u < this.u0 || v < this.v0) return false;
    const list = this.cells[this.cellY(v) * GRID + this.cellX(u)];
    if (!list) return false;
    const U = this.uvs, T = this.tris;
    for (const t of list) {
      const a = T[t]!, b = T[t + 1]!, c = T[t + 2]!;
      const ax = U[a * 2]!, ay = U[a * 2 + 1]!, bx = U[b * 2]!, by = U[b * 2 + 1]!, cx = U[c * 2]!, cy = U[c * 2 + 1]!;
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-14) continue;
      const w0 = ((by - cy) * (u - cx) + (cx - bx) * (v - cy)) / den;
      const w1 = ((cy - ay) * (u - cx) + (ax - cx) * (v - cy)) / den;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
      const P = this.pos, N = this.nor;
      outPos.set(
        w0 * P[a * 3]! + w1 * P[b * 3]! + w2 * P[c * 3]!,
        w0 * P[a * 3 + 1]! + w1 * P[b * 3 + 1]! + w2 * P[c * 3 + 1]!,
        w0 * P[a * 3 + 2]! + w1 * P[b * 3 + 2]! + w2 * P[c * 3 + 2]!,
      );
      outNormal.set(
        w0 * N[a * 3]! + w1 * N[b * 3]! + w2 * N[c * 3]!,
        w0 * N[a * 3 + 1]! + w1 * N[b * 3 + 1]! + w2 * N[c * 3 + 1]!,
        w0 * N[a * 3 + 2]! + w1 * N[b * 3 + 2]! + w2 * N[c * 3 + 2]!,
      );
      this.mesh.updateWorldMatrix(true, false);
      outPos.applyMatrix4(this.mesh.matrixWorld);
      outNormal.transformDirection(this.mesh.matrixWorld);
      return true;
    }
    return false;
  }
}
