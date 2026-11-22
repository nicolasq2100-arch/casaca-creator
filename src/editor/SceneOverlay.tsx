"use client";

import { useEffect } from "react";
import { useProgress } from "@react-three/drei";
import { useDesignStore } from "@/design/store";
import type { DraftStatus } from "@/design/draft";
import { useEditorUi, type CameraView } from "./uiStore";
import { RedoIcon, RulerIcon, UndoIcon } from "./icons";

const VIEWS: { id: CameraView; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "back", label: "Espalda" },
  { id: "side", label: "Costado" },
];

const time = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Atajos de teclado: Ctrl/Cmd+Z deshace, Ctrl/Cmd+Shift+Z o Ctrl+Y rehacen (fuera de campos de texto). */
function useUndoShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        useDesignStore.getState().undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        useDesignStore.getState().redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function DraftNote({ draft, className, short = false }: { draft: DraftStatus; className?: string; short?: boolean }) {
  return (
    <p className={className} aria-live="polite">
      {draft.state === "saved" &&
        (short ? (
          <>
            Borrador guardado<span className="sr-only"> en este dispositivo</span> · {time.format(draft.at)}
          </>
        ) : (
          <>Borrador guardado en este dispositivo · {time.format(draft.at)}</>
        ))}
      {draft.state === "unavailable" && <>{short ? "Borrador sin guardar" : "No se puede guardar el borrador en este navegador."}</>}
    </p>
  );
}

function LoadingProgress() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.08em] text-chalk/85">
        Cargando camiseta <span className="tabular-nums">{Math.round(progress)} %</span>
      </p>
    </div>
  );
}

export function SceneOverlay({ draft }: { draft: DraftStatus }) {
  useUndoShortcuts();
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const guides = useEditorUi((s) => s.guides);
  const toggleGuides = useEditorUi((s) => s.toggleGuides);
  const currentView = useEditorUi((s) => s.currentView);
  const requestView = useEditorUi((s) => s.requestView);

  return (
    <>
      <LoadingProgress />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <div className="scene-group pointer-events-auto">
          <button type="button" className="scene-btn" onClick={undo} disabled={!canUndo} aria-label="Deshacer">
            <UndoIcon />
          </button>
          <button type="button" className="scene-btn" onClick={redo} disabled={!canRedo} aria-label="Rehacer">
            <RedoIcon />
          </button>
        </div>
        <div className="scene-group scene-views pointer-events-auto" role="group" aria-label="Vista de la camiseta">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="scene-btn scene-btn--text"
              aria-pressed={currentView === v.id}
              onClick={() => requestView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scene-bottom pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
        {/* Escritorio: el estado del borrador va en la escena, lejos de la camiseta.
            En el celular va en la hoja (ver BottomSheet), para no quedar encima del modelo. */}
        <DraftNote draft={draft} className="hidden min-h-11 content-center px-2 text-xs text-chalk/75 lg:block" />
        <button
          type="button"
          className="scene-btn scene-btn--text scene-btn--solo pointer-events-auto ml-auto"
          aria-pressed={guides}
          onClick={toggleGuides}
          data-signal={guides || undefined}
        >
          <RulerIcon />
          Guías cm
        </button>
      </div>
    </>
  );
}
