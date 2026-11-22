"use client";

import { useId, useState } from "react";
import type { ColorZone, GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { fabricPalette } from "@/palette/fabricPalette";
import { colorLabel, describeColor, normalizeHex, relativeLuminance } from "@/palette/colorMath";
import { useEditorUi } from "@/editor/uiStore";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/editor/icons";

function Swatch({ hex, size = "md" }: { hex: string; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return <span className={`swatch ${cls}`} style={{ backgroundColor: hex }} aria-hidden="true" />;
}

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
                <span className="block text-[0.8125rem] font-semibold text-ink-2">
                  {zone.label}
                </span>
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
  const setZoneColor = useDesignStore((s) => s.setZoneColor);
  const openColorZone = useEditorUi((s) => s.openColorZone);
  const current = colors[zone.id] ?? zone.defaultHex;
  const currentName = describeColor(current);
  // Colores ya usados en el diseño, sin repetir, en el orden de las zonas.
  const teamColors = [...new Set(garment.colorZones.map((z) => colors[z.id] ?? z.defaultHex))];
  const apply = (hex: string) => setZoneColor(zone.id, hex);

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-2">
        <button type="button" className="back-btn" onClick={() => openColorZone(null)}>
          <ChevronLeftIcon />
          Zonas
        </button>
        <h3 className="font-display text-lg text-ink">{zone.label}</h3>
      </div>

      {/* Muestra plana del HEX exacto: es el color que va a la ficha de fábrica. */}
      <div className="flex items-center gap-3">
        <Swatch hex={current} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-ink">
            {currentName.inPalette ? currentName.name : `Personalizado`}
            {!currentName.inPalette && currentName.nearest && (
              <span className="font-normal text-ink-2">, parecido a {currentName.nearest.name}</span>
            )}
          </p>
          <p className="hex mt-0.5">{current}</p>
        </div>
      </div>

      {teamColors.length > 1 && (
        <section aria-labelledby={`team-${zone.id}`}>
          <h4 id={`team-${zone.id}`} className="family-label">
            Colores del equipo
          </h4>
          <div className="flex flex-wrap gap-2">
            {teamColors.map((hex) => (
              <button
                key={hex}
                type="button"
                className="chip"
                aria-pressed={hex === current}
                onClick={() => apply(hex)}
              >
                <Swatch hex={hex} size="sm" />
                <span className="text-sm">{describeColor(hex).inPalette ? describeColor(hex).name : hex}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {fabricPalette.map((family) => (
        <section key={family.id} aria-labelledby={`fam-${zone.id}-${family.id}`}>
          <h4 id={`fam-${zone.id}-${family.id}`} className="family-label">
            {family.label}
          </h4>
          <div className="palette-grid">
            {family.colors.map((c) => {
              const selected = c.hex === current;
              return (
                <button
                  key={c.hex}
                  type="button"
                  className="palette-cell"
                  aria-pressed={selected}
                  aria-label={`${c.name}, ${c.hex}`}
                  onClick={() => apply(c.hex)}
                >
                  <span className="swatch palette-swatch" style={{ backgroundColor: c.hex }}>
                    {selected && (
                      <CheckIcon className={relativeLuminance(c.hex) > 0.35 ? "text-ink" : "text-bone"} />
                    )}
                  </span>
                  <span className="palette-name">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <CustomHex key={current} current={current} onApply={apply} />
    </div>
  );
}

function CustomHex({ current, onApply }: { current: string; onApply: (hex: string) => void }) {
  const [value, setValue] = useState(current.slice(1));
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const hex = normalizeHex(value);
  const invalid = touched && !hex;
  const nearest = hex ? describeColor(hex) : null;

  const submit = () => {
    setTouched(true);
    if (hex) onApply(hex);
  };

  return (
    <section aria-labelledby={`${inputId}-title`} className="border-t border-line pt-5">
      <h4 id={`${inputId}-title`} className="family-label">
        Otro color (HEX)
      </h4>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <span className="swatch h-11 w-11" style={{ backgroundColor: hex ?? "transparent" }} aria-hidden="true" />
        <label htmlFor={inputId} className="sr-only">
          Código HEX
        </label>
        <div className="hex-field" data-invalid={invalid || undefined}>
          <span aria-hidden="true">#</span>
          <input
            id={inputId}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
            onBlur={() => setTouched(true)}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={6}
            aria-invalid={invalid}
            aria-describedby={hintId}
            placeholder="C8102E"
          />
        </div>
        <label className="picker-btn" title="Elegir en la pantalla">
          <span className="sr-only">Elegir con el selector del sistema</span>
          <input
            type="color"
            value={hex ?? current}
            onChange={(e) => setValue(e.target.value.slice(1).toUpperCase())}
          />
        </label>
        <button type="submit" className="ink-btn">
          Aplicar
        </button>
      </form>
      <p id={hintId} className={`mt-2 text-sm ${invalid ? "text-error" : "text-ink-2"}`}>
        {invalid
          ? "Escribí 6 caracteres: números del 0 al 9 y letras de la A a la F."
          : nearest && !nearest.inPalette && nearest.nearest
            ? `Se va a llamar "Personalizado, parecido a ${nearest.nearest.name}".`
            : nearest?.inPalette
              ? `Es "${nearest.name}" de la paleta.`
              : "Pegá el código del color de tu escudo, por ejemplo."}
      </p>
    </section>
  );
}
