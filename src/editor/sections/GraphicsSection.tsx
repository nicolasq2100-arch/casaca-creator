"use client";

import { useEffect, useRef } from "react";
import type { GarmentConfig } from "@/garments/garment.config";
import type { GraphicState } from "@/design/types";
import { useDesignStore } from "@/design/store";
import { colorLabel } from "@/palette/colorMath";
import { patterns, patternsById } from "@/patterns/registry";
import { paramsOf, renderPatternThumb } from "@/patterns/render";
import { PATTERN_CATEGORIES, type PatternDef } from "@/patterns/types";
import { useEditorUi } from "@/editor/uiStore";
import { ChevronLeftIcon, ChevronRightIcon } from "@/editor/icons";
import { ColorPicker, Swatch, usedDesignColors } from "@/editor/ColorPicker";

const fmt = (n: number, digits = 1) => n.toLocaleString("es-AR", { maximumFractionDigits: digits });

export function GraphicsSection({ garment }: { garment: GarmentConfig }) {
  const view = useEditorUi((s) => s.graphicsView);
  const graphic = useDesignStore((s) => s.design.graphic);
  const def = graphic ? patternsById[graphic.id] : undefined;
  if (view.mode === "settings" && graphic && def) return <GraphicSettings garment={garment} graphic={graphic} def={def} />;
  if (view.mode === "channel" && graphic && def) return <ChannelPicker garment={garment} graphic={graphic} def={def} index={view.index} />;
  return <Gallery garment={garment} />;
}

// ---------- miniaturas ----------

/** Miniatura dibujada con el mismo código que la tela (no es una imagen aparte). */
function PatternThumb({ def, baseHex, garment, graphic, size = 96 }: { def: PatternDef | null; baseHex: string; garment: GarmentConfig; graphic?: GraphicState; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = graphic ? JSON.stringify(paramsOf(graphic)) : "default";
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const px = Math.round(size * Math.min(2, window.devicePixelRatio || 1));
    const src = renderPatternThumb(def, baseHex, garment, px, graphic ? paramsOf(graphic) : undefined);
    el.width = el.height = px;
    el.getContext("2d")?.drawImage(src, 0, 0);
  }, [def, baseHex, garment, key, size, graphic]);
  return <canvas ref={ref} className="pattern-thumb" style={{ width: size, height: size }} aria-hidden="true" />;
}

// ---------- galería ----------

