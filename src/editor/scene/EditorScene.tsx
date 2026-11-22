"use client";

import { Component, Suspense, useEffect, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import type { GarmentConfig } from "@/garments/garment.config";
import { Garment } from "./Garment";
import { CAMERA_TARGET, CameraRig, MAX_DISTANCE } from "./CameraRig";
import { attributeLoadError, useSceneDiag } from "./diagnostics";
import { attachGlGuards, DiagnosticsProbe, readGlInfo } from "./DiagnosticsProbe";
import { ReloadButton, SceneMessage } from "./SceneMessage";

// HDRI con balance de blancos neutro (el original tenía ~2 % de dominante roja que rosaba la tela).
const HDRI_URL = "/hdri/studio_small_09_1k_neutral.hdr";
// Calibrado con 7 colores (ΔE2000 promedio ≈ 1,9 en la tela de frente). Si cambia la luz, volver a medir.
const ENV_INTENSITY = 1.34;
// El GLB está en metros y centrado; el bajo queda en y ≈ -0,35.
const FLOOR_Y = -0.355;
const COAL = "#1C1B19";
/** Si el modelo no aparece en este tiempo, se muestra el error en vez de una escena vacía. */
const LOAD_TIMEOUT_MS = 40_000;

/** Captura errores de una parte de la escena, los registra y muestra `fallback` (o nada). */
class Guard extends Component<{ children: ReactNode; fallback?: ReactNode; onError: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

/** Luces simples para cuando el HDRI no se puede usar: la camiseta se ve (sin la calibración de color). */
function FallbackLights() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#3a3833", 1.6]} />
      <directionalLight position={[0.6, 1.2, 1.6]} intensity={2.2} />
      <directionalLight position={[-1.2, 0.4, -1]} intensity={0.9} />
    </>
  );
}

function MarkReady({ asset }: { asset: "hdr" }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (scene.environment) useSceneDiag.getState().setAsset(asset, "ok");
  }, [scene.environment, asset]);
  return null;
}

function SceneEnvironment() {
  const envMode = useSceneDiag((s) => s.envMode);
  if (envMode === "respaldo") return <FallbackLights />;
  return (
    <Guard
      fallback={<FallbackLights />}
      onError={(e) => {
        const d = useSceneDiag.getState();
        d.logError(`HDRI: ${e.message}`);
        d.setAsset("hdr", "error", e.message);
        d.patch({ envMode: "respaldo" });
      }}
    >
      <Suspense fallback={null}>
        <Environment files={HDRI_URL} environmentIntensity={ENV_INTENSITY} />
        <MarkReady asset="hdr" />
      </Suspense>
    </Guard>
  );
}

function useLoadWatchdog() {
  useEffect(() => {
    const t = setTimeout(() => {
      const d = useSceneDiag.getState();
      if (d.assets.glb.status === "pendiente") d.setFatal("la camiseta tardó demasiado en cargar");
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
}

export default function EditorScene({ garment }: { garment: GarmentConfig }) {
  const fatal = useSceneDiag((s) => s.fatal);
  const loadFailed = useSceneDiag((s) => s.assets.glb.status === "error" || s.assets.knit.status === "error");
  useLoadWatchdog();

  const onSceneError = (e: Error) => {
    const d = useSceneDiag.getState();
    d.logError(e.message);
    attributeLoadError(e.message);
    d.setFatal(/webgl|context/i.test(e.message) ? "no se pudo crear el contexto WebGL" : `falló la escena: ${e.message}`);
  };

  return (
    <>
      {/* Contenedor absoluto: el canvas toma el tamaño de la escena sin depender de alturas en % ni de dvh. */}
      <div className="absolute inset-0">
        <Guard onError={onSceneError}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.06, 1.75], fov: 32, near: 0.01, far: 20 }}
            gl={{ antialias: true, powerPreference: "default" }}
            onCreated={({ gl }) => {
              // Neutral (Khronos PBR Neutral): mantiene el HEX elegido; ACES desatura y corre los rojos.
              gl.toneMapping = THREE.NeutralToneMapping;
              gl.toneMappingExposure = 1;
              gl.outputColorSpace = THREE.SRGBColorSpace;
              const info = readGlInfo(gl);
              // El HDRI se prefiltra en render targets half-float: sin eso queda negro, sin error.
              useSceneDiag.getState().patch({ gl: info, envMode: info.halfFloatTarget ? "hdr" : "respaldo" });
              attachGlGuards(gl);
            }}
          >
            <color attach="background" args={[COAL]} />
            <SceneEnvironment />
            <Suspense fallback={null}>
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
            <DiagnosticsProbe background={COAL} />
          </Canvas>
        </Guard>
      </div>

      {fatal &&
        (loadFailed ? (
          <SceneMessage
            title="No pudimos cargar la camiseta."
            body="Revisá la conexión y recargá la página. Tu borrador sigue guardado en este dispositivo."
            action={<ReloadButton />}
          />
        ) : (
          <SceneMessage
            title="Tu navegador no puede mostrar la camiseta en 3D."
            body="Probá recargar la página o abrirla en otro navegador actualizado. Tus colores siguen guardados en este dispositivo."
            action={<ReloadButton />}
          />
        ))}
    </>
  );
}
