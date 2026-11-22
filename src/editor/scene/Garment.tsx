"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import type { GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { useEditorUi } from "@/editor/uiStore";
import { applyFabricShader, type FabricShader } from "@/three/fabricShader";
import { drawDesign, TEXTURE_SIZE } from "@/three/designCanvas";

const TINT_MS = 260;
const HIGHLIGHT_MS = 650;
/** Radio (m) desde el centro de la prenda que cubre el teñido. */
const TINT_RADIUS = 0.46;

function labelFontFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--ff-label").trim();
  return v || "system-ui, sans-serif";
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Garment({ garment }: { garment: GarmentConfig }) {
  const { scene, materials } = useGLTF(garment.modelUrl, false, true);
  const knitTexture = useTexture(garment.knit.normalUrl);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const design = useDesignStore((s) => s.design);
  const lastChange = useDesignStore((s) => s.lastChange);
  const guides = useEditorUi((s) => s.guides);
  const highlight = useEditorUi((s) => s.highlight);
  const [highlightZone, setHighlightZone] = useState<string | null>(null);

  // Dos canvas que se alternan: el que muestra el diseño nuevo y el que conserva el anterior para el teñido.
  // Así cada cambio sube una sola textura a la GPU.
  const surfaces = useMemo(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    return [0, 1].map(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = TEXTURE_SIZE;
      const texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false; // mismo criterio que las texturas glTF: v = 0 arriba
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      return { canvas, texture };
    });
  }, [gl]);
  const current = useRef(0);
  const shaderRef = useRef<FabricShader | null>(null);
  const tint = useRef<{ start: number } | null>(null);

  // Material de tela: acabado de la config, trama de punto y teñido.
  useEffect(() => {
    const fabric = materials.fabric;
    if (!(fabric instanceof THREE.MeshStandardMaterial)) {
      throw new Error(`${garment.modelUrl}: falta el material "fabric"`);
    }
    const first = surfaces[current.current]!;
    fabric.map = first.texture;
    fabric.color.set("#ffffff");
    fabric.roughness = garment.fabric.roughness;
    if (fabric instanceof THREE.MeshPhysicalMaterial) {
      fabric.specularIntensity = garment.fabric.specularIntensity;
      fabric.sheen = garment.fabric.sheen;
      fabric.sheenRoughness = garment.fabric.sheenRoughness;
      // Sheen del color de la tela: un sheen blanco aclara todo y corre los rojos al salmón.
      fabric.sheenColor.set("#ffffff");
      fabric.sheenColorMap = first.texture;
    }
    knitTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
    shaderRef.current = applyFabricShader(
      fabric,
      { texture: knitTexture, repeatPerUv: garment.knit.repeatPerUv, strength: garment.fabric.knitStrength },
      TINT_RADIUS,
    );
    return () => {
      fabric.map = null;
      if (fabric instanceof THREE.MeshPhysicalMaterial) fabric.sheenColorMap = null;
      fabric.needsUpdate = true;
    };
  }, [materials, surfaces, knitTexture, gl, garment]);

  // Marca de zona: se dibuja un instante y se va.
  useEffect(() => {
    if (!highlight) return;
    setHighlightZone(highlight.zoneId);
    const t = setTimeout(() => setHighlightZone(null), HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [highlight]);

  // Se redibuja solo cuando cambia el diseño o lo que se superpone (guías, marca de zona).
  useEffect(() => {
    const fabric = materials.fabric;
    if (!(fabric instanceof THREE.MeshStandardMaterial)) return;
    const prev = surfaces[current.current]!;
    const nextIndex = 1 - current.current;
    const next = surfaces[nextIndex]!;
    const ctx = next.canvas.getContext("2d");
    if (!ctx) return;
    drawDesign(ctx, design, garment, { guides, highlightZone, labelFont: labelFontFamily() });
    next.texture.needsUpdate = true;
    fabric.map = next.texture;
    if (fabric instanceof THREE.MeshPhysicalMaterial) fabric.sheenColorMap = next.texture;
    current.current = nextIndex;

    const shader = shaderRef.current;
    if (shader) {
      shader.uniforms.prevMap.value = prev.texture;
      const animate = lastChange.kind === "color" && !prefersReducedMotion();
      tint.current = animate ? { start: performance.now() } : null;
      shader.uniforms.tintProgress.value = animate ? 0 : 1;
    }
    invalidate();
    // lastChange se lee a propósito sin ser dependencia: el teñido acompaña al cambio de diseño.
  }, [design, guides, highlightZone, surfaces, materials, garment, invalidate]);

  // Cara interior: el color principal, un poco más oscuro.
  useEffect(() => {
    const inner = materials.inner;
    const mainZone = garment.colorZones[0];
    if (!(inner instanceof THREE.MeshStandardMaterial) || !mainZone) return;
    inner.color.set(design.colors[mainZone.id] ?? mainZone.defaultHex).multiplyScalar(garment.fabric.innerShade);
  }, [materials, design, garment]);

  useEffect(() => () => surfaces.forEach((s) => s.texture.dispose()), [surfaces]);

  useFrame(() => {
    const shader = shaderRef.current;
    if (!shader || !tint.current) return;
    const t = Math.min(1, (performance.now() - tint.current.start) / TINT_MS);
    shader.uniforms.tintProgress.value = 1 - Math.pow(1 - t, 3); // ease-out, sin rebote
    if (t >= 1) tint.current = null;
  });

  return <primitive object={scene} />;
}
