import type { NameNumberSlotId } from "@/garments/garment.config";
import type { NameNumberState, TextLayer } from "@/design/types";

// El nombre y número se dibujan y se manipulan como capas de texto "virtuales" (no están en la lista de Capas).

export const NAME_SLOTS: NameNumberSlotId[] = ["name", "number", "frontNumber"];
const PREFIX = "nn:";

export const slotLayerId = (slot: NameNumberSlotId) => `${PREFIX}${slot}`;
export function slotFromLayerId(id: string): NameNumberSlotId | null {
  const s = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : "";
  return (NAME_SLOTS as string[]).includes(s) ? (s as NameNumberSlotId) : null;
}

/** Capa de texto de un lugar (aunque esté apagado). */
export function slotLayer(nn: NameNumberState, slot: NameNumberSlotId): TextLayer {
  const s = nn.slots[slot];
  return {
    id: slotLayerId(slot),
    kind: "text",
    name: slot === "name" ? "Nombre" : "Número",
    piece: s.piece,
    xCm: s.xCm,
    yCm: s.yCm,
    sizeCm: s.sizeCm,
    rotationDeg: 0,
    hidden: !s.enabled,
    text: slot === "name" ? nn.name : nn.number,
    fontId: nn.fontId,
    color: nn.color,
    outline: nn.outline,
  };
}

/** Lugares encendidos y con texto, listos para dibujar o tocar. */
export function nameNumberLayers(nn: NameNumberState): TextLayer[] {
  return NAME_SLOTS.map((slot) => slotLayer(nn, slot)).filter((l) => !l.hidden && l.text.trim() !== "");
}
