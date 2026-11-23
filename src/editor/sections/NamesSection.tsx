"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GarmentConfig, NameNumberSlotId, PieceId } from "@/garments/garment.config";
import { cleanNumber, MAX_NAME_LENGTH, useDesignStore } from "@/design/store";
import { relativeLuminance } from "@/palette/colorMath";
import { layerSizeCm } from "@/layers/geometry";
import { NAME_SLOTS, slotLayer } from "@/layers/nameNumber";
import { useEditorUi } from "@/editor/uiStore";
import { ColorPicker, usedDesignColors } from "@/editor/ColorPicker";
import { ColorRow, FontGrid, fmt, Range, Stepper } from "@/editor/controls";
import { ChevronRightIcon } from "@/editor/icons";

const contrast = (a: string, b: string) => {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
};
/** Debajo de esto el número no se lee de lejos (piso de contraste para gráficos grandes). */
const MIN_CONTRAST = 3;

/** Avisos del nombre y número (también los muestra el resumen de la hoja en el celular). */
export function useNameWarnings(garment: GarmentConfig) {
  const nn = useDesignStore((s) => s.design.nameNumber);
  const colors = useDesignStore((s) => s.design.colors);
  const zoneColor = (piece: string) => {
    const zone = garment.colorZones.find((z) => z.pieces.includes(piece as PieceId));
    return zone ? (colors[zone.id] ?? zone.defaultHex) : "#F7F7F5";
  };
  // ¿Se ve sobre la tela? (sin contar el gráfico, que puede cambiar debajo).
  const lowContrast = NAME_SLOTS.filter((id) => nn.slots[id].enabled).some((id) => {
    const base = zoneColor(nn.slots[id].piece);
    const outlineHelps = nn.outline.widthCm >= 0.2 && contrast(nn.outline.color, base) >= MIN_CONTRAST;
    return contrast(nn.color, base) < MIN_CONTRAST && !outlineHelps;
  });
  const name = nn.name.trim();
  const layer = slotLayer(nn, "name");
  const nameW = layerSizeCm(layer).w - nn.outline.widthCm * 2;
  const maxW = garment.nameNumber.nameMaxWidthCm;
  const tooWide = nn.slots.name.enabled && name !== "" && nameW > maxW;
  // Cuántas letras entran a este alto con esta tipografía (ancho promedio de las del nombre de muestra).
  const fits = name ? Math.max(1, Math.floor(maxW / (nameW / name.length))) : 0;
  return { lowContrast, tooWide, fits, nameLength: name.length, sizeCm: nn.slots.name.sizeCm };
}

export function NamesSection({ garment }: { garment: GarmentConfig }) {
  const view = useEditorUi((s) => s.namesView);
  const top = useRef<HTMLDivElement>(null);
  const viewKey = view.mode === "main" ? "main" : `color-${view.target}`;
  useEffect(() => {
    top.current?.closest(".section-panel-body, .sheet-body")?.scrollTo({ top: 0 });
  }, [viewKey]);
  return <div ref={top}>{view.mode === "color" ? <NameColor garment={garment} target={view.target} /> : <NameMain garment={garment} />}</div>;
}

