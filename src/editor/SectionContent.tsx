"use client";

import type { GarmentConfig } from "@/garments/garment.config";
import { SECTIONS, type SectionId } from "./uiStore";
import { ColorsSection } from "./sections/ColorsSection";
import { PendingSection } from "./sections/PendingSection";

export function SectionContent({ id, garment }: { id: SectionId; garment: GarmentConfig }) {
  if (id === "colors") return <ColorsSection garment={garment} />;
  const section = SECTIONS.find((s) => s.id === id);
  return <PendingSection id={id} stage={section?.stage ?? 0} />;
}
