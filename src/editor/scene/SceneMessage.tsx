import type { ReactNode } from "react";

/** Mensaje que ocupa la escena (carga, error). Sin dependencias de three: sirve aunque el 3D no cargue. */
export function SceneMessage({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-coal px-8 text-center" role="alert">
      <div className="max-w-xs">
        <p className="font-label text-base font-semibold uppercase tracking-[0.06em] text-chalk">{title}</p>
        {body && <p className="mt-2 text-sm text-chalk/75">{body}</p>}
        {action}
      </div>
    </div>
  );
}

export function ReloadButton() {
  return (
    <button
      type="button"
      className="scene-btn scene-btn--text scene-btn--solo mx-auto mt-4"
      onClick={() => window.location.reload()}
    >
      Recargar
    </button>
  );
}
