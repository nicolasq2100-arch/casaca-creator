"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { GarmentConfig } from "@/garments/garment.config";
import { useEditorUi, type CameraView } from "@/editor/uiStore";

export const CAMERA_TARGET = new THREE.Vector3(0, 0.035, 0);
export const MAX_DISTANCE = 2.4;
const VIEW_MS = 480;
const VIEW_AZIMUTH: Record<CameraView, number> = { front: 0, side: Math.PI / 2, back: Math.PI };

/** Lo que usamos de OrbitControls (three-stdlib no es dependencia directa). */
interface OrbitControlsLike {
  target: THREE.Vector3;
  maxDistance: number;
  update(): void;
  getAzimuthalAngle(): number;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Encuadra la prenda según el tamaño de la escena y anima las vistas rápidas (Frente, Espalda, Costado). */
export function CameraRig({ garment }: { garment: GarmentConfig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsLike | null;
  const viewRequest = useEditorUi((s) => s.viewRequest);
  const setCurrentView = useEditorUi((s) => s.setCurrentView);
  const anim = useRef<{ from: number; to: number; start: number } | null>(null);

  // Encuadre: en celular manda el ancho; se deja aire arriba para los controles de la escena.
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || size.height === 0) return;
    const aspect = size.width / size.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitH = (garment.boundsM.h * 1.34) / 2 / tanHalf;
    const fitW = (garment.boundsM.w * 1.18) / 2 / (tanHalf * aspect);
    const distance = Math.max(fitH, fitW);
    const target = controls ? controls.target : CAMERA_TARGET;
    const dir = camera.position.clone().sub(target).normalize();
    camera.position.copy(target).addScaledVector(dir, distance);
    if (controls) {
      controls.maxDistance = Math.max(MAX_DISTANCE, distance * 1.25);
      controls.update();
    }
  }, [camera, size.width, size.height, controls, garment]);

  useEffect(() => {
    if (!viewRequest || !controls) return;
    const from = controls.getAzimuthalAngle();
    const to = from + wrap(VIEW_AZIMUTH[viewRequest.view] - from);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anim.current = { from, to, start: reduced ? -Infinity : performance.now() };
  }, [viewRequest, controls]);

  useFrame(() => {
    if (!controls) return;
    if (anim.current) {
      const { from, to, start } = anim.current;
      const t = Math.min(1, (performance.now() - start) / VIEW_MS);
      const k = 1 - Math.pow(1 - t, 3);
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta = from + (to - from) * k;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      controls.update();
      if (t >= 1) anim.current = null;
    }
    const az = controls.getAzimuthalAngle();
    const near = (Object.entries(VIEW_AZIMUTH) as [CameraView, number][]).find(
      ([, a]) => Math.abs(wrap(az - a)) < THREE.MathUtils.degToRad(12) || Math.abs(wrap(az + a)) < THREE.MathUtils.degToRad(12),
    );
    setCurrentView(near ? near[0] : null);
  });

  return null;
}
