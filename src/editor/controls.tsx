"use client";

import { useEffect, useId, useState } from "react";
import { colorLabel } from "@/palette/colorMath";
import { ensureFont, fontFamily, textFonts } from "@/layers/fonts";
import { Swatch } from "./ColorPicker";
import { ChevronRightIcon, MinusIcon, PlusIcon } from "./icons";

// Controles compartidos por los paneles (Capas, Nombre).

export const fmt = (n: number, d = 1) => n.toLocaleString("es-AR", { maximumFractionDigits: d });

/** Fila de color: muestra, nombre legible y HEX; abre el selector. */
export function ColorRow({ label, hex, name, onClick }: { label: string; hex: string; name?: string; onClick: () => void }) {
  return (
    <button type="button" className="zone-row" onClick={onClick}>
      <Swatch hex={hex} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[0.8125rem] font-semibold text-ink-2">{label}</span>
        <span className="block truncate text-[0.9375rem] text-ink">{name ?? colorLabel(hex).split(",")[0]}</span>
      </span>
      <span className="hex">{hex}</span>
      <ChevronRightIcon className="shrink-0 text-ink-3" />
    </button>
  );
}

/** Tipografías OFL, cada una mostrada en su propia letra. */
export function FontGrid({ value, onSelect, sample }: { value: string; onSelect: (id: string) => void; sample?: (uppercase: boolean) => string }) {
  useEffect(() => textFonts.forEach(ensureFont), []);
  return (
    <div className="font-grid">
      {textFonts.map((f) => (
        <button key={f.id} type="button" className="font-chip" aria-pressed={value === f.id} onClick={() => onSelect(f.id)}>
          <span style={{ fontFamily: fontFamily(f), fontWeight: f.weight }} className="font-chip-sample" aria-hidden="true">
            {sample ? sample(f.uppercase) : f.uppercase ? "ABC 10" : "Abc 10"}
          </span>
          <span className="font-chip-name">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Número con − / + (paso 0,5) y campo editable. Acepta coma decimal. */
export function Stepper({
  label,
  value,
  unit,
  onChange,
  step = 0.5,
  min,
  max,
  decimals = 1,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  step?: number;
  min: number;
  max: number;
  decimals?: number;
}) {
  const id = useId();
  const [text, setText] = useState(fmt(value, decimals));
  useEffect(() => setText(fmt(value, decimals)), [value, decimals]);
  const clampRound = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10 ** decimals) / 10 ** decimals));
  const commitText = () => {
    const v = Number(text.replace(",", "."));
    if (Number.isFinite(v)) onChange(clampRound(v));
    else setText(fmt(value, decimals));
  };
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="stepper">
        <button type="button" className="stepper-btn" aria-label={`Restar ${fmt(step)} ${unit} a ${label}`} onClick={() => onChange(clampRound(value - step))}>
          <MinusIcon />
        </button>
        <span className="stepper-value">
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
          />
          <span aria-hidden="true">{unit}</span>
        </span>
        <button type="button" className="stepper-btn" aria-label={`Sumar ${fmt(step)} ${unit} a ${label}`} onClick={() => onChange(clampRound(value + step))}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

/** Slider que guarda un solo paso en el historial al soltar. */
export function Range({
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
