import { create } from "zustand";
import { garments, jerseyPlayer, type GarmentConfig } from "@/garments/garment.config";
import { isHex } from "@/palette/colorMath";
import { patternsById } from "@/patterns/registry";
import { DESIGN_VERSION, type DesignState, type GraphicState } from "./types";

const HISTORY_LIMIT = 100;

export function createDefaultDesign(garment: GarmentConfig = jerseyPlayer): DesignState {
  return {
    version: DESIGN_VERSION,
    garmentId: garment.id,
    colors: Object.fromEntries(garment.colorZones.map((z) => [z.id, z.defaultHex])),
    graphic: null,
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
  return { ...base, colors, graphic: sanitizeGraphic(r.graphic, garment) };
}

/**
 * Qué produjo el último cambio. La escena anima el teñido solo en cambios discretos ("color", "graphic"),
 * no mientras se arrastra un slider ("live").
 */
export type ChangeKind = "color" | "graphic" | "live" | "history" | "load";

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
