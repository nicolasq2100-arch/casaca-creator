"use client";

import { useState } from "react";
import type { GarmentConfig } from "@/garments/garment.config";
import { matchesTemplate, useDesignStore } from "@/design/store";
import { COLOR_TAGS, templates, type TemplateDef } from "@/templates/registry";
import { useEditorUi } from "@/editor/uiStore";

/** Galería de plantillas: camisetas colgadas en percha, con filtro por color. */
export function TemplatesSection({ garment }: { garment: GarmentConfig }) {
  const filter = useEditorUi((s) => s.templateFilter);
  const setFilter = useEditorUi((s) => s.setTemplateFilter);
  const design = useDesignStore((s) => s.design);
  const applyTemplate = useDesignStore((s) => s.applyTemplate);
  const showToast = useEditorUi((s) => s.showToast);

  const tags = COLOR_TAGS.filter((c) => templates.some((t) => t.tags.includes(c.id)));
  const list = filter === "all" ? templates : templates.filter((t) => t.tags.includes(filter as TemplateDef["tags"][number]));
  const tagLabel = tags.find((c) => c.id === filter)?.label.toLowerCase();

  const apply = (t: TemplateDef) => {
    if (matchesTemplate(design, t, garment)) return;
    applyTemplate(t);
    showToast("Plantilla aplicada", true);
  };

  return (
    <div className="space-y-4 pb-6">
      <p className="hint">Bases para arrancar: cargan colores y gráfico. No cambian tus capas ni el nombre y número.</p>
      <div className="template-filters">
        <div className="filter-row" role="group" aria-label="Filtrar por color">
          <button type="button" className="filter-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Todas
          </button>
          {tags.map((c) => (
            <button
              key={c.id}
              type="button"
              className="swatch-chip"
              aria-pressed={filter === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => setFilter(c.id)}
            >
              <span style={{ backgroundColor: c.hex }} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[0.8125rem] text-ink-2" aria-live="polite">
          {filter === "all" ? `${templates.length} plantillas` : `${list.length} ${list.length === 1 ? "plantilla" : "plantillas"} con ${tagLabel}`}
        </p>
      </div>
      <ul className="template-grid">
        {list.map((t) => (
          <li key={t.id}>
            <TemplateCard template={t} active={matchesTemplate(design, t, garment)} onApply={() => apply(t)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TemplateCard({ template, active, onApply }: { template: TemplateDef; active: boolean; onApply: () => void }) {
  const [broken, setBroken] = useState(false);
  const c = template.colors;
  return (
    <button type="button" className="template-card" data-template={template.id} aria-pressed={active} onClick={onApply}>
      <span className="template-hang">
        {broken ? (
          <span className="template-fallback" aria-hidden="true">
            {[c.front, c.sleeves, c.collar].map((hex, i) => (
              <span key={i} style={{ backgroundColor: hex }} />
            ))}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- miniaturas estáticas chicas, sin optimizador
          <img className="template-img" src={`/templates/${template.id}.webp`} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
        )}
        {/* Gancho de la percha, asomando por el cuello. */}
        <svg className="template-hanger" viewBox="0 0 100 125" aria-hidden="true">
          <path d="M50 17.5V10.5a4.5 4.5 0 1 0-4.5-4.5M50 17.5 39.5 21.5M50 17.5l10.5 4" />
        </svg>
      </span>
      <span className="template-name">{template.name}</span>
    </button>
  );
}
