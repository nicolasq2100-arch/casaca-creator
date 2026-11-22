"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF, useProgress, useTexture } from "@react-three/drei";
import type { GarmentConfig } from "@/garments/garment.config";
import { applyKnitDetail, setKnitStrength, type KnitDetail } from "@/three/knitDetail";
import { drawTestTexture, TEXTURE_SIZE, type TestMode } from "@/three/testTextures";

export interface JerseySceneProps {
  garment: GarmentConfig;
  mode: TestMode;
  color: string;
  knitStrength: number;
}

const HDRI_URL = "/hdri/studio_small_09_1k.hdr";
// El GLB está en metros y centrado; el bajo queda en y ≈ -0,35.
const FLOOR_Y = -0.355;
const CAMERA_TARGET = new THREE.Vector3(0, 0.02, 0);
const MAX_DISTANCE = 2.4;

/** Lo que usamos de OrbitControls (three-stdlib no es dependencia directa). */
interface OrbitControlsImpl {
  target: THREE.Vector3;
  maxDistance: number;
  update(): void;
}

function Jersey({ garment, mode, color, knitStrength }: JerseySceneProps) {
  const { scene, materials } = useGLTF(garment.modelUrl, false, true);
  const knitTexture = useTexture(garment.knit.normalUrl);
  const gl = useThree((s) => s.gl);
  const detailRef = useRef<KnitDetail | null>(null);
  const strengthRef = useRef(knitStrength);
  strengthRef.current = knitStrength;

  // Canvas fuera de pantalla con el diseño; se usa como mapa de color del material "fabric".
  const designCanvas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = TEXTURE_SIZE;
    return canvas;
  }, []);
  const designTexture = useMemo(() => {
    const texture = new THREE.CanvasTexture(designCanvas);
    texture.flipY = false; // mismo criterio que las texturas glTF: v = 0 arriba
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    return texture;
  }, [designCanvas, gl]);

  useEffect(() => {
    const fabric = materials.fabric;
    if (!(fabric instanceof THREE.MeshStandardMaterial)) {
      throw new Error(`${garment.modelUrl}: falta el material "fabric"`);
    }
    fabric.map = designTexture;
    fabric.color.set("#ffffff");
    fabric.roughness = garment.fabric.roughness;
    if (fabric instanceof THREE.MeshPhysicalMaterial) {
      fabric.specularIntensity = garment.fabric.specularIntensity;
      fabric.sheen = garment.fabric.sheen;
      fabric.sheenRoughness = garment.fabric.sheenRoughness;
      fabric.sheenColor.set("#ffffff");
    }
    knitTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
    detailRef.current = applyKnitDetail(fabric, knitTexture, garment.knit.repeatPerUv, strengthRef.current);
    return () => {
      fabric.map = null;
      fabric.needsUpdate = true;
    };
  }, [materials, designTexture, knitTexture, gl, garment]);

  useEffect(() => {
    if (detailRef.current) setKnitStrength(detailRef.current, knitStrength);
  }, [knitStrength]);

  // Se redibuja solo cuando cambia el estado de la prueba.
  useEffect(() => {
    const ctx = designCanvas.getContext("2d");
    if (!ctx) return;
    drawTestTexture(ctx, mode, color, garment);
    designTexture.needsUpdate = true;
  }, [designCanvas, designTexture, mode, color, garment]);

  useEffect(() => () => designTexture.dispose(), [designTexture]);

  return <primitive object={scene} />;
}

// Encuadra la prenda entera según el ancho y alto de la pantalla (en celular manda el ancho).
function FitCamera({ garment }: { garment: GarmentConfig }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || size.height === 0) return;
    const aspect = size.width / size.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitH = (garment.boundsM.h * 1.2) / 2 / tanHalf;
    const fitW = (garment.boundsM.w * 1.15) / 2 / (tanHalf * aspect);
    const distance = Math.max(fitH, fitW);
    const target = controls ? controls.target : CAMERA_TARGET;
    const dir = camera.position.clone().sub(target).normalize();
    camera.position.copy(target).addScaledVector(dir, distance);
    if (controls) {
      controls.maxDistance = Math.max(MAX_DISTANCE, distance * 1.25);
      controls.update();
    }
  }, [camera, size.width, size.height, controls, garment]);

  return null;
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
      Cargando modelo… {Math.round(progress)} %
    </div>
  );
}

export default function JerseyScene(props: JerseySceneProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.08, 1.75], fov: 32, near: 0.01, far: 20 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={["#3b3a38"]} />
        <Suspense fallback={null}>
          <Environment files={HDRI_URL} />
          <Jersey {...props} />
          {/* La camiseta no se mueve: la sombra se calcula una sola vez. */}
          <ContactShadows position={[0, FLOOR_Y, 0]} scale={1.4} opacity={0.55} blur={2.4} far={0.8} resolution={512} frames={1} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={CAMERA_TARGET}
          enablePan={false}
          enableDamping
          minDistance={0.42}
          maxDistance={MAX_DISTANCE}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.56}
        />
        <FitCamera garment={props.garment} />
      </Canvas>
      <LoadingOverlay />
    </div>
  );
}
