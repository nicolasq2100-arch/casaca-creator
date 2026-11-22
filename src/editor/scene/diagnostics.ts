import { create } from "zustand";

// Diagnóstico de la escena 3D. Se junta siempre (es barato); el panel solo se ve con ?debug=1.
// Sirve para depurar en celulares sin consola (iPhone sin Mac) y para decidir cuándo mostrar el error.

export type AssetStatus = "pendiente" | "ok" | "error";
export type AssetId = "glb" | "hdr" | "knit";

export interface GlInfo {
  webgl2: boolean;
  renderer: string;
  vendor: string;
  maxTextureSize: number;
  halfFloatTarget: boolean;
  floatTarget: boolean;
  floatLinear: boolean;
  maxSamplers: number;
}

export interface SceneDiag {
  debug: boolean;
  startedAt: number;
  gl: GlInfo | null;
  assets: Record<AssetId, { status: AssetStatus; ms?: number; detail?: string }>;
  /** "hdr" con el HDRI calibrado, o "respaldo" con luces simples si el HDRI no se puede usar. */
  envMode: "hdr" | "respaldo";
  designTextureSize: number | null;
  canvas: { css: [number, number]; buffer: [number, number]; dpr: number } | null;
  frames: number;
  lastRender: { calls: number; triangles: number; programs: number; textures: number } | null;
  /** Resultado de leer los píxeles del centro de la escena: ¿se dibujó la camiseta? */
  drawn: { state: "sin medir" | "sí" | "no"; sample?: string };
  contextLost: boolean;
  errors: string[];
  /** Si no es null, la escena no puede mostrarse y se muestra el mensaje de error. */
  fatal: string | null;
}

interface DiagStore extends SceneDiag {
  logError: (msg: string) => void;
  setAsset: (id: AssetId, status: AssetStatus, detail?: string) => void;
  setFatal: (reason: string) => void;
  patch: (p: Partial<SceneDiag>) => void;
}

export const isDebug = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";

export const useSceneDiag = create<DiagStore>()((set, get) => ({
  // Se decide al montar (DiagnosticsPanel): leerlo acá rompería la hidratación (el servidor no ve la URL).
  debug: false,
  startedAt: typeof performance !== "undefined" ? performance.now() : 0,
  gl: null,
  assets: { glb: { status: "pendiente" }, hdr: { status: "pendiente" }, knit: { status: "pendiente" } },
  envMode: "hdr",
  designTextureSize: null,
  canvas: null,
  frames: 0,
  lastRender: null,
  drawn: { state: "sin medir" },
  contextLost: false,
  errors: [],
  fatal: null,
  logError: (msg) => set({ errors: [...get().errors, msg.slice(0, 600)].slice(-20) }),
  setAsset: (id, status, detail) => {
    if (get().assets[id].status === status && !detail) return;
    const ms = Math.round(performance.now() - get().startedAt);
    set({ assets: { ...get().assets, [id]: { status, ms, detail } } });
  },
  setFatal: (reason) => {
    if (get().fatal) return;
    get().logError(`FATAL: ${reason}`);
    set({ fatal: reason });
  },
  patch: (p) => set(p),
}));

/** Marca como error el asset cuya URL aparece en el mensaje (los loaders dicen "Could not load <url>"). */
export function attributeLoadError(message: string) {
  const { setAsset } = useSceneDiag.getState();
  if (/\.glb/i.test(message)) setAsset("glb", "error", message);
  else if (/\.hdr/i.test(message)) setAsset("hdr", "error", message);
  else if (/knit|\.jpg/i.test(message)) setAsset("knit", "error", message);
}

// Errores globales: se registran una sola vez, del lado del cliente.
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    useSceneDiag.getState().logError(`error: ${e.message}${e.filename ? ` (${e.filename.split("/").pop()}:${e.lineno})` : ""}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | undefined;
    useSceneDiag.getState().logError(`promesa rechazada: ${r?.message ?? String(e.reason)}`);
  });
}

/** Texto plano para copiar y pegar (sin Mac no hay consola en el iPhone). */
export function diagnosticsText(d: SceneDiag): string {
  const lines = [
    `Casaca Creator — diagnóstico 3D`,
    `Navegador: ${navigator.userAgent}`,
    `Pantalla: ${window.innerWidth}×${window.innerHeight} css · visual ${Math.round(window.visualViewport?.width ?? 0)}×${Math.round(window.visualViewport?.height ?? 0)} · dpr ${window.devicePixelRatio}`,
    `WebGL: ${d.gl ? `${d.gl.webgl2 ? "WebGL2" : "sin WebGL2"} · ${d.gl.renderer} (${d.gl.vendor}) · tex máx ${d.gl.maxTextureSize} · samplers ${d.gl.maxSamplers} · RT half-float ${d.gl.halfFloatTarget ? "sí" : "no"} · RT float ${d.gl.floatTarget ? "sí" : "no"} · float lineal ${d.gl.floatLinear ? "sí" : "no"}` : "sin datos"}`,
    `Canvas: ${d.canvas ? `${d.canvas.css.join("×")} css · buffer ${d.canvas.buffer.join("×")} · dpr ${d.canvas.dpr}` : "sin datos"}`,
    ...(["glb", "hdr", "knit"] as AssetId[]).map((id) => {
      const a = d.assets[id];
      const name = id === "glb" ? "Modelo GLB" : id === "hdr" ? "HDRI" : "Trama";
      return `${name}: ${a.status}${a.ms !== undefined ? ` (${(a.ms / 1000).toFixed(1)} s)` : ""}${a.detail ? ` — ${a.detail}` : ""}`;
    }),
    `Entorno: ${d.envMode === "hdr" ? "HDRI calibrado" : "luces de respaldo"} · textura de diseño ${d.designTextureSize ?? "?"} px`,
    `Cuadros: ${d.frames} · último: ${d.lastRender ? `${d.lastRender.calls} draw calls, ${d.lastRender.triangles} triángulos, ${d.lastRender.programs} programas, ${d.lastRender.textures} texturas` : "—"}`,
    `¿Se dibujó la camiseta?: ${d.drawn.state}${d.drawn.sample ? ` (centro ${d.drawn.sample})` : ""}`,
    `Contexto WebGL perdido: ${d.contextLost ? "sí" : "no"}`,
    `Estado: ${d.fatal ? `ERROR — ${d.fatal}` : "ok"}`,
    `Errores (${d.errors.length}):`,
    ...d.errors.map((e) => `  · ${e}`),
  ];
  return lines.join("\n");
}
