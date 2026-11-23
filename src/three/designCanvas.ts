import type { GarmentConfig, PieceSpec } from "@/garments/garment.config";
import type { DesignState } from "@/design/types";
import { relativeLuminance } from "@/palette/colorMath";
import { drawGraphic } from "@/patterns/render";
import { drawLayers } from "@/layers/render";

// Dibuja el DesignState sobre el layout UV de la prenda: x = u * tamaño, y = v * tamaño (v = 0 arriba).

export const TEXTURE_SIZE = 2048;
/** Margen alrededor de cada isla UV para que el mipmapping no mezcle el fondo en los bordes. */
const BLEED_PX = 8;

export interface DesignOverlay {
  /** Guías métricas (cal punteada cada 5 cm, medida cada 10 cm). */
  guides: boolean;
  /** Zona marcada momentáneamente al elegirla. */
  highlightZone: string | null;
  /** Familia tipográfica de las etiquetas de las guías (de next/font). */
  labelFont: string;
}

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: DesignState,
  garment: GarmentConfig,
  overlay: DesignOverlay,
) {
  const size = ctx.canvas.width;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Fondo con el color principal: lo que se filtre por los bordes de las islas es tela, no gris.
  const mainZone = garment.colorZones[0];
  ctx.fillStyle = (mainZone && design.colors[mainZone.id]) || "#FFFFFF";
  ctx.fillRect(0, 0, size, size);

  for (const zone of garment.colorZones) {
    ctx.fillStyle = design.colors[zone.id] ?? zone.defaultHex;
    for (const pieceId of zone.pieces) {
      const piece = garment.pieces[pieceId];
      if (!piece) continue;
      const r = pieceRectPx(piece, size, BLEED_PX);
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // Gráfico de fondo (rayas, paneles, texturas, degradés), por anillos para empalmar en las costuras.
  drawGraphic(ctx, design.graphic, garment);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Capas (escudo, imágenes, textos), recortadas a su pieza.
  drawLayers(ctx, design.layers, garment);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (overlay.guides) drawGuides(ctx, design, garment, size, overlay.labelFont);
  if (overlay.highlightZone) drawHighlight(ctx, design, garment, size, overlay.highlightZone);
  ctx.restore();
}

function pieceRectPx(piece: PieceSpec, size: number, pad = 0) {
  return {
    x: piece.uv.u * size - pad,
    y: piece.uv.v * size - pad,
    w: piece.uv.w * size + pad * 2,
    h: piece.uv.h * size + pad * 2,
  };
}

/** Tinta que contrasta con el color de la tela (tiza sobre oscuro, carbón sobre claro). */
function contrastInk(hex: string, alpha: number) {
  return relativeLuminance(hex) > 0.35 ? `rgba(28, 27, 25, ${alpha})` : `rgba(232, 228, 216, ${alpha})`;
}

function zoneOfPiece(garment: GarmentConfig, pieceId: string) {
  return garment.colorZones.find((z) => (z.pieces as string[]).includes(pieceId));
}

// Guías por pieza, ancladas al borde inferior izquierdo (bajo y costado son rectos en el molde).
function drawGuides(ctx: CanvasRenderingContext2D, design: DesignState, garment: GarmentConfig, size: number, font: string) {
  const pxPerCm = size / garment.cmPerUv;
  for (const [pieceId, piece] of Object.entries(garment.pieces) as [string, PieceSpec][]) {
    const zone = zoneOfPiece(garment, pieceId);
    const fabric = (zone && design.colors[zone.id]) || "#FFFFFF";
    const r = pieceRectPx(piece, size);
    const bottom = r.y + r.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.lineCap = "round";
    for (let cm = 5; cm < piece.sizeCm.w; cm += 5) {
      dotted(ctx, r.x + cm * pxPerCm, r.y, r.x + cm * pxPerCm, bottom, cm % 10 === 0, fabric);
    }
    for (let cm = 5; cm < piece.sizeCm.h; cm += 5) {
      dotted(ctx, r.x, bottom - cm * pxPerCm, r.x + r.w, bottom - cm * pxPerCm, cm % 10 === 0, fabric);
    }
    // Medidas escritas solo en piezas de costados rectos (frente y espalda): en las mangas, que son un tubo,
    // las etiquetas quedan de perfil desde Frente/Espalda y se leen cortadas. Ahí van solo las líneas.
    if (piece.sizeCm.h >= 8 && piece.straightSidesCm) {
      // ~3 cm de alto: legible (≥10 px) con el encuadre por defecto del celular.
      // Solo la primera medida dice "cm" para que entren entre líneas a 10 cm.
      ctx.fillStyle = contrastInk(fabric, 0.9);
      ctx.font = `600 ${Math.round(pxPerCm * 3)}px ${font}`;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      const inset = 1.5 * pxPerCm; // las etiquetas nunca tocan una costura
      // Horizontales (sobre el bajo): solo si la etiqueta entra entera en la pieza.
      for (let cm = 10; cm < piece.sizeCm.w; cm += 10) {
        const text = cm === 10 ? "10 cm" : `${cm}`;
        const x = r.x + cm * pxPerCm + 8;
        if (x + ctx.measureText(text).width <= r.x + r.w - inset) ctx.fillText(text, x, bottom - 8);
      }
      // Verticales: al lado de la línea central (los costados envuelven el cuerpo y se ven de perfil),
      // solo en piezas de costados rectos y por debajo de la sisa.
      if (piece.straightSidesCm) {
        const labelH = 3 * pxPerCm;
        const x = r.x + r.w / 2 + 0.8 * pxPerCm;
        for (let cm = 20; cm * pxPerCm + labelH < piece.straightSidesCm * pxPerCm; cm += 10) {
          ctx.fillText(`${cm}`, x, bottom - cm * pxPerCm - 8);
        }
      }
    }
    ctx.restore();
  }
}

function dotted(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, major: boolean, fabric: string) {
  ctx.strokeStyle = contrastInk(fabric, major ? 0.75 : 0.4);
  ctx.lineWidth = major ? 3 : 2;
  ctx.setLineDash(major ? [2, 10] : [2, 14]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

// Rayado diagonal sobre las piezas de la zona elegida.
function drawHighlight(ctx: CanvasRenderingContext2D, design: DesignState, garment: GarmentConfig, size: number, zoneId: string) {
  const zone = garment.colorZones.find((z) => z.id === zoneId);
  if (!zone) return;
  const fabric = design.colors[zone.id] ?? zone.defaultHex;
  for (const pieceId of zone.pieces) {
    const piece = garment.pieces[pieceId];
    if (!piece) continue;
    const r = pieceRectPx(piece, size, BLEED_PX);
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.strokeStyle = contrastInk(fabric, 0.55);
    ctx.lineWidth = 10;
    const step = 44;
    for (let d = -r.h; d < r.w + r.h; d += step) {
      ctx.beginPath();
      ctx.moveTo(r.x + d, r.y + r.h);
      ctx.lineTo(r.x + d + r.h, r.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
