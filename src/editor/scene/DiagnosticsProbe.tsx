"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { useSceneDiag } from "./diagnostics";

/** Datos del contexto WebGL que realmente usa la escena. */
export function readGlInfo(gl: THREE.WebGLRenderer) {
  const ctx = gl.getContext();
  const dbg = ctx.getExtension("WEBGL_debug_renderer_info");
  return {
    webgl2: typeof WebGL2RenderingContext !== "undefined" && ctx instanceof WebGL2RenderingContext,
    renderer: String(dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)),
    vendor: String(dbg ? ctx.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : ctx.getParameter(ctx.VENDOR)),
    maxTextureSize: Number(ctx.getParameter(ctx.MAX_TEXTURE_SIZE)),
    halfFloatTarget: !!ctx.getExtension("EXT_color_buffer_half_float") || !!ctx.getExtension("EXT_color_buffer_float"),
    floatTarget: !!ctx.getExtension("EXT_color_buffer_float"),
    floatLinear: !!ctx.getExtension("OES_texture_float_linear"),
    maxSamplers: Number(ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS)),
  };
}

/** Errores de shader y pérdida de contexto: sin esto, en iOS la escena queda vacía sin ningún aviso. */
export function attachGlGuards(gl: THREE.WebGLRenderer) {
  const diag = useSceneDiag.getState();
  gl.debug.checkShaderErrors = true;
  gl.debug.onShaderError = (ctx, program, vs, fs) => {
    const log = [ctx.getProgramInfoLog(program), ctx.getShaderInfoLog(vs), ctx.getShaderInfoLog(fs)]
      .filter(Boolean)
      .join(" | ")
      .trim();
    console.error("Error de shader:", log);
    diag.setFatal(`no compiló un shader del 3D (${log.slice(0, 300) || "sin detalle"})`);
  };
  const canvas = gl.domElement;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    useSceneDiag.getState().patch({ contextLost: true });
    useSceneDiag.getState().setFatal("el navegador cortó el 3D (contexto WebGL perdido, suele ser falta de memoria)");
  });
}

/** Mide tamaños, cuadros y si la camiseta realmente se ve. Va dentro del <Canvas>. */
export function DiagnosticsProbe({ background }: { background: string }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const viewportDpr = useThree((s) => s.viewport.dpr);
  const modelReady = useSceneDiag((s) => s.assets.glb.status === "ok");
  const frames = useRef(0);
  const checks = useRef({ readyFrame: -1, done: false, misses: 0 });

  useEffect(() => {
    const buf = gl.getDrawingBufferSize(new THREE.Vector2());
    useSceneDiag.getState().patch({
      canvas: { css: [Math.round(size.width), Math.round(size.height)], buffer: [buf.x, buf.y], dpr: viewportDpr },
    });
  }, [gl, size.width, size.height, viewportDpr]);

  useEffect(() => {
    const bg = new THREE.Color(background);
    const bgRgb = [bg.r, bg.g, bg.b].map((c) => Math.round(c * 255));
    const pixels = new Uint8Array(9 * 9 * 4);

    return addAfterEffect(() => {
      frames.current += 1;
      const n = frames.current;
      const diag = useSceneDiag.getState();
      if (n % 30 === 0) {
        diag.patch({
          frames: n,
          lastRender: {
            calls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            programs: gl.info.programs?.length ?? 0,
            textures: gl.info.memory.textures,
          },
        });
      }
      // Prueba de píxeles: ~30 cuadros después de que cargó el modelo, y de nuevo más tarde si falló.
      const c = checks.current;
      if (!modelReady || c.done || diag.fatal) return;
      if (c.readyFrame < 0) c.readyFrame = n;
      if (n - c.readyFrame !== 30 && n - c.readyFrame !== 120) return;
      const ctx = gl.getContext();
      const w = ctx.drawingBufferWidth;
      const h = ctx.drawingBufferHeight;
      ctx.readPixels(Math.floor(w / 2) - 4, Math.floor(h / 2) - 4, 9, 9, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
      let maxDiff = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        for (let k = 0; k < 3; k++) maxDiff = Math.max(maxDiff, Math.abs(pixels[i + k]! - bgRgb[k]!));
      }
      const center = 40 * 4;
      const sample = `#${[pixels[center], pixels[center + 1], pixels[center + 2]].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")}`;
      if (maxDiff > 4) {
        c.done = true;
        diag.patch({ drawn: { state: "sí", sample } });
      } else if (++c.misses >= 2) {
        c.done = true;
        diag.patch({ drawn: { state: "no", sample } });
        diag.setFatal("la camiseta cargó pero no se dibuja en la pantalla");
      }
    });
  }, [gl, background, modelReady]);

  return null;
}
