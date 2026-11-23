"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useDesignStore } from "@/design/store";
import { useEditorUi } from "./uiStore";
import { layerBridge, layerToScreen } from "./layerBridge";

const MIN_SIZE = 1;
const MAX_SIZE = 60;
const SNAP_DEG = 4;
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

/** Borde de abajo (px, relativo a la escena) de los controles que flotan arriba de la escena, + 8 px. */
function safeTop(root: HTMLElement) {
  const scene = root.parentElement;
  if (!scene) return 0;
  const top = scene.getBoundingClientRect().top;
  let bottom = 0;
  for (const c of scene.querySelectorAll<HTMLElement>(".btn-group")) {
    const r = c.getBoundingClientRect();
    if (r.height && r.top - top < 80) bottom = Math.max(bottom, r.bottom - top);
  }
  return bottom ? bottom + 8 : 0;
}

/**
 * Asas de la capa elegida, encima de la escena: contorno, escalar (esquina) y rotar (arriba).
 * Para mover se arrastra la capa misma sobre la camiseta (LayerManipulator).
 */
export function LayerHandles() {
  const active = useEditorUi((s) => s.activeSection === "layers" && s.layersView.mode === "layer");
  const outline = useRef<SVGPolygonElement>(null);
  const stem = useRef<SVGLineElement>(null);
  const scaleH = useRef<HTMLButtonElement>(null);
  const rotateH = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // Se mueven con la escena, sin re-render de React.
  useEffect(() => {
    const draw = () => {
      const g = layerBridge.geometry;
      const el = root.current;
      if (!el) return;
      if (!g || !g.visible) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      const corners = [
        layerToScreen(g, -g.halfW, -g.halfH),
        layerToScreen(g, g.halfW, -g.halfH),
        layerToScreen(g, g.halfW, g.halfH),
        layerToScreen(g, -g.halfW, g.halfH),
      ];
      outline.current?.setAttribute("points", corners.map((p) => p.join(",")).join(" "));
      // Asa de rotar: 34 px más allá del borde de arriba. Si cae sobre los controles de arriba de la escena,
      // pasa al borde de abajo.
      const out = (edge: [number, number]): [number, number] => {
        const [ux, uy] = [edge[0] - g.cx, edge[1] - g.cy];
        const len = Math.hypot(ux, uy) || 1;
        return [edge[0] + (ux / len) * 34, edge[1] + (uy / len) * 34];
      };
      let topMid = layerToScreen(g, 0, -g.halfH);
      let rot = out(topMid);
      if (rot[1] - 22 < safeTop(el)) {
        topMid = layerToScreen(g, 0, g.halfH);
        rot = out(topMid);
      }
      stem.current?.setAttribute("x1", String(topMid[0]));
      stem.current?.setAttribute("y1", String(topMid[1]));
      stem.current?.setAttribute("x2", String(rot[0]));
      stem.current?.setAttribute("y2", String(rot[1]));
      // Asa de escalar: un poco afuera de la esquina, en diagonal, para no tapar una capa chica.
      const br = corners[2]!;
      const [dx, dy] = [br[0] - g.cx, br[1] - g.cy];
      const dl = Math.hypot(dx, dy) || 1;
      const sc: [number, number] = [br[0] + (dx / dl) * 16, br[1] + (dy / dl) * 16];
      if (scaleH.current) scaleH.current.style.transform = `translate(${sc[0]}px, ${sc[1]}px)`;
      if (rotateH.current) rotateH.current.style.transform = `translate(${rot[0]}px, ${rot[1]}px)`;
      if (label.current) {
        const bottom = Math.max(...corners.map((p) => p[1]));
        label.current.style.transform = `translate(${g.cx}px, ${Math.max(bottom, sc[1], rot[1]) + 32}px)`;
        label.current.textContent = `${fmt(g.halfW * 2)} × ${fmt(g.halfH * 2)} cm`;
      }
    };
    layerBridge.listeners.add(draw);
    draw();
    return () => {
      layerBridge.listeners.delete(draw);
    };
  }, [active]);

  if (!active) return null;

  const layerId = () => {
    const v = useEditorUi.getState().layersView;
    return v.mode === "layer" ? v.id : null;
  };

  /** Gesto sobre un asa: captura el puntero, actualiza en vivo y guarda un paso al soltar. */
  const gesture = (e: ReactPointerEvent<HTMLButtonElement>, onMove: (dx: number, dy: number, start: { x: number; y: number }) => void) => {
    const id = layerId();
    const g = layerBridge.geometry;
    if (!id || !g) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    layerBridge.setOrbit?.(false);
    const sceneRect = root.current!.getBoundingClientRect();
    const start = { x: e.clientX - sceneRect.left - g.cx, y: e.clientY - sceneRect.top - g.cy };
    const move = (ev: PointerEvent) => {
      const geo = layerBridge.geometry;
      if (!geo) return;
      onMove(ev.clientX - sceneRect.left - geo.cx, ev.clientY - sceneRect.top - geo.cy, start);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      useDesignStore.getState().commitGesture();
      layerBridge.setOrbit?.(true);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const onScale = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const id = layerId();
    const layer = useDesignStore.getState().design.layers.find((l) => l.id === id);
    if (!layer) return;
    const startSize = layer.sizeCm;
    gesture(e, (x, y, start) => {
      const ratio = Math.hypot(x, y) / (Math.hypot(start.x, start.y) || 1);
      const sizeCm = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(startSize * ratio * 10) / 10));
      useDesignStore.getState().updateLayer(layer.id, { sizeCm }, "live");
    });
  };

  const onRotate = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const id = layerId();
    const layer = useDesignStore.getState().design.layers.find((l) => l.id === id);
    if (!layer) return;
    const startRot = layer.rotationDeg;
    gesture(e, (x, y, start) => {
      const delta = ((Math.atan2(y, x) - Math.atan2(start.y, start.x)) * 180) / Math.PI;
      let r = ((((startRot + delta) % 360) + 540) % 360) - 180; // -180..180
      for (const snap of [-180, -90, 0, 90, 180]) if (Math.abs(r - snap) <= SNAP_DEG) r = snap;
      useDesignStore.getState().updateLayer(layer.id, { rotationDeg: Math.round(r) }, "live");
    });
  };

  return (
    <div ref={root} className="layer-handles" style={{ visibility: "hidden" }}>
      <svg className="layer-outline" aria-hidden="true">
        <polygon ref={outline} />
        <line ref={stem} />
      </svg>
      <span ref={label} className="layer-size" aria-hidden="true" />
      <button ref={scaleH} type="button" className="layer-handle" aria-label="Agrandar o achicar la capa (arrastrá)" onPointerDown={onScale}>
        <span aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 14 14 6M9 6h5v5M11 14H6V9" />
          </svg>
        </span>
      </button>
      <button ref={rotateH} type="button" className="layer-handle" aria-label="Rotar la capa (arrastrá)" onPointerDown={onRotate}>
        <span aria-hidden="true">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 9.5a5.5 5.5 0 1 1-1.7-4M14 2.5v3.2h-3.2" />
          </svg>
        </span>
      </button>
    </div>
  );
}

