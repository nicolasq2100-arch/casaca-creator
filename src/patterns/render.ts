import type { GarmentConfig, PatternRing } from "@/garments/garment.config";
import type { GraphicState } from "@/design/types";
import { patternsById } from "./registry";
import type { PatternDef, PatternParams } from "./types";

/** Margen (cm) que se dibuja fuera de cada pieza para que el mipmapping no muestre bordes. */
const BLEED_CM = 0.6;

function ringYExtent(ring: PatternRing, garment: GarmentConfig): [number, number] {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of ring.pieces) {
    const spec = garment.pieces[p.piece];
    if (!spec) continue;
    y0 = Math.min(y0, p.yOffsetCm);
    y1 = Math.max(y1, p.yOffsetCm + spec.sizeCm.h);
  }
  return [y0, y1];
}

export function paramsOf(graphic: GraphicState): PatternParams {
  return { channels: graphic.channels, scaleCm: graphic.scaleCm, angleDeg: graphic.angleDeg, variant: graphic.variant };
}

/** Dibuja el gráfico elegido sobre el canvas del diseño (encima de los colores por zona). */
export function drawGraphic(ctx: CanvasRenderingContext2D, graphic: GraphicState | null, garment: GarmentConfig) {
  if (!graphic) return;
  const def = patternsById[graphic.id];
  if (!def) return;
  const size = ctx.canvas.width;
  const pxPerCm = size / garment.cmPerUv;
  const pieces = new Set(
    garment.colorZones.filter((z) => graphic.zones.includes(z.id)).flatMap((z) => z.pieces as string[]),
  );
  const params = paramsOf(graphic);

  for (const ring of garment.patternRings) {
    const [ringYMin, ringYMax] = ringYExtent(ring, garment);
    for (const rp of ring.pieces) {
      if (!pieces.has(rp.piece)) continue;
      const spec = garment.pieces[rp.piece];
      if (!spec) continue;
      const left = spec.uv.u * size;
      const bottom = (spec.uv.v + spec.uv.h) * size;
      const bleedPx = BLEED_CM * pxPerCm;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left - bleedPx, spec.uv.v * size - bleedPx, spec.uv.w * size + bleedPx * 2, spec.uv.h * size + bleedPx * 2);
      ctx.clip();
      // cm del anillo → px del canvas (y hacia arriba).
      ctx.setTransform(pxPerCm, 0, 0, -pxPerCm, left - rp.xOffsetCm * pxPerCm, bottom + rp.yOffsetCm * pxPerCm);
      def.draw({
        ctx,
        ring,
        x0: rp.xOffsetCm - BLEED_CM,
        x1: rp.xOffsetCm + spec.sizeCm.w + BLEED_CM,
        y0: rp.yOffsetCm - BLEED_CM,
        y1: rp.yOffsetCm + spec.sizeCm.h + BLEED_CM,
        pieceOffsetCm: rp.xOffsetCm,
        pieceWidthCm: spec.sizeCm.w,
        ringYMin,
        ringYMax,
        pxPerCm,
        params,
      });
      ctx.restore();
    }
  }
}

/**
 * Miniatura para la galería: un parche de 44 × 44 cm del cuerpo, del centro del pecho hasta pasar la costura
 * del costado (así se ven bandas, fajas y paneles, y que empalman), sobre el color del frente.
 */
export function renderPatternThumb(def: PatternDef | null, baseHex: string, garment: GarmentConfig, sizePx: number, params?: PatternParams) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, sizePx, sizePx);
  const ring = garment.patternRings.find((r) => r.id === "body");
  if (!def || !ring) return canvas;
  const [ringYMin, ringYMax] = ringYExtent(ring, garment);
  const { x0, y0, span } = def.thumb ?? { x0: 18, y0: 14, span: 44 };
  const ppc = sizePx / span;
  ctx.setTransform(ppc, 0, 0, -ppc, -x0 * ppc, sizePx + y0 * ppc);
  def.draw({
    ctx,
    ring,
    x0,
    x1: x0 + span,
    y0,
    y1: y0 + span,
    pieceOffsetCm: x0,
    pieceWidthCm: span,
    ringYMin,
    ringYMax,
    pxPerCm: ppc,
    params: params ?? {
      channels: def.channels.map((c) => c.defaultHex),
      scaleCm: def.scale.default,
      angleDeg: def.angle?.default ?? 0,
      variant: 1,
    },
  });
  return canvas;
}
