"use client";

import type { GarmentConfig } from "@/garments/garment.config";
import type { SectionId } from "./uiStore";
import { ColorsSection } from "./sections/ColorsSection";
import { GraphicsSection } from "./sections/GraphicsSection";
import { LayersSection } from "./sections/LayersSection";
import { NamesSection } from "./sections/NamesSection";
import { TemplatesSection } from "./sections/TemplatesSection";

export function SectionContent({ id, garment }: { id: SectionId; garment: GarmentConfig }) {
  if (id === "colors") return <ColorsSection garment={garment} />;
  if (id === "graphics") return <GraphicsSection garment={garment} />;
  if (id === "layers") return <LayersSection garment={garment} />;
  if (id === "names") return <NamesSection garment={garment} />;
  return <TemplatesSection garment={garment} />;
}
