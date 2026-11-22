import { create } from "zustand";

export type SectionId = "template" | "colors" | "graphics" | "layers" | "names";
export type SheetDetent = "compact" | "medium" | "tall";
export type CameraView = "front" | "back" | "side";

export const SECTIONS: { id: SectionId; num: string; label: string; short: string; stage: number }[] = [
  { id: "template", num: "01", label: "Plantilla", short: "Plantilla", stage: 5 },
  { id: "colors", num: "02", label: "Colores", short: "Colores", stage: 1 },
  { id: "graphics", num: "03", label: "Gráficos", short: "Gráficos", stage: 2 },
  { id: "layers", num: "04", label: "Capas", short: "Capas", stage: 3 },
  { id: "names", num: "05", label: "Nombre y número", short: "Nombre", stage: 4 },
];

interface EditorUi {
  activeSection: SectionId;
  /** Zona abierta en 02 Colores (null = lista de zonas). */
  colorZone: string | null;
  sheetDetent: SheetDetent;
  guides: boolean;
  /** Marca una zona en el 3D por un instante. */
  highlight: { zoneId: string; nonce: number } | null;
  viewRequest: { view: CameraView; nonce: number } | null;
  /** Vista más cercana a la cámara actual (null si está entre medio). */
  currentView: CameraView | null;
  setSection: (id: SectionId) => void;
  openColorZone: (zoneId: string | null) => void;
  setSheetDetent: (d: SheetDetent) => void;
  toggleGuides: () => void;
  requestView: (view: CameraView) => void;
  setCurrentView: (view: CameraView | null) => void;
}

export const useEditorUi = create<EditorUi>()((set, get) => ({
  activeSection: "colors",
  colorZone: null,
  sheetDetent: "medium",
  guides: false,
  highlight: null,
  viewRequest: null,
  currentView: "front",
  setSection: (id) => set({ activeSection: id }),
  openColorZone: (zoneId) =>
    set({
      colorZone: zoneId,
      highlight: zoneId ? { zoneId, nonce: (get().highlight?.nonce ?? 0) + 1 } : get().highlight,
    }),
  setSheetDetent: (d) => set({ sheetDetent: d }),
  toggleGuides: () => set({ guides: !get().guides }),
  requestView: (view) => set({ viewRequest: { view, nonce: (get().viewRequest?.nonce ?? 0) + 1 } }),
  setCurrentView: (view) => {
    if (get().currentView !== view) set({ currentView: view });
  },
}));
