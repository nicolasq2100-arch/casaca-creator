"use client";

import { useEffect, useState } from "react";
import { sanitizeDesign, useDesignStore } from "./store";

// Borrador local: el diseño se guarda solo en este dispositivo, sin cuenta.
// Se reemplaza por "Guardar diseño" (Supabase) más adelante; el borrador sigue sirviendo de respaldo.

const KEY = "casaca-creator:draft:v1";
const DEBOUNCE_MS = 400;

export type DraftStatus =
  | { state: "idle" }
  | { state: "saved"; at: number }
  | { state: "unavailable" };

function readDraft() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const design = sanitizeDesign(parsed);
    const savedAt = (parsed as { savedAt?: unknown }).savedAt;
    return design ? { design, savedAt: typeof savedAt === "number" ? savedAt : Date.now() } : null;
  } catch {
    return null;
  }
}

/** Carga el borrador al montar y lo guarda cada vez que cambia el diseño. */
export function useLocalDraft(): DraftStatus {
  const [status, setStatus] = useState<DraftStatus>({ state: "idle" });

  useEffect(() => {
    const draft = readDraft();
    useDesignStore.getState().hydrate(draft?.design ?? null);
    if (draft) setStatus({ state: "saved", at: draft.savedAt });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useDesignStore.subscribe((s, prev) => {
      if (s.design === prev.design || !s.hydrated) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          window.localStorage.setItem(KEY, JSON.stringify({ ...s.design, savedAt: Date.now() }));
          setStatus({ state: "saved", at: Date.now() });
        } catch {
          setStatus({ state: "unavailable" });
        }
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return status;
}
