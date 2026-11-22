"use client";

import { garmentCatalog, type GarmentCatalogEntry } from "@/garments/garment.config";

// Siluetas de referencia (cal punteada) para las prendas que todavía no tienen modelo.
const SILHOUETTES: Record<GarmentCatalogEntry["silhouette"], string> = {
  jersey: "M16 7 9.5 10 4 17l5 4.5 4-3V42h22V18.5l4 3 5-4.5-5.5-7L32 7c-2.5 3-5 4-8 4s-5.5-1-8-4Z",
  goalkeeper: "M16 7 9.5 10 6 22 4.5 38l5 1 3.5-14.5V42h22V24.5L38.5 39l5-1L42 22 38.5 10 32 7c-2.5 3-5 4-8 4s-5.5-1-8-4Z",
  shorts: "M11 10h26l3.5 27.5H27.5L24 21l-3.5 16.5H7.5Z",
  socks: "M15 6h9v25c0 6-3 10-9 10h-5a3 3 0 0 1 0-6h3a2 2 0 0 0 2-2ZM15 11h9",
  kit: "M9 7 5 9l-3 5 3 3 2.5-2V31h13V15l2.5 2 3-3-3-5-4-2c-1.5 2-3 2.5-5 2.5S10.5 9 9 7ZM28 20h17l2 21h-7l-2.5-11-2.5 11h-7Z",
};

function Silhouette({ kind }: { kind: GarmentCatalogEntry["silhouette"] }) {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 lg:h-9 lg:w-9" aria-hidden="true">
      <path
        d={SILHOUETTES[kind]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeDasharray="2 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GarmentStrip({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Prenda" className="garment-strip">
      <ul className="flex gap-1 overflow-x-auto px-2 lg:px-0">
        {garmentCatalog.map((g) => {
          const active = g.id === activeId;
          const soon = g.status === "soon";
          return (
            <li key={g.id} className="shrink-0">
              <button
                type="button"
                disabled={soon}
                aria-current={active ? "true" : undefined}
                aria-describedby={soon ? "garment-soon" : undefined}
                className="garment-chip"
                data-active={active || undefined}
              >
                {g.thumbUrl ? (
                  // Miniatura chica y fija: <img> directo, sin el optimizador de next/image.
                  <img src={g.thumbUrl} alt="" width={36} height={36} className="h-8 w-8 object-contain lg:h-9 lg:w-9" />
                ) : (
                  <Silhouette kind={g.silhouette} />
                )}
                <span className="flex flex-col items-start leading-none">
                  <span className="font-label text-[0.8125rem] font-semibold uppercase tracking-[0.06em]">{g.label}</span>
                  {soon && <span className="mt-1 text-[0.6875rem] text-chalk/70">Próximamente</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <span id="garment-soon" className="sr-only">
        Esta prenda todavía no está disponible.
      </span>
    </nav>
  );
}
