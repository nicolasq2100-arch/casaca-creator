import { create } from "zustand";
import { garments, jerseyPlayer, type GarmentConfig } from "@/garments/garment.config";
import { isHex } from "@/palette/colorMath";
import { patternsById } from "@/patterns/registry";
import { DESIGN_VERSION, type DesignState, type GraphicState, type Layer } from "./types";
import { DEFAULT_FONT, textFontsById } from "@/layers/fonts";

const HISTORY_LIMIT = 100;

export function createDefaultDesign(garment: GarmentConfig = jerseyPlayer): DesignState {
  return {
    version: DESIGN_VERSION,
    garmentId: garment.id,
    colors: Object.fromEntries(garment.colorZones.map((z) => [z.id, z.defaultHex])),
    graphic: null,
    layers: [],
  };
}

/** Gráfico con los valores por defecto del registro. */
export function createGraphic(id: string): GraphicState | null {
  const def = patternsById[id];
  if (!def) return null;
  return {
    id,
    channels: def.channels.map((c) => c.defaultHex),
    zones: [...def.defaultZones],
    scaleCm: def.scale.default,
    angleDeg: def.angle?.default ?? 0,
    variant: 1,
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const newLayerId = () => `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function sanitizeGraphic(raw: unknown, garment: GarmentConfig): GraphicState | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<GraphicState>;
  if (typeof g.id !== "string") return null;
  const def = patternsById[g.id];
  const base = createGraphic(g.id);
  if (!def || !base) return null;
  const zoneIds = new Set(garment.colorZones.map((z) => z.id));
  const channels = base.channels.map((d, i) => (Array.isArray(g.channels) && isHex(g.channels[i]) ? (g.channels[i] as string) : d));
  const zones = Array.isArray(g.zones) ? g.zones.filter((z): z is string => typeof z === "string" && zoneIds.has(z)) : base.zones;
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  return {
    id: g.id,
    channels,
    zones: zones.length ? zones : base.zones,
    scaleCm: clamp(num(g.scaleCm, base.scaleCm), def.scale.min, def.scale.max),
    angleDeg: def.angle ? clamp(num(g.angleDeg, base.angleDeg), def.angle.min, def.angle.max) : 0,
    variant: clamp(Math.round(num(g.variant, 1)), 1, def.variants ?? 1),
  };
}

export const MAX_LAYERS = 20;
export const MAX_TEXT_LENGTH = 40;

function sanitizeLayers(raw: unknown, garment: GarmentConfig): Layer[] {
  if (!Array.isArray(raw)) return [];
  const out: Layer[] = [];
  for (const item of raw.slice(0, MAX_LAYERS)) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, unknown>;
    const num = (v: unknown, f: number) => (typeof v === "number" && Number.isFinite(v) ? v : f);
    if (typeof l.id !== "string" || typeof l.piece !== "string" || !(l.piece in garment.pieces)) continue;
    const base = {
      id: l.id,
      name: typeof l.name === "string" ? l.name.slice(0, 60) : "Capa",
      piece: l.piece,
      xCm: num(l.xCm, 0),
      yCm: num(l.yCm, 0),
      sizeCm: clamp(num(l.sizeCm, 8), 0.5, 80),
      rotationDeg: num(l.rotationDeg, 0),
      hidden: l.hidden === true,
    };
    if (l.kind === "image" && typeof l.assetId === "string") {
      const rb = (l.removeBg ?? {}) as Record<string, unknown>;
      out.push({
        ...base,
        kind: "image",
        role: l.role === "crest" ? "crest" : undefined,
        assetId: l.assetId,
        aspect: clamp(num(l.aspect, 1), 0.05, 20),
        removeBg: {
          enabled: rb.enabled === true,
          color: isHex(rb.color) ? rb.color : "#FFFFFF",
          tolerance: clamp(num(rb.tolerance, 20), 0, 100),
        },
      });
    } else if (l.kind === "text") {
      const o = (l.outline ?? {}) as Record<string, unknown>;
      out.push({
        ...base,
        kind: "text",
        text: typeof l.text === "string" ? l.text.slice(0, MAX_TEXT_LENGTH) : "",
        fontId: typeof l.fontId === "string" && textFontsById[l.fontId] ? l.fontId : DEFAULT_FONT,
        color: isHex(l.color) ? l.color : "#14213D",
        outline: { color: isHex(o.color) ? o.color : "#F7F7F5", widthCm: clamp(num(o.widthCm, 0), 0, 2) },
      });
    }
  }
  return out;
}

/** Valida un diseño que viene de afuera (borrador local). Completa lo que falte con los valores por defecto. */
export function sanitizeDesign(raw: unknown): DesignState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DesignState>;
  if (r.version !== DESIGN_VERSION || typeof r.garmentId !== "string") return null;
  const garment = garments[r.garmentId];
  if (!garment) return null;
  const base = createDefaultDesign(garment);
  const colors = { ...base.colors };
  if (r.colors && typeof r.colors === "object") {
    const rawColors = { ...(r.colors as Record<string, unknown>) };
    // Migración: la zona "body" (Cuerpo) se separó en Frente y Espalda.
    if (isHex(rawColors.body)) {
      rawColors.front ??= rawColors.body;
      rawColors.back ??= rawColors.body;
    }
    for (const zone of garment.colorZones) {
      const v = rawColors[zone.id];
      if (isHex(v)) colors[zone.id] = v;
    }
  }
  return { ...base, colors, graphic: sanitizeGraphic(r.graphic, garment), layers: sanitizeLayers(r.layers, garment) };
}

/**
 * Qué produjo el último cambio. La escena anima el teñido solo en cambios discretos ("color", "graphic"),
 * no mientras se arrastra un slider ("live").
 */
export type ChangeKind = "color" | "graphic" | "layer" | "live" | "history" | "load";

interface DesignStore {
  design: DesignState;
  past: DesignState[];
  future: DesignState[];
  lastChange: { kind: ChangeKind; nonce: number };
  /** Diseño al empezar un gesto continuo (slider): al soltar se guarda un solo paso en el historial. */
  gestureBase: DesignState | null;
  /** Se cargó el borrador local (o se confirmó que no hay). */
  hydrated: boolean;
  setZoneColor: (zoneId: string, hex: string) => void;
  /** Elige un gráfico (null = sin gráfico). */
  selectGraphic: (id: string | null) => void;
  /** Cambia parámetros del gráfico. "live" no guarda historial (slider en movimiento); "commit" sí. */
  updateGraphic: (patch: Partial<GraphicState>, mode?: "live" | "commit") => void;
  /** Cierra un gesto continuo: guarda un paso en el historial si algo cambió. */
  commitGesture: () => void;
  /** Suma una capa arriba de todo, o en `index` (0 = la de más abajo). */
  addLayer: (layer: Layer, index?: number) => void;
  /** Cambia una capa. "live" no guarda historial (arrastre, slider); "commit" sí. */
  updateLayer: (id: string, patch: Partial<Layer>, mode?: "live" | "commit") => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => string | null;
  /** Mueve la capa en el orden: +1 = más arriba (adelante), -1 = más abajo. */
  moveLayer: (id: string, delta: 1 | -1) => void;
  undo: () => void;
  redo: () => void;
  hydrate: (design: DesignState | null) => void;
}

const bump = (kind: ChangeKind, prev: { nonce: number }) => ({ kind, nonce: prev.nonce + 1 });

export const useDesignStore = create<DesignStore>()((set, get) => {
  /** Aplica un diseño nuevo como un paso del historial. */
  const commit = (next: DesignState, kind: ChangeKind) => {
    const { design, past, lastChange, gestureBase } = get();
    const before = gestureBase ?? design;
    set({
      design: next,
      past: [...past, before].slice(-HISTORY_LIMIT),
      future: [],
      gestureBase: null,
      lastChange: bump(kind, lastChange),
    });
  };

  return {
    design: createDefaultDesign(),
    past: [],
    future: [],
    lastChange: { kind: "load", nonce: 0 },
    gestureBase: null,
    hydrated: false,

    setZoneColor: (zoneId, hex) => {
      const { design } = get();
      if (design.colors[zoneId] === hex) return;
      commit({ ...design, colors: { ...design.colors, [zoneId]: hex } }, "color");
    },

    selectGraphic: (id) => {
      const { design } = get();
      if ((design.graphic?.id ?? null) === id) return;
      // Cada gráfico arranca con SUS zonas por defecto (el panel lateral incluye el bajo, las texturas las mangas).
      commit({ ...design, graphic: id ? createGraphic(id) : null }, "graphic");
    },

    updateGraphic: (patch, mode = "commit") => {
      const { design, gestureBase, lastChange } = get();
      if (!design.graphic) return;
      const next = { ...design, graphic: { ...design.graphic, ...patch } };
      if (mode === "live") {
        set({ design: next, gestureBase: gestureBase ?? design, lastChange: bump("live", lastChange) });
      } else {
        commit(next, "graphic");
      }
    },

    commitGesture: () => {
      const { gestureBase, design, past, lastChange } = get();
      if (!gestureBase) return;
      if (gestureBase === design) return set({ gestureBase: null });
      set({ past: [...past, gestureBase].slice(-HISTORY_LIMIT), future: [], gestureBase: null, lastChange: bump("live", lastChange) });
    },

    addLayer: (layer, index) => {
      const { design } = get();
      if (design.layers.length >= MAX_LAYERS) return;
      const layers = [...design.layers];
      layers.splice(index ?? layers.length, 0, layer);
      commit({ ...design, layers }, "layer");
    },

    updateLayer: (id, patch, mode = "commit") => {
      const { design, gestureBase, lastChange } = get();
      const layers = design.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l));
      const next = { ...design, layers };
      if (mode === "live") {
        set({ design: next, gestureBase: gestureBase ?? design, lastChange: bump("live", lastChange) });
      } else {
        commit(next, "layer");
      }
    },

    removeLayer: (id) => {
      const { design } = get();
      commit({ ...design, layers: design.layers.filter((l) => l.id !== id) }, "layer");
    },

    duplicateLayer: (id) => {
      const { design } = get();
      const i = design.layers.findIndex((l) => l.id === id);
      const src = design.layers[i];
      if (!src || design.layers.length >= MAX_LAYERS) return null;
      const copy = { ...src, id: newLayerId(), name: `${src.name} (copia)`, xCm: src.xCm + 2, yCm: src.yCm + 2 } as Layer;
      if (copy.kind === "image") delete copy.role;
      const layers = [...design.layers];
      layers.splice(i + 1, 0, copy);
      commit({ ...design, layers }, "layer");
      return copy.id;
    },

    moveLayer: (id, delta) => {
      const { design } = get();
      const i = design.layers.findIndex((l) => l.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= design.layers.length) return;
      const layers = [...design.layers];
      [layers[i], layers[j]] = [layers[j]!, layers[i]!];
      commit({ ...design, layers }, "layer");
    },

    undo: () => {
      const { design, past, future, lastChange } = get();
      const prev = past[past.length - 1];
      if (!prev) return;
      set({ design: prev, past: past.slice(0, -1), future: [design, ...future], gestureBase: null, lastChange: bump("history", lastChange) });
    },

    redo: () => {
      const { design, past, future, lastChange } = get();
      const next = future[0];
      if (!next) return;
      set({ design: next, past: [...past, design], future: future.slice(1), gestureBase: null, lastChange: bump("history", lastChange) });
    },

    hydrate: (loaded) => {
      const { lastChange } = get();
      set({
        ...(loaded ? { design: loaded } : {}),
        hydrated: true,
        lastChange: bump("load", lastChange),
      });
    },
  };
});
