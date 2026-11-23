"use client";

import type { GarmentConfig } from "@/garments/garment.config";
import { SECTIONS, type SectionId } from "./uiStore";
import { ColorsSection } from "./sections/ColorsSection";
import { GraphicsSection } from "./sections/GraphicsSection";
import { LayersSection } from "./sections/LayersSection";
import { NamesSection } from "./sections/NamesSection";
import { PendingSection } from "./sections/PendingSection";

export function SectionContent({ id, garment }: { id: SectionId; garment: GarmentConfig }) {
  if (id === "colors") return <ColorsSection garment={garment} />;
  if (id === "graphics") return <GraphicsSection garment={garment} />;
  if (id === "layers") return <LayersSection garment={garment} />;
  if (id === "names") return <NamesSection garment={garment} />;
  const section = SECTIONS.find((s) => s.id === id);
  return <PendingSection id={id} stage={section?.stage ?? 0} />;
}
