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
export function useUndoShortcuts() {
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

export function UndoRedo({ withGuides = false }: { withGuides?: boolean }) {
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  return (
    <div className="btn-group">
      <button type="button" className="tool-btn" onClick={undo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
        <UndoIcon />
      </button>
      <button type="button" className="tool-btn" onClick={redo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)">
        <RedoIcon />
      </button>
      {/* Celular: Guías cm va acá (solo ícono), lejos del bajo de la camiseta y de sus medidas. */}
      {withGuides && <GuidesToggle iconOnly />}
    </div>
  );
}

export function ViewSwitch({ className = "" }: { className?: string }) {
  const currentView = useEditorUi((s) => s.currentView);
  const requestView = useEditorUi((s) => s.requestView);
  return (
    <div className={`btn-group ${className}`} role="group" aria-label="Vista de la camiseta">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          className="tool-btn tool-btn--text"
          aria-pressed={currentView === v.id}
          onClick={() => requestView(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function GuidesToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const guides = useEditorUi((s) => s.guides);
  const toggleGuides = useEditorUi((s) => s.toggleGuides);
  return (
    <button
      type="button"
      className={iconOnly ? "tool-btn" : "tool-btn tool-btn--text tool-btn--solo pointer-events-auto ml-auto"}
      aria-pressed={guides}
      aria-label={iconOnly ? "Guías cm" : undefined}
      title="Guías en centímetros"
      onClick={toggleGuides}
      data-signal={guides || undefined}
    >
      <RulerIcon />
      {!iconOnly && "Guías cm"}
    </button>
  );
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
      <p className="text-sm font-medium text-chalk/85">
        Cargando camiseta <span className="tabular-nums">{Math.round(progress)} %</span>
      </p>
    </div>
  );
}

/**
 * Controles sobre la escena. En celular: deshacer/rehacer y vistas arriba, Guías cm abajo.
 * En escritorio deshacer/rehacer y vistas viven en la barra de herramientas; acá quedan el borrador y las guías.
 */
export function SceneOverlay({ draft, desktop }: { draft: DraftStatus; desktop: boolean }) {
  return (
    <>
      <LoadingProgress />
      {!desktop && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <div className="pointer-events-auto">
            <UndoRedo withGuides />
          </div>
          <ViewSwitch className="scene-views pointer-events-auto" />
        </div>
      )}
      {/* Escritorio: borrador y Guías cm abajo. En el celular el borrador va en la hoja y las guías arriba. */}
      {desktop && (
        <div className="scene-bottom pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <DraftNote draft={draft} className="min-h-11 content-center px-1 text-xs text-chalk/75" />
          <GuidesToggle />
        </div>
      )}
    </>
  );
}