function NameMain({ garment }: { garment: GarmentConfig }) {
  const nn = useDesignStore((s) => s.design.nameNumber);
  const update = useDesignStore((s) => s.updateNameNumber);
  const commitGesture = useDesignStore((s) => s.commitGesture);
  const setView = useEditorUi((s) => s.setNamesView);
  const requestView = useEditorUi((s) => s.requestView);
  const nameSlot = useEditorUi((s) => s.nameSlot);
  const nameId = useId();
  const numberId = useId();
  const [name, setName] = useState(nn.name);
  const [number, setNumber] = useState(nn.number);
  useEffect(() => setName(nn.name), [nn.name]);
  useEffect(() => setNumber(nn.number), [nn.number]);

  // El nombre y número van en la espalda: al abrir la sección se gira la camiseta.
  useEffect(() => {
    const slot = useEditorUi.getState().nameSlot;
    const piece = slot ? useDesignStore.getState().design.nameNumber.slots[slot].piece : "back";
    useEditorUi.getState().requestView(piece === "front" ? "front" : "back");
  }, []);

  const warn = useNameWarnings(garment);

  return (
    <div className="space-y-6 pb-6">
      <section aria-labelledby="n-sample" className="space-y-3">
        <div>
          <h3 id="n-sample" className="font-display text-lg text-ink">
            Muestra
          </h3>
          <p className="hint mt-1">Es para ver cómo queda. El nombre y número de cada jugador se cargan después, en el pedido.</p>
        </div>
        <div className="flex gap-3">
          <label className="field min-w-0 flex-1" htmlFor={nameId}>
            <span className="field-label">
              Nombre
              <span className="field-value text-ink-3">
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </span>
            <input
              id={nameId}
              className="text-field"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => {
                setName(e.target.value);
                update({ name: e.target.value }, "live");
              }}
              onBlur={commitGesture}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
          <label className="field w-24 flex-none" htmlFor={numberId}>
            <span className="field-label">
              Número
              <span className="field-value text-ink-3">0–99</span>
            </span>
            <input
              id={numberId}
              className="text-field text-center tabular-nums"
              value={number}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              autoComplete="off"
              onChange={(e) => {
                const v = cleanNumber(e.target.value);
                setNumber(v);
                update({ number: v }, "live");
              }}
              onBlur={commitGesture}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </label>
        </div>
        <div aria-live="polite" className="space-y-2 empty:hidden">
          {warn.tooWide && (
            <p className="notice">
              A {fmt(warn.sizeCm)} cm de alto entran unas {warn.fits} letras con esta tipografía y el nombre tiene {warn.nameLength}: se va a
              cortar en las costuras.
            </p>
          )}
          {warn.lowContrast && (
            <div className="notice flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p>El color casi no se distingue de la tela: de lejos no se va a leer.</p>
              <button type="button" className="text-btn !min-h-9 !px-0 !text-ink" onClick={() => setView({ mode: "color", target: "fill" })}>
                Cambiar color
              </button>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="n-where" className="space-y-2">
        <h4 id="n-where" className="family-label">
          Dónde va
        </h4>
        <ul className="divide-y divide-line border-y border-line">
          {NAME_SLOTS.map((id) => (
            <SlotRow key={id} garment={garment} slot={id} selected={nameSlot === id} onSelect={() => requestView(nn.slots[id].piece === "front" ? "front" : "back")} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="n-font">
        <h4 id="n-font" className="family-label">
          Tipografía
        </h4>
        <FontGrid value={nn.fontId} onSelect={(id) => update({ fontId: id })} sample={() => `${(nn.name.trim().slice(0, 3) || "ABC").toLocaleUpperCase("es-AR")} ${nn.number || "10"}`} />
      </section>

      <section aria-labelledby="n-colors" className="space-y-3">
        <h4 id="n-colors" className="family-label">
          Color y borde
        </h4>
        <ul className="divide-y divide-line border-y border-line">
          <li>
            <ColorRow label="Color" hex={nn.color} onClick={() => setView({ mode: "color", target: "fill" })} />
          </li>
          <li>
            <ColorRow label="Color del borde" hex={nn.outline.color} onClick={() => setView({ mode: "color", target: "outline" })} />
          </li>
        </ul>
        <Range
          id="n-outline"
          label="Grosor del borde"
          value={nn.outline.widthCm}
          min={0}
          max={1.5}
          step={0.05}
          format={(v) => (v === 0 ? "Sin borde" : `${fmt(v, 2)} cm`)}
          onLive={(v) => update({ outline: { ...nn.outline, widthCm: v } }, "live")}
          onCommit={commitGesture}
        />
      </section>

    </div>
  );
}

/** Un lugar: encendido o apagado; al elegirlo muestra sus medidas y sus asas en la camiseta. */
function SlotRow({ garment, slot, selected, onSelect }: { garment: GarmentConfig; slot: NameNumberSlotId; selected: boolean; onSelect: () => void }) {
  const s = useDesignStore((st) => st.design.nameNumber.slots[slot]);
  const updateSlot = useDesignStore((st) => st.updateNameSlot);
  const setNameSlot = useEditorUi((st) => st.setNameSlot);
  const label = garment.nameNumber.slots[slot].label;
  const spec = garment.pieces[s.piece as PieceId];
  const adjustId = useId();
  const open = selected && s.enabled;
  useEffect(() => {
    if (open) document.getElementById(adjustId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, adjustId]);

  const toggle = () => {
    const enabled = !s.enabled;
    updateSlot(slot, { enabled });
    if (enabled) {
      setNameSlot(slot);
      onSelect();
    } else if (selected) setNameSlot(null);
  };

  return (
    <li>
      <div className="layer-row">
        <button
          type="button"
          className="layer-row-main"
          aria-expanded={open}
          aria-controls={adjustId}
          disabled={!s.enabled}
          onClick={() => {
            setNameSlot(open ? null : slot);
            if (!open) onSelect();
          }}
        >
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[0.9375rem] text-ink">{label}</span>
            <span className="block truncate text-[0.8125rem] text-ink-2">
              {s.enabled ? (
                <>
                  {spec?.label} · <span className="tabular-nums">{fmt(s.sizeCm)} cm de alto</span>
                </>
              ) : (
                "No va"
              )}
            </span>
          </span>
          {s.enabled && <ChevronRightIcon className={`shrink-0 text-ink-3 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />}
        </button>
        <button type="button" className="switch" role="switch" aria-checked={s.enabled} aria-label={label} onClick={toggle}>
          <span aria-hidden="true" />
        </button>
      </div>
      {open && spec && (
        <div id={adjustId} className="space-y-3 pb-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Desde la izquierda" value={s.xCm} unit="cm" min={0} max={spec.sizeCm.w} onChange={(v) => updateSlot(slot, { xCm: v })} />
            <Stepper label="Desde arriba" value={s.yCm} unit="cm" min={0} max={spec.sizeCm.h} onChange={(v) => updateSlot(slot, { yCm: v })} />
            <Stepper label="Alto" value={s.sizeCm} unit="cm" min={1} max={60} onChange={(v) => updateSlot(slot, { sizeCm: v })} />
            <div className="flex items-end">
              <button
                type="button"
                className="line-btn w-full justify-center"
                disabled={Math.abs(s.xCm - spec.sizeCm.w / 2) < 0.05}
                onClick={() => updateSlot(slot, { xCm: Math.round((spec.sizeCm.w / 2) * 100) / 100 })}
              >
                Centrar
              </button>
            </div>
          </div>
          {s.sizeCm === garment.nameNumber.slots[slot].sizeCm && (
            <p className="hint">Alto propuesto: {fmt(s.sizeCm)} cm, a confirmar con la fábrica.</p>
          )}
          <p className="hint">En la camiseta, arrastralo para moverlo y usá el asa para cambiar el tamaño.</p>
        </div>
      )}
    </li>
  );
}

function NameColor({ garment, target }: { garment: GarmentConfig; target: "fill" | "outline" }) {
  const nn = useDesignStore((s) => s.design.nameNumber);
  const colors = useDesignStore((s) => s.design.colors);
  const channels = useDesignStore((s) => s.design.graphic?.channels);
  const update = useDesignStore((s) => s.updateNameNumber);
  const setView = useEditorUi((s) => s.setNamesView);
  return (
    <ColorPicker
      title={target === "outline" ? "Color del borde" : "Color del nombre y número"}
      backLabel="Nombre y número"
      onBack={() => setView({ mode: "main" })}
      current={target === "outline" ? nn.outline.color : nn.color}
      usedColors={usedDesignColors(colors, garment.colorZones.map((z) => z.id), channels)}
      onApply={(hex) => (target === "outline" ? update({ outline: { ...nn.outline, color: hex } }) : update({ color: hex }))}
    />
  );
}
