"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { jerseyPlayer } from "@/garments/garment.config";
import { mainColorFor, type TestMode } from "@/three/testTextures";

// three.js solo corre en el navegador: la escena no se prerenderiza.
const JerseyScene = dynamic(() => import("./JerseyScene"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-white/70">Cargando escena…</div>,
});

const MODES: { id: TestMode; label: string }[] = [
  { id: "solid", label: "Color liso" },
  { id: "uv", label: "Grilla UV" },
  { id: "cm", label: "Grilla 5 cm" },
];

export default function JerseyLab() {
  const [mode, setMode] = useState<TestMode>("uv");
  const [color, setColor] = useState("#c8102e");
  const garment = jerseyPlayer;
  const [knitStrength, setKnitStrength] = useState(garment.fabric.knitStrength);
  const mainColor = mainColorFor(mode, color);

  return (
    // Celular: panel arriba y escena debajo (sin superponerse). Escritorio: escena completa y panel flotante.
    <main className="fixed inset-0 flex flex-col bg-[#3b3a38] sm:block">
      <div className="min-h-0 flex-1 sm:absolute sm:inset-0">
        <JerseyScene garment={garment} mode={mode} color={color} mainColor={mainColor} knitStrength={knitStrength} />
      </div>

      <section
        aria-label="Prueba técnica"
        className="order-first m-2 rounded-sm bg-black/70 px-3 py-1 text-xs text-white sm:absolute sm:left-3 sm:top-3 sm:m-0 sm:w-56 sm:py-3"
      >
        <p className="mb-2 hidden font-semibold sm:block">
          Prueba técnica · {garment.label} (talle {garment.sampleSize})
        </p>
        <fieldset className="flex justify-between gap-1 sm:flex-col">
          <legend className="sr-only">Textura de prueba</legend>
          {MODES.map((m) => (
            <label key={m.id} className="flex min-h-11 cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => setMode(m.id)}
                className="h-4 w-4"
              />
              {m.label}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-1">
          {mode === "solid" && (
            <div className="flex shrink-0 items-center gap-2">
              <label className="flex min-h-11 items-center gap-2">
                Color
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer border-0 bg-transparent"
                />
              </label>
              {/* Muestra plana del HEX exacto (sin luz ni tone mapping) para comparar con el 3D. */}
              <div className="flex items-center gap-1.5" title="Muestra plana del HEX que va a la ficha">
                <span data-testid="hex-swatch" className="h-9 w-9 rounded-sm" style={{ backgroundColor: color }} />
                <span className="font-mono uppercase">{color}</span>
              </div>
            </div>
          )}
          <label className="flex min-w-0 flex-1 flex-col">
            <span>Trama de punto: {knitStrength.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={4}
              step={0.05}
              value={knitStrength}
              onChange={(e) => setKnitStrength(Number(e.target.value))}
              className="min-h-11 w-full"
            />
          </label>
        </div>

        {mode === "cm" && (
          <p className="mt-1 hidden text-[11px] leading-snug text-white/75 sm:block">
            Cuadros de 5 cm (líneas gruesas cada 10). 1 unidad UV = {garment.cmPerUv} cm. Naranja: recuadro del
            escudo del molde.
          </p>
        )}
      </section>
    </main>
  );
}
