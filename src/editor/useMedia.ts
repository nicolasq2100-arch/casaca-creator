"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Alto visible de la ventana (sigue a la barra del navegador en el celular). */
export function useViewportHeight(serverValue = 760) {
  return useSyncExternalStore(
    (cb) => {
      const vv = window.visualViewport;
      window.addEventListener("resize", cb);
      vv?.addEventListener("resize", cb);
      return () => {
        window.removeEventListener("resize", cb);
        vv?.removeEventListener("resize", cb);
      };
    },
    () => Math.round(window.visualViewport?.height ?? window.innerHeight),
    () => serverValue,
  );
}
