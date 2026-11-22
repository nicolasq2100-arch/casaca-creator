"use client";

import { useRef, type KeyboardEvent } from "react";
import { SECTIONS, useEditorUi, type SectionId } from "./uiStore";

/** Pestañas de sección, sin números. Las usan la barra de escritorio y la hoja del celular. */
export function SectionTabs({
  onSelect,
  panelId,
  variant,
}: {
  onSelect: (id: SectionId) => void;
  panelId: string;
  variant: "toolbar" | "sheet";
}) {
  const active = useEditorUi((s) => s.activeSection);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SECTIONS.findIndex((s) => s.id === active);
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = SECTIONS[(i + delta + SECTIONS.length) % SECTIONS.length]!;
    onSelect(next.id);
    refs.current[SECTIONS.indexOf(next)]?.focus();
  };

  return (
    <div role="tablist" aria-label="Secciones del editor" className={variant === "toolbar" ? "tabs-toolbar" : "tabs-sheet"} onKeyDown={onKey}>
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${variant}-${s.id}`}
          aria-selected={s.id === active}
          aria-controls={panelId}
          tabIndex={s.id === active ? 0 : -1}
          className={variant === "toolbar" ? "tab-top" : "tab"}
          onClick={() => onSelect(s.id)}
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}
