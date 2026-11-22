"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import type { GarmentConfig } from "@/garments/garment.config";
import { useDesignStore } from "@/design/store";
import { useEditorUi } from "@/editor/uiStore";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { applyFabricShader, type FabricShader } from "@/three/fabricShader";
import { drawDesign, TEXTURE_SIZE } from "@/three/designCanvas";
import { useSceneDiag } from "./diagnostics";

const TINT_MS = 260;
/**
 * Lado de la textura del diseño. En celulares se usa 1536 (9 MB por canvas en vez de 16 MB):
 * iOS Safari corta el contexto WebGL o niega canvas 2D cuando se pasa de memoria, y en pantalla chica
 * no hay diferencia visible. La ficha de fábrica usa los originales, no esta textura.
 */
function designTextureSize(gl: THREE.WebGLRenderer) {
  const mobile = window.matchMedia("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) < 820;
  return Math.min(mobile ? 1536 : TEXTURE_SIZE, gl.capabilities.maxTextureSize);
}

// Decodificador de meshopt de three (meshoptimizer 1.1), más nuevo que el que trae drei.
const useMeshopt = (loader: { setMeshoptDecoder: (d: unknown) => unknown }) => {
  loader.setMeshoptDecoder(MeshoptDecoder);
};
const HIGHLIGHT_MS = 650;
/** Radio (m) desde el centro de la prenda que cubre el teñido. */
const TINT_RADIUS = 0.46;

function labelFontFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--ff-body").trim();
  return v || "system-ui, sans-serif";
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Garment({ garment }: { garment: GarmentConfig }) {
  const { scene, materials } = useGLTF(garment.modelUrl, false, false, useMeshopt);
  const knitTexture = useTexture(garment.knit.normalUrl);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  // Si llegamos acá, el modelo y la trama cargaron (Suspense los esperó).
  useEffect(() => {
    const d = useSceneDiag.getState();
    d.setAsset("glb", "ok");
    d.setAsset("knit", "ok");
  }, []);

  const design = useDesignStore((s) => s.design);
  const lastChange = useDesignStore((s) => s.lastChange);
  const guides = useEditorUi((s) => s.guides);
  const highlight = useEditorUi((s) => s.highlight);
  const [highlightZone, setHighlightZone] = useState<string | null>(null);

  // Dos canvas que se alternan: el que muestra el diseño nuevo y el que conserva el anterior para el teñido.
  // Así cada cambio sube una sola textura a la GPU.
  const surfaces = useMemo(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    const side = designTextureSize(gl);
    useSceneDiag.getState().patch({ designTextureSize: side });
    return [0, 1].map(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = side;
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
  const tintedNonce = useRef(-1);

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
  // El dibujo se agrupa en un cuadro: mientras se arrastra un slider se dibuja como mucho una vez por cuadro.
  useEffect(() => {
    const fabric = materials.fabric;
    if (!(fabric instanceof THREE.MeshStandardMaterial)) return;
    // El teñido acompaña una sola vez a cada cambio discreto (no al redibujar por guías o por la marca de zona).
    const animate =
      (lastChange.kind === "color" || lastChange.kind === "graphic") &&
      lastChange.nonce !== tintedNonce.current &&
      !prefersReducedMotion();
    tintedNonce.current = lastChange.nonce;
    const frame = requestAnimationFrame(() => {
      const prev = surfaces[current.current]!;
      const nextIndex = 1 - current.current;
      const next = surfaces[nextIndex]!;
      const ctx = next.canvas.getContext("2d");
      if (!ctx) {
        // iOS niega el canvas 2D cuando se pasa del límite de memoria: sin esto la tela queda negra.
        useSceneDiag.getState().setFatal("el navegador no dio memoria para la textura del diseño (canvas 2D)");
        return;
      }
      drawDesign(ctx, design, garment, { guides, highlightZone, labelFont: labelFontFamily() });
      next.texture.needsUpdate = true;
      fabric.map = next.texture;
      if (fabric instanceof THREE.MeshPhysicalMaterial) fabric.sheenColorMap = next.texture;
      const inner = materials.inner;
      if (inner instanceof THREE.MeshStandardMaterial) inner.map = next.texture;
      current.current = nextIndex;

      const shader = shaderRef.current;
      if (shader) {
        shader.uniforms.prevMap.value = prev.texture;
        tint.current = animate ? { start: performance.now() } : null;
        shader.uniforms.tintProgress.value = animate ? 0 : 1;
      }
      invalidate();
    });
    return () => cancelAnimationFrame(frame);
    // lastChange se lee a propósito sin ser dependencia: el teñido acompaña al cambio de diseño.
  }, [design, guides, highlightZone, surfaces, materials, garment, invalidate]);

  useEffect(() => {
    // Cara interior: la misma textura del diseño, oscurecida. Cada pieza muestra su propio color por dentro
    // (con un solo color, el frente teñía el interior de la espalda y asomaba en costuras y puños).
    const inner = materials.inner;
    if (!(inner instanceof THREE.MeshStandardMaterial)) return;
    inner.map = surfaces[current.current]!.texture;
    inner.color.setScalar(garment.fabric.innerShade);
    inner.needsUpdate = true;
    return () => {
      inner.map = null;
      inner.needsUpdate = true;
    };
  }, [materials, surfaces, garment]);

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
