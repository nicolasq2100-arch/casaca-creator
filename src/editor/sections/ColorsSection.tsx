"use client";

import type { ColorZone, GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { colorLabel } from "@/palette/colorMath";
import { useEditorUi } from "@/editor/uiStore";
import { ChevronRightIcon } from "@/editor/icons";
import { ColorPicker, Swatch, usedDesignColors } from "@/editor/ColorPicker";

export function ColorsSection({ garment }: { garment: GarmentConfig }) {
  const zoneId = useEditorUi((s) => s.colorZone);
  const zone = garment.colorZones.find((z) => z.id === zoneId);
  return zone ? <ZonePicker garment={garment} zone={zone} /> : <ZoneList garment={garment} />;
}

function ZoneList({ garment }: { garment: GarmentConfig }) {
  const colors = useDesignStore((s) => s.design.colors);
  const hydrated = useDesignStore((s) => s.hydrated);
  const openColorZone = useEditorUi((s) => s.openColorZone);

  return (
    <ul className="divide-y divide-line border-y border-line" aria-busy={!hydrated}>
      {garment.colorZones.map((zone) => {
        const hex = colors[zone.id] ?? zone.defaultHex;
        return (
          <li key={zone.id}>
            <button type="button" className="zone-row" onClick={() => openColorZone(zone.id)}>
              <Swatch hex={hex} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[0.8125rem] font-semibold text-ink-2">{zone.label}</span>
                <span className="block truncate text-[0.9375rem] text-ink">{colorLabel(hex)}</span>
              </span>
              <span className="hex">{hex}</span>
              <ChevronRightIcon className="shrink-0 text-ink-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ZonePicker({ garment, zone }: { garment: GarmentConfig; zone: ColorZone }) {
  const colors = useDesignStore((s) => s.design.colors);
  const channels = useDesignStore((s) => s.design.graphic?.channels);
  const setZoneColor = useDesignStore((s) => s.setZoneColor);
  const openColorZone = useEditorUi((s) => s.openColorZone);
  return (
    <ColorPicker
      title={zone.label}
      backLabel="Zonas"
      onBack={() => openColorZone(null)}
      current={colors[zone.id] ?? zone.defaultHex}
      usedColors={usedDesignColors(colors, garment.colorZones.map((z) => z.id), channels)}
      onApply={(hex) => setZoneColor(zone.id, hex)}
    />
  );
}
