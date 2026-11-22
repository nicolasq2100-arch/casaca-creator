import { create } from "zustand";
import { garments, jerseyPlayer, type GarmentConfig } from "@/garments/garment.config";
import { isHex } from "@/palette/colorMath";
import { DESIGN_VERSION, type DesignState } from "./types";

const HISTORY_LIMIT = 100;

export function createDefaultDesign(garment: GarmentConfig = jerseyPlayer): DesignState {
  return {
    version: DESIGN_VERSION,
    garmentId: garment.id,
    colors: Object.fromEntries(garment.colorZones.map((z) => [z.id, z.defaultHex])),
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
    const raw = { ...(r.colors as Record<string, unknown>) };
    // Migración: la zona "body" (Cuerpo) se separó en Frente y Espalda.
    if (isHex(raw.body)) {
      raw.front ??= raw.body;
      raw.back ??= raw.body;
    }
    for (const zone of garment.colorZones) {
      const v = raw[zone.id];
      if (isHex(v)) colors[zone.id] = v;
    }
  }
  return { ...base, colors };
}

export type ChangeKind = "color" | "history" | "load";

interface DesignStore {
  design: DesignState;
  past: DesignState[];
  future: DesignState[];
  /** Qué produjo el último cambio (la escena anima solo los cambios de color). */
  lastChange: { kind: ChangeKind; nonce: number };
  /** Se cargó el borrador local (o se confirmó que no hay). */
  hydrated: boolean;
  setZoneColor: (zoneId: string, hex: string) => void;
  undo: () => void;
  redo: () => void;
  hydrate: (design: DesignState | null) => void;
}

const bump = (kind: ChangeKind, prev: { nonce: number }) => ({ kind, nonce: prev.nonce + 1 });

export const useDesignStore = create<DesignStore>()((set, get) => ({
  design: createDefaultDesign(),
  past: [],
  future: [],
  lastChange: { kind: "load", nonce: 0 },
  hydrated: false,

  setZoneColor: (zoneId, hex) => {
    const { design, past, lastChange } = get();
    if (design.colors[zoneId] === hex) return;
    set({
      design: { ...design, colors: { ...design.colors, [zoneId]: hex } },
      past: [...past, design].slice(-HISTORY_LIMIT),
      future: [],
      lastChange: bump("color", lastChange),
    });
  },

  undo: () => {
    const { design, past, future, lastChange } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ design: prev, past: past.slice(0, -1), future: [design, ...future], lastChange: bump("history", lastChange) });
  },

  redo: () => {
    const { design, past, future, lastChange } = get();
    const next = future[0];
    if (!next) return;
    set({ design: next, past: [...past, design], future: future.slice(1), lastChange: bump("history", lastChange) });
  },

  hydrate: (loaded) => {
    const { lastChange } = get();
    set({
      ...(loaded ? { design: loaded } : {}),
      hydrated: true,
      lastChange: bump("load", lastChange),
    });
  },
}));
