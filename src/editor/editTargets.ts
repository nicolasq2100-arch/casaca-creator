import type { Layer } from "@/design/types";
import { useDesignStore } from "@/design/store";
import { nameNumberLayers, slotFromLayerId, slotLayerId } from "@/layers/nameNumber";
import { useEditorUi } from "./uiStore";

// Qué se puede tocar y mover sobre el 3D según la sección abierta: las capas (Capas) o el nombre y
// número de muestra (Nombre). Lo usan LayerManipulator (arrastrar) y LayerHandles (escalar / rotar).

type Patch = Partial<Pick<Layer, "xCm" | "yCm" | "sizeCm" | "rotationDeg">>;

export interface EditTarget {
  /** De abajo hacia arriba. */
  layers: Layer[];
  selectedId: string | null;
  canRotate: boolean;
  select: (id: string) => void;
  update: (id: string, patch: Patch, mode: "live" | "commit") => void;
}

export function currentEditTarget(): EditTarget | null {
  const ui = useEditorUi.getState();
  const store = useDesignStore.getState();
  if (ui.activeSection === "layers") {
    return {
      layers: store.design.layers,
      selectedId: ui.layersView.mode === "layer" ? ui.layersView.id : null,
      canRotate: true,
      select: (id) => useEditorUi.getState().setLayersView({ mode: "layer", id }),
      update: (id, patch, mode) => store.updateLayer(id, patch, mode),
    };
  }
  if (ui.activeSection === "names") {
    return {
      layers: nameNumberLayers(store.design.nameNumber),
      selectedId: ui.nameSlot ? slotLayerId(ui.nameSlot) : null,
      canRotate: false,
      select: (id) => {
        const slot = slotFromLayerId(id);
        if (slot) useEditorUi.getState().setNameSlot(slot);
      },
      update: (id, patch, mode) => {
        const slot = slotFromLayerId(id);
        if (!slot) return;
        const { xCm, yCm, sizeCm } = patch;
        const clean = Object.fromEntries(Object.entries({ xCm, yCm, sizeCm }).filter(([, v]) => v !== undefined));
        store.updateNameSlot(slot, clean, mode);
      },
    };
  }
  return null;
}

/** Hay algo elegido para mostrar sus asas. */
export const useHasEditSelection = () =>
  useEditorUi((s) => (s.activeSection === "layers" && s.layersView.mode === "layer") || (s.activeSection === "names" && s.nameSlot !== null));
