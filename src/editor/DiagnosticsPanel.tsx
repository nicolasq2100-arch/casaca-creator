"use client";

import { useEffect, useState } from "react";
import { diagnosticsText, isDebug, useSceneDiag } from "./scene/diagnostics";

/** Panel de diagnóstico (solo con ?debug=1): todo en pantalla y copiable, para celulares sin consola. */
export function DiagnosticsPanel() {
  const diag = useSceneDiag();
  const [copied, setCopied] = useState<"no" | "sí" | "error">("no");
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (isDebug()) useSceneDiag.getState().patch({ debug: true });
  }, []);
  if (!diag.debug) return null;
  const text = diagnosticsText(diag);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("sí");
    } catch {
      setCopied("error");
    }
  };

  return (
    <section className="diag" aria-label="Diagnóstico del 3D" data-open={open || undefined}>
      <div className="diag-bar">
        <p className="diag-title">
          Diagnóstico 3D · {diag.fatal ? "ERROR" : diag.drawn.state === "sí" ? "se ve" : "revisando"}
        </p>
        <button type="button" className="diag-btn" onClick={copy}>
          {copied === "sí" ? "Copiado" : copied === "error" ? "No se pudo copiar" : "Copiar"}
        </button>
        <button type="button" className="diag-btn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Ocultar" : "Ver"}
        </button>
      </div>
      {open && <pre className="diag-body">{text}</pre>}
    </section>
  );
}
