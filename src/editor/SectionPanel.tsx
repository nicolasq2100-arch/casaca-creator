"use client";

import type { GarmentConfig } from "@/garments/garment.config";
import { SECTIONS, useEditorUi } from "./uiStore";
import { SectionContent } from "./SectionContent";

/** Escritorio: el contenido de la sección elegida, en un panel a la izquierda de la escena. */
export function SectionPanel({ garment }: { garment: GarmentConfig }) {
  const active = useEditorUi((s) => s.activeSection);
  const section = SECTIONS.find((s) => s.id === active)!;
  return (
    <section
      id="section-panel"
      role="tabpanel"
      aria-labelledby={`tab-toolbar-${active}`}
      className="section-panel"
    >
      <h2 className="panel-title">{section.label}</h2>
      <div className="section-panel-body">
        <SectionContent id={active} garment={garment} />
      </div>
    </section>
  );
}