function Gallery({ garment }: { garment: GarmentConfig }) {
  const graphic = useDesignStore((s) => s.design.graphic);
  const baseHex = useDesignStore((s) => s.design.colors.front ?? "#F7F7F5");
  const selectGraphic = useDesignStore((s) => s.selectGraphic);
  const category = useEditorUi((s) => s.graphicsCategory);
  const setCategory = useEditorUi((s) => s.setGraphicsCategory);
  const setView = useEditorUi((s) => s.setGraphicsView);
  const current = graphic ? patternsById[graphic.id] : undefined;
  const list = category === "all" ? patterns : patterns.filter((p) => p.category === category);

  return (
    <div className="space-y-5 pb-6">
      {graphic && current && (
        <button type="button" className="current-graphic" onClick={() => setView({ mode: "settings" })}>
          <PatternThumb def={current} baseHex={baseHex} garment={garment} graphic={graphic} size={44} />
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[0.8125rem] font-semibold text-ink-2">Gráfico elegido</span>
            <span className="block truncate text-[0.9375rem] text-ink">{current.name}</span>
          </span>
          <span className="adjust-label">Ajustar</span>
          <ChevronRightIcon className="shrink-0 text-ink-3" />
        </button>
      )}

      <div className="filter-row" role="group" aria-label="Filtrar por tipo">
        {[{ id: "all" as const, label: "Todos" }, ...PATTERN_CATEGORIES].map((c) => (
          <button key={c.id} type="button" className="filter-chip" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      <ul className="pattern-grid" aria-label="Gráficos">
        <li>
          <button type="button" className="pattern-card" aria-pressed={!graphic} onClick={() => selectGraphic(null)}>
            {/* Marca de "ninguno": una diagonal, para que no parezca una miniatura que no cargó. */}
            <span className="pattern-thumb-wrap" style={{ backgroundColor: baseHex }}>
              <svg viewBox="0 0 40 40" className="none-mark" aria-hidden="true">
                <circle cx="20" cy="20" r="11" />
                <path d="M12.2 27.8 27.8 12.2" />
              </svg>
            </span>
            <span className="pattern-name">Sin gráfico</span>
          </button>
        </li>
        {list.map((p) => (
          <li key={p.id}>
            <button type="button" className="pattern-card" aria-pressed={graphic?.id === p.id} onClick={() => selectGraphic(p.id)}>
              <span className="pattern-thumb-wrap">
                <PatternThumb def={p} baseHex={baseHex} garment={garment} />
              </span>
              <span className="pattern-name">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- ajustes ----------

function GraphicSettings({ garment, graphic, def }: { garment: GarmentConfig; graphic: GraphicState; def: PatternDef }) {
  const updateGraphic = useDesignStore((s) => s.updateGraphic);
  const commitGesture = useDesignStore((s) => s.commitGesture);
  const selectGraphic = useDesignStore((s) => s.selectGraphic);
  const setView = useEditorUi((s) => s.setGraphicsView);
  const flashZone = useEditorUi((s) => s.flashZone);

  const toggleZone = (zoneId: string) => {
    const on = graphic.zones.includes(zoneId);
    if (on && graphic.zones.length === 1) return; // siempre queda al menos una zona
    updateGraphic({ zones: on ? graphic.zones.filter((z) => z !== zoneId) : [...graphic.zones, zoneId] });
    if (!on) flashZone(zoneId);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-2">
        <button type="button" className="back-btn" onClick={() => setView({ mode: "gallery" })}>
          <ChevronLeftIcon />
          Gráficos
        </button>
        <h3 className="font-display text-lg text-ink">{def.name}</h3>
      </div>

      <section aria-labelledby="g-colors">
        <h4 id="g-colors" className="family-label">
          Colores del gráfico
        </h4>
        <ul className="divide-y divide-line border-y border-line">
          {def.channels.map((ch, i) => {
            const hex = graphic.channels[i] ?? ch.defaultHex;
            return (
              <li key={ch.label}>
                <button type="button" className="zone-row" onClick={() => setView({ mode: "channel", index: i })}>
                  <Swatch hex={hex} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[0.8125rem] font-semibold text-ink-2">{ch.label}</span>
                    <span className="block truncate text-[0.9375rem] text-ink">{colorLabel(hex)}</span>
                  </span>
                  <span className="hex">{hex}</span>
                  <ChevronRightIcon className="shrink-0 text-ink-3" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="g-zones">
        <h4 id="g-zones" className="family-label">
          Dónde va
        </h4>
        <div className="flex flex-wrap gap-2">
          {garment.colorZones.map((z) => {
            const on = graphic.zones.includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                className="filter-chip"
                aria-pressed={on}
                aria-disabled={on && graphic.zones.length === 1}
                onClick={() => toggleZone(z.id)}
              >
                {z.label}
              </button>
            );
          })}
        </div>
      </section>

      <RangeField
        id="g-scale"
        label={def.scale.label}
        value={graphic.scaleCm}
        min={def.scale.min}
        max={def.scale.max}
        step={def.scale.step}
        format={(v) => `${fmt(v)} cm`}
        onLive={(v) => updateGraphic({ scaleCm: v }, "live")}
        onCommit={commitGesture}
      />

      {def.angle && (
        <RangeField
          id="g-angle"
          label="Ángulo"
          value={graphic.angleDeg}
          min={def.angle.min}
          max={def.angle.max}
          step={1}
          format={(v) => `${fmt(v, 0)}°`}
          onLive={(v) => updateGraphic({ angleDeg: v }, "live")}
          onCommit={commitGesture}
        />
      )}

      {def.variants && (
        <div className="field">
          <span className="field-label" id="g-variant">
            Forma
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="g-variant">
            <button
              type="button"
              className="step-btn"
              aria-label="Forma anterior"
              onClick={() => updateGraphic({ variant: ((graphic.variant - 2 + def.variants!) % def.variants!) + 1 })}
            >
              <ChevronLeftIcon />
            </button>
            <span className="field-value min-w-[5.5rem] text-center" aria-live="polite">
              {graphic.variant} de {def.variants}
            </span>
            <button
              type="button"
              className="step-btn"
              aria-label="Forma siguiente"
              onClick={() => updateGraphic({ variant: (graphic.variant % def.variants!) + 1 })}
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            selectGraphic(null);
            setView({ mode: "gallery" });
          }}
        >
          Quitar gráfico
        </button>
      </div>
    </div>
  );
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onLive,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onLive: (v: number) => void;
  onCommit: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        <span className="field-value">{format(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onLive(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        onTouchEnd={onCommit}
      />
    </div>
  );
}

function ChannelPicker({ garment, graphic, def, index }: { garment: GarmentConfig; graphic: GraphicState; def: PatternDef; index: number }) {
  const colors = useDesignStore((s) => s.design.colors);
  const updateGraphic = useDesignStore((s) => s.updateGraphic);
  const setView = useEditorUi((s) => s.setGraphicsView);
  const channel = def.channels[index];
  if (!channel) return null;
  return (
    <ColorPicker
      title={channel.label}
      backLabel={def.name}
      onBack={() => setView({ mode: "settings" })}
      current={graphic.channels[index] ?? channel.defaultHex}
      usedColors={usedDesignColors(colors, garment.colorZones.map((z) => z.id), graphic.channels)}
      onApply={(hex) => {
        const channels = [...graphic.channels];
        channels[index] = hex;
        updateGraphic({ channels });
      }}
    />
  );
}
