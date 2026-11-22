"use client";

import { useEffect, useRef } from "react";
import type { GarmentConfig } from "@/garments/garment.config";
import { SECTIONS, useEditorUi, type SectionId } from "./uiStore";
import { SectionContent } from "./SectionContent";

/** Escritorio: la planilla completa, sección debajo de sección, con índice para saltar. */
export function DesktopPanel({ garment }: { garment: GarmentConfig }) {
  const active = useEditorUi((s) => s.activeSection);
  const setSection = useEditorUi((s) => s.setSection);
  const scroller = useRef<HTMLDivElement>(null);
  const sections = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});

  // Al abrir, la planilla arranca en la sección activa (02 Colores mientras 01 no exista).
  useEffect(() => {
    const id = useEditorUi.getState().activeSection;
    sections.current[id]?.scrollIntoView({ block: "start" });
  }, []);

  // Marca en el índice la sección que está arriba de todo al hacer scroll.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = top?.target.getAttribute("data-section") as SectionId | null;
        if (id) setSection(id);
      },
      { root, rootMargin: "0px 0px -70% 0px" },
    );
    Object.values(sections.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [setSection]);

  const jump = (id: SectionId) => {
    setSection(id);
    sections.current[id]?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <aside className="panel" aria-label="Herramientas">
      <nav aria-label="Secciones del editor" className="panel-index">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className="index-link" aria-current={s.id === active ? "true" : undefined} onClick={() => jump(s.id)}>
            <span className="tab-num">{s.num}</span>
            <span className="tab-label">{s.short}</span>
          </button>
        ))}
      </nav>
      <div ref={scroller} className="panel-scroll">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            ref={(el) => {
              sections.current[s.id] = el;
            }}
            data-section={s.id}
            aria-labelledby={`h-${s.id}`}
            className="panel-section"
          >
            <h2 id={`h-${s.id}`} className="panel-heading">
              <span className="panel-num">{s.num}</span>
              {s.label}
            </h2>
            <SectionContent id={s.id} garment={garment} />
          </section>
        ))}
      </div>
    </aside>
  );
}
