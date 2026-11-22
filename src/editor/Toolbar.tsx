"use client";

import { SectionTabs } from "./SectionTabs";
import { UndoRedo, ViewSwitch } from "./SceneOverlay";
import { useEditorUi } from "./uiStore";

/** Escritorio: deshacer/rehacer · pestañas de sección · vistas de la camiseta. */
export function Toolbar() {
  const setSection = useEditorUi((s) => s.setSection);
  return (
    <div className="toolbar" role="toolbar" aria-label="Herramientas del editor">
      <UndoRedo />
      <SectionTabs variant="toolbar" panelId="section-panel" onSelect={setSection} />
      <ViewSwitch />
    </div>
  );
}
