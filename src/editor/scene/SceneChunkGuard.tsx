"use client";

import { Component, type ReactNode } from "react";
import { useSceneDiag } from "./diagnostics";
import { ReloadButton, SceneMessage } from "./SceneMessage";

/**
 * Envuelve la carga diferida de la escena 3D. Si el código de la escena no llega (red, servidor de
 * desarrollo que bloquea la petición, etc.), muestra el error en vez de dejar la escena vacía.
 */
export class SceneChunkGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    const d = useSceneDiag.getState();
    d.logError(`no cargó el código de la escena: ${error.message}`);
    d.setFatal("no cargó el código de la escena 3D");
  }
  render() {
    if (this.state.failed) {
      return (
        <SceneMessage
          title="No pudimos cargar la camiseta."
          body="Revisá la conexión y recargá la página. Tu borrador sigue guardado en este dispositivo."
          action={<ReloadButton />}
        />
      );
    }
    return this.props.children;
  }
}
