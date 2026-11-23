"use client";

import { useEffect } from "react";
import { useDesignStore } from "@/design/store";
import { useEditorUi } from "./uiStore";

const DURATION_MS = 6000;

/** Aviso breve sobre la escena, con "Deshacer" cuando corresponde. Se va solo. */
export function Toast({ placement = "scene" }: { placement?: "scene" | "sheet" }) {
  const toast = useEditorUi((s) => s.toast);
  const hide = useEditorUi((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(hide, DURATION_MS);
    return () => window.clearTimeout(t);
  }, [toast, hide]);

  return (
    <div
      className={placement === "sheet" ? "toast-slot toast-slot--sheet" : "toast-slot"}
      role="status"
      aria-live="polite"
      // En la hoja, tocar el aviso no arrastra la hoja.
      onPointerDown={placement === "sheet" ? (e) => e.stopPropagation() : undefined}
    >
      {toast && (
        <div key={toast.nonce} className="toast">
          <span>{toast.message}</span>
          {toast.undo && (
            <>
              <span aria-hidden="true" className="toast-sep">
                ·
              </span>
              <button
                type="button"
                className="toast-btn"
                onClick={() => {
                  useDesignStore.getState().undo();
                  hide();
                }}
              >
                Deshacer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
