"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { layerBridge } from "@/editor/layerBridge";
import { currentEditTarget } from "@/editor/editTargets";
import { cmToUv, hitLayer, layerSizeCm, uvToPieceCm } from "@/layers/geometry";
import { UvIndex } from "./uvIndex";

/** Lo que usamos de OrbitControls. */
interface ControlsLike {
  enabled: boolean;
}

/**
 * Capas sobre el 3D: tocar una capa la elige y arrastrarla la mueve (solo con Capas abierta).
 * Además publica cada cuadro dónde queda la capa elegida en pantalla, para las asas (LayerHandles).
 */
export function LayerManipulator({ garment, root }: { garment: GarmentConfig; root: THREE.Object3D }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const indexes = useRef(new Map<string, UvIndex>());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    for (const id of Object.keys(garment.pieces)) {
      const o = root.getObjectByName(id);
      if (o && (o as THREE.Mesh).isMesh) list.push(o as THREE.Mesh);
    }
    return list;
  }, [root, garment]);

  const indexFor = (piece: string) => {
    let idx = indexes.current.get(piece);
    if (!idx) {
      const mesh = meshes.find((m) => m.name === piece);
      if (!mesh) return null;
      idx = new UvIndex(mesh);
      indexes.current.set(piece, idx);
    }
    return idx;
  };

  // Puente: punto de la tela bajo el puntero, y giro de cámara.
  useEffect(() => {
    const ndc = new THREE.Vector2();
    layerBridge.pick = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit?.uv) return null;
      return uvToPieceCm(garment, hit.uv.x, hit.uv.y);
    };
    layerBridge.setOrbit = (enabled) => {
      if (controls) controls.enabled = enabled;
    };
    return () => {
      layerBridge.pick = null;
      layerBridge.setOrbit = null;
    };
  }, [gl, camera, raycaster, meshes, garment, controls]);

  // Solo la capa elegida se arrastra (así una capa grande no bloquea el giro de la camiseta).
  // Tocar otra capa, sin arrastrar, la elige. Escucha en captura para frenar el giro de cámara a tiempo.
  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      const t = currentEditTarget();
      if (!t || !layerBridge.pick || !e.isPrimary) return;
      const hit = layerBridge.pick(e.clientX, e.clientY);
      if (!hit) return;
      const layers = t.layers;
      const under = (l: (typeof layers)[number]) => !l.hidden && l.piece === hit.piece && hitLayer(l, hit.xCm, hit.yCm, 0.5);
      const selected = layers.find((l) => l.id === t.selectedId && under(l));
      if (!selected) {
        const tapped = [...layers].reverse().find(under);
        if (!tapped) return;
        // Un toque (menos de 6 px de movimiento) la elige; si se arrastra, gira la cámara como siempre.
        const start = { x: e.clientX, y: e.clientY };
        const onTapUp = (ev: PointerEvent) => {
          el.removeEventListener("pointerup", onTapUp);
          el.removeEventListener("pointercancel", onTapUp);
          if (ev.type === "pointerup" && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) t.select(tapped.id);
        };
        el.addEventListener("pointerup", onTapUp);
        el.addEventListener("pointercancel", onTapUp);
        return;
      }
      const target = selected;
      layerBridge.setOrbit?.(false);
      el.setPointerCapture(e.pointerId);
      const off = { x: target.xCm - hit.xCm, y: target.yCm - hit.yCm };
      const onMove = (ev: PointerEvent) => {
        const h = layerBridge.pick?.(ev.clientX, ev.clientY);
        if (!h || h.piece !== target.piece) return;
        t.update(target.id, { xCm: round1(h.xCm + off.x), yCm: round1(h.yCm + off.y) }, "live");
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        useDesignStore.getState().commitGesture();
        layerBridge.setOrbit?.(true);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    };
    el.addEventListener("pointerdown", onDown, { capture: true });
    return () => el.removeEventListener("pointerdown", onDown, { capture: true });
  }, [gl]);

  // Cada cuadro: dónde queda la capa elegida en pantalla.
  const tmp = useMemo(
    () => ({ p0: new THREE.Vector3(), n0: new THREE.Vector3(), px: new THREE.Vector3(), py: new THREE.Vector3(), n: new THREE.Vector3(), toCam: new THREE.Vector3() }),
    [],
  );
  useFrame(() => {
    const t = currentEditTarget();
    const layer = t?.selectedId ? t.layers.find((l) => l.id === t.selectedId) : null;
    if (!layer || layer.hidden) {
      if (layerBridge.geometry) {
        layerBridge.geometry = null;
        layerBridge.emit();
      }
      return;
    }
    const idx = indexFor(layer.piece);
    const at = (x: number, y: number, out: THREE.Vector3, nOut: THREE.Vector3) => {
      const uv = cmToUv(garment, layer.piece, x, y);
      return !!uv && !!idx && idx.locate(uv.u, uv.v, out, nOut);
    };
    // Centro y un cm en x / y (si un lado cae fuera de la pieza, se mide hacia el otro).
    const ok0 = at(layer.xCm, layer.yCm, tmp.p0, tmp.n0);
    let sx = 1, sy = 1;
    let okx = at(layer.xCm + 1, layer.yCm, tmp.px, tmp.n);
    if (!okx) { sx = -1; okx = at(layer.xCm - 1, layer.yCm, tmp.px, tmp.n); }
    let oky = at(layer.xCm, layer.yCm + 1, tmp.py, tmp.n);
    if (!oky) { sy = -1; oky = at(layer.xCm, layer.yCm - 1, tmp.py, tmp.n); }
    if (!ok0 || !okx || !oky) {
      layerBridge.geometry = null;
      layerBridge.emit();
      return;
    }
    tmp.toCam.copy(camera.position).sub(tmp.p0).normalize();
    const visible = tmp.n0.dot(tmp.toCam) > 0.08;
    const project = (v: THREE.Vector3): [number, number] => {
      const p = v.clone().project(camera);
      return [((p.x + 1) / 2) * size.width, ((1 - p.y) / 2) * size.height];
    };
    const c = project(tmp.p0), x = project(tmp.px), y = project(tmp.py);
    const { w, h } = layerSizeCm(layer);
    layerBridge.geometry = {
      visible,
      cx: c[0],
      cy: c[1],
      jx: [(x[0] - c[0]) * sx, (x[1] - c[1]) * sx],
      jy: [(y[0] - c[0]) * sy, (y[1] - c[1]) * sy],
      halfW: w / 2,
      halfH: h / 2,
      rotationDeg: layer.rotationDeg,
      canRotate: t!.canRotate,
      labelW: layer.kind === "text" ? w - layer.outline.widthCm * 2 : w,
      labelH: layer.kind === "text" ? layer.sizeCm : h,
    };
    layerBridge.emit();
  });

  return null;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
