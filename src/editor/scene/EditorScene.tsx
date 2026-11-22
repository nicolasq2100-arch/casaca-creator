"use client";

import { Component, Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import type { GarmentConfig } from "@/garments/garment.config";
import { Garment } from "./Garment";
import { CAMERA_TARGET, CameraRig, MAX_DISTANCE } from "./CameraRig";

// HDRI con balance de blancos neutro (el original tenía ~2 % de dominante roja que rosaba la tela).
const HDRI_URL = "/hdri/studio_small_09_1k_neutral.hdr";
// Calibrado con 7 colores (ΔE2000 promedio ≈ 1,9 en la tela de frente). Si cambia la luz, volver a medir.
const ENV_INTENSITY = 1.34;
// El GLB está en metros y centrado; el bajo queda en y ≈ -0,35.
const FLOOR_Y = -0.355;
const COAL = "#1C1B19";

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <SceneMessage
          title="No pudimos cargar la camiseta."
          body="Revisá la conexión y recargá la página. Tu borrador sigue guardado en este dispositivo."
        />
      );
    }
    return this.props.children;
  }
}

export function SceneMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full items-center justify-center px-8 text-center">
      <div className="max-w-xs">
        <p className="font-label text-base font-semibold uppercase tracking-[0.06em] text-chalk">{title}</p>
        <p className="mt-2 text-sm text-chalk/75">{body}</p>
      </div>
    </div>
  );
}

export default function EditorScene({ garment }: { garment: GarmentConfig }) {
  return (
    <SceneErrorBoundary>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.06, 1.75], fov: 32, near: 0.01, far: 20 }}
        gl={{ antialias: true }}
        fallback={
          <SceneMessage
            title="Tu navegador no puede mostrar la camiseta en 3D."
            body="Probá con Chrome, Safari o Firefox actualizados. Tus colores se siguen guardando igual."
          />
        }
        onCreated={({ gl }) => {
          // Neutral (Khronos PBR Neutral): mantiene el HEX elegido; ACES desatura y corre los rojos.
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={[COAL]} />
        <Suspense fallback={null}>
          <Environment files={HDRI_URL} environmentIntensity={ENV_INTENSITY} />
          <Garment garment={garment} />
          {/* La camiseta no se mueve: la sombra se calcula una sola vez. */}
          <ContactShadows position={[0, FLOOR_Y, 0]} scale={1.4} opacity={0.7} blur={2.4} far={0.8} resolution={512} frames={1} />
        </Suspense>
        <OrbitControls
          makeDefault
          target={CAMERA_TARGET}
          enablePan={false}
          enableDamping
          minDistance={0.36}
          maxDistance={MAX_DISTANCE}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.56}
        />
        <CameraRig garment={garment} />
      </Canvas>
    </SceneErrorBoundary>
  );
}
