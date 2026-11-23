import type { GarmentConfig, PieceId } from "@/garments/garment.config";
import type { Layer } from "@/design/types";
import { imageForLayer } from "@/design/assets";
import { canvasFont, DEFAULT_FONT, ensureFont, textFontsById } from "./fonts";
import { displayText, layerSizeCm } from "./geometry";

/**
 * Dibuja las capas (de abajo hacia arriba) sobre el canvas del diseño. Cada capa queda recortada a su
 * pieza: en v1 no cruza costuras.
 */
export function drawLayers(ctx: CanvasRenderingContext2D, layers: Layer[], garment: GarmentConfig) {
  const size = ctx.canvas.width;
  const ppc = size / garment.cmPerUv;
  for (const layer of layers) {
    if (layer.hidden) continue;
    const spec = garment.pieces[layer.piece as PieceId];
    if (!spec) continue;
    const left = spec.uv.u * size;
    const top = spec.uv.v * size;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.beginPath();
    ctx.rect(left, top, spec.uv.w * size, spec.uv.h * size);
    ctx.clip();
    ctx.translate(left + layer.xCm * ppc, top + layer.yCm * ppc);
    ctx.rotate((layer.rotationDeg * Math.PI) / 180);

    if (layer.kind === "image") {
      const img = imageForLayer(layer.assetId, layer.removeBg);
      if (img) {
        const { w, h } = layerSizeCm(layer);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (-w / 2) * ppc, (-h / 2) * ppc, w * ppc, h * ppc);
      }
    } else {
      const font = textFontsById[layer.fontId] ?? textFontsById[DEFAULT_FONT]!;
      ensureFont(font);
      const capPx = layer.sizeCm * ppc;
      ctx.font = canvasFont(font, capPx);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const text = displayText(layer);
      const baseline = capPx / 2; // mayúsculas centradas en el punto de la capa
      if (layer.outline.widthCm > 0) {
        // Contorno por fuera: trazo del doble de ancho, debajo del relleno (no se come el número).
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = layer.outline.widthCm * 2 * ppc;
        ctx.strokeStyle = layer.outline.color;
        ctx.strokeText(text, 0, baseline);
      }
      ctx.fillStyle = layer.color;
      ctx.fillText(text, 0, baseline);
    }
    ctx.restore();
  }
}
