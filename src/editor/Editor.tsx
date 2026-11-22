"use client";

import dynamic from "next/dynamic";
import { jerseyPlayer } from "@/garments/garment.config";
import { useLocalDraft } from "@/design/draft";
import { GarmentStrip } from "./GarmentStrip";
import { SceneOverlay } from "./SceneOverlay";
import { BottomSheet } from "./BottomSheet";
import { DesktopPanel } from "./DesktopPanel";
import { useMediaQuery } from "./useMedia";

// three.js solo corre en el navegador: la escena no se prerenderiza.
const EditorScene = dynamic(() => import("./scene/EditorScene"), { ssr: false });

export function Editor() {
  const garment = jerseyPlayer; // v1: solo la camiseta de jugador
  const draft = useLocalDraft();
  const desktop = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="editor">
      <header className="editor-strip">
        <h1 className="sr-only">Editor de la camiseta de jugador</h1>
        <p className="wordmark" aria-label="Casaca Creator">
          Casaca <span>Creator</span>
        </p>
        <GarmentStrip activeId={garment.id} />
      </header>

      <main className="editor-scene" aria-label="Vista 3D de la camiseta">
        <EditorScene garment={garment} />
        <SceneOverlay draft={draft} />
      </main>

      {desktop ? <DesktopPanel garment={garment} /> : <BottomSheet garment={garment} draft={draft} />}
    </div>
  );
}
