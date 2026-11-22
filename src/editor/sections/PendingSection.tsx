import type { SectionId } from "@/editor/uiStore";

// Secciones que se construyen en las próximas etapas: qué van a hacer, sin controles falsos.
const PENDING: Partial<Record<SectionId, { what: string; items: string[] }>> = {
  template: {
    what: "Camisetas de arranque para no empezar de cero.",
    items: ["Plantillas originales colgadas en percha", "Cambian colores y gráfico, y respetan tus capas"],
  },
  graphics: {
    what: "El diseño de fondo de la tela.",
    items: ["12 gráficos originales, con 3 degradés", "Recoloreá cada canal y elegí en qué zonas va"],
  },
  layers: {
    what: "Todo lo que va encima: escudo, ilustraciones, sponsors y textos.",
    items: ["Subí PNG, JPG o SVG y quitale el fondo", "Mové, escalá y rotá con medidas en cm"],
  },
  names: {
    what: "El dorsal del equipo.",
    items: ["Nombre y número de muestra", "Tipografía, color y borde en cm"],
  },
};

export function PendingSection({ id, stage }: { id: SectionId; stage: number }) {
  const info = PENDING[id];
  if (!info) return null;
  return (
    <div className="pending">
      <p className="text-[0.9375rem] text-ink">{info.what}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
        {info.items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-ink-3" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-semibold text-ink-3">
        Llega en la etapa {stage}
      </p>
    </div>
  );
}
