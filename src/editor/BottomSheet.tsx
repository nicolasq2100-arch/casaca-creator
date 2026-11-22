"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { SECTIONS, useEditorUi, type SectionId, type SheetDetent } from "./uiStore";
import { useViewportHeight } from "./useMedia";
import { SectionContent } from "./SectionContent";
import { DraftNote } from "./SceneOverlay";
import type { DraftStatus } from "@/design/draft";

const COMPACT_PX = 128;
/** La altura media siempre deja ver las cinco zonas de 02 Colores. */
const MEDIUM_MIN_PX = 368;
const ORDER: SheetDetent[] = ["compact", "medium", "tall"];
const DETENT_LABEL: Record<SheetDetent, string> = { compact: "chico", medium: "medio", tall: "grande" };

function detentHeights(vh: number): Record<SheetDetent, number> {
  return {
    compact: COMPACT_PX,
    medium: Math.max(MEDIUM_MIN_PX, Math.round(vh * 0.45)),
    tall: Math.round(vh * 0.85),
  };
}

export function SectionTabs({ onSelect }: { onSelect: (id: SectionId) => void }) {
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
    <div role="tablist" aria-label="Secciones del editor" className="tabs" onKeyDown={onKey}>
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${s.id}`}
          aria-selected={s.id === active}
          aria-controls="sheet-panel"
          tabIndex={s.id === active ? 0 : -1}
          className="tab"
          onClick={() => onSelect(s.id)}
        >
          <span className="tab-num">{s.num}</span>
          <span className="tab-label">{s.short}</span>
        </button>
      ))}
    </div>
  );
}

function CompactSummary({ garment }: { garment: GarmentConfig }) {
  const active = useEditorUi((s) => s.activeSection);
  const colors = useDesignStore((s) => s.design.colors);
  const section = SECTIONS.find((s) => s.id === active)!;
  return (
    <div className="flex h-11 items-center gap-3 px-4 text-sm text-ink-2">
      {active === "colors" ? (
        <>
          <span className="flex gap-1" aria-hidden="true">
            {garment.colorZones.map((z) => (
              <span key={z.id} className="swatch h-5 w-5" style={{ backgroundColor: colors[z.id] ?? z.defaultHex }} />
            ))}
          </span>
          <span>
            {garment.colorZones.length} zonas de color
          </span>
        </>
      ) : (
        <span>
          {section.label}: llega en la etapa {section.stage}
        </span>
      )}
    </div>
  );
}

export function BottomSheet({ garment, draft }: { garment: GarmentConfig; draft: DraftStatus }) {
  const detent = useEditorUi((s) => s.sheetDetent);
  const setDetent = useEditorUi((s) => s.setSheetDetent);
  const active = useEditorUi((s) => s.activeSection);
  const setSection = useEditorUi((s) => s.setSection);
  const heights = detentHeights(useViewportHeight());
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const select = (id: SectionId) => {
    if (id === active) {
      setDetent(detent === "compact" ? "medium" : "compact");
    } else {
      setSection(id);
      if (detent === "compact") setDetent("medium");
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: heights[detent], lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt; // px/ms, positivo hacia abajo
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragHeight(Math.min(heights.tall, Math.max(heights.compact, d.startH - dy)));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) {
      // Toque simple sobre el asa: con el puntero capturado, el click no llega al botón.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 400);
      cycleDetent();
      return;
    }
    if (!d || dragHeight === null) return;
    // Se proyecta el gesto ~180 ms para respetar un "tirón" rápido.
    const projected = dragHeight - d.v * 180;
    const nearest = ORDER.reduce((a, b) => (Math.abs(heights[b] - projected) < Math.abs(heights[a] - projected) ? b : a));
    setDetent(nearest);
    setDragHeight(null);
  };

  function cycleDetent() {
    const i = ORDER.indexOf(detent);
    setDetent(ORDER[(i + 1) % ORDER.length]!);
  }
  // Teclado (Enter/Espacio) llega como click.
  const onGripClick = () => {
    if (!suppressClick.current) cycleDetent();
  };

  const height = dragHeight ?? heights[detent];
  const compact = dragHeight === null && detent === "compact";

  return (
    <section className="sheet" style={{ height }} data-dragging={dragHeight !== null || undefined} aria-label="Herramientas">
      <div
        className="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          className="sheet-grip"
          onClick={onGripClick}
          aria-label={`Tamaño del panel: ${DETENT_LABEL[detent]}. Tocá para cambiarlo.`}
        >
          <span aria-hidden="true" />
        </button>
        <DraftNote draft={draft} className="sheet-draft" short />
      </div>
      <SectionTabs onSelect={select} />
      <div id="sheet-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={compact ? undefined : "sheet-body"}>
        {compact ? <CompactSummary garment={garment} /> : <SectionContent id={active} garment={garment} />}
      </div>
    </section>
  );
}
