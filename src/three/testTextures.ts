import type { GarmentConfig, PieceSpec } from "@/garments/garment.config";

// Texturas de prueba técnica (no son diseño final). Se dibujan sobre el mismo canvas que después
// va a usar el editor, en espacio UV: x = u * tamaño, y = v * tamaño (v = 0 arriba).

export const TEXTURE_SIZE = 2048;
export type TestMode = "solid" | "uv" | "cm";

export function drawTestTexture(
  ctx: CanvasRenderingContext2D,
  mode: TestMode,
  color: string,
  garment: GarmentConfig,
) {
  const size = ctx.canvas.width;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  if (mode === "solid") drawSolid(ctx, size, color);
  else if (mode === "uv") drawUvGrid(ctx, size);
  else drawCmGrid(ctx, size, garment);
  ctx.restore();
}

function drawSolid(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

// Damero de 16 × 16 con nombre de celda y un círculo: si una pieza se deforma, los círculos
// dejan de ser redondos; si se espeja, los textos se leen al revés.
function drawUvGrid(ctx: CanvasRenderingContext2D, size: number) {
  const n = 16;
  const cell = size / n;
  const cols = "ABCDEFGHIJKLMNOP";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = col * cell;
      const y = row * cell;
      const dark = (row + col) % 2 === 1;
      ctx.fillStyle = dark ? "#2f4b7c" : "#f1efe9";
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = dark ? "#f1efe9" : "#2f4b7c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, cell * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = dark ? "#ffffff" : "#1c1b19";
      ctx.font = `bold ${Math.round(cell * 0.3)}px system-ui, sans-serif`;
      ctx.fillText(`${cols[col]}${row + 1}`, x + cell / 2, y + cell / 2);
      // Flecha "arriba" del UV, para ver la orientación de cada pieza.
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y + cell * 0.04);
      ctx.lineTo(x + cell / 2 - cell * 0.06, y + cell * 0.12);
      ctx.lineTo(x + cell / 2 + cell * 0.06, y + cell * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Rojo en u = 0 y v = 0 (bordes izquierdo y superior) para detectar un UV dado vuelta.
  ctx.fillStyle = "#d62828";
  ctx.fillRect(0, 0, size, 8);
  ctx.fillRect(0, 0, 8, size);
}

// Grilla de 5 cm por pieza, anclada al borde inferior izquierdo de cada una (bajo y costado son rectos
// en el molde), con reglas cada 10 cm y el recuadro del escudo del DXF.
function drawCmGrid(ctx: CanvasRenderingContext2D, size: number, garment: GarmentConfig) {
  const pxPerCm = size / garment.cmPerUv;
  ctx.fillStyle = "#55524c";
  ctx.fillRect(0, 0, size, size);

  for (const [id, spec] of Object.entries(garment.pieces) as [string, PieceSpec][]) {
    const x0 = spec.uv.u * size;
    const y0 = spec.uv.v * size;
    const w = spec.uv.w * size;
    const h = spec.uv.h * size;
    const bottom = y0 + h;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, w, h);
    ctx.clip();
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(x0, y0, w, h);

    for (let cm = 0; cm <= spec.sizeCm.w + 0.01; cm += 5) {
      const x = x0 + cm * pxPerCm;
      line(ctx, x, y0, x, bottom, cm % 10 === 0 ? 3 : 1.5, cm % 10 === 0 ? "#1c1b19" : "#8d887d");
    }
    for (let cm = 0; cm <= spec.sizeCm.h + 0.01; cm += 5) {
      const y = bottom - cm * pxPerCm;
      line(ctx, x0, y, x0 + w, y, cm % 10 === 0 ? 3 : 1.5, cm % 10 === 0 ? "#1c1b19" : "#8d887d");
    }

    // Reglas en cm (solo en piezas donde entran).
    if (spec.sizeCm.h >= 8) {
      ctx.fillStyle = "#c2410c";
      ctx.font = `bold ${Math.round(pxPerCm * 1.3)}px system-ui, sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      for (let cm = 10; cm < spec.sizeCm.w; cm += 10) ctx.fillText(`${cm}`, x0 + cm * pxPerCm + 4, bottom - 4);
      for (let cm = 10; cm < spec.sizeCm.h; cm += 10) ctx.fillText(`${cm}`, x0 + 6, bottom - cm * pxPerCm - 4);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#1c1b19";
      ctx.font = `bold ${Math.round(pxPerCm * 1.6)}px system-ui, sans-serif`;
      ctx.fillText(
        `${spec.label} · ${fmt(spec.sizeCm.w)} × ${fmt(spec.sizeCm.h)} cm`,
        x0 + w / 2,
        y0 + h * (id === "front" || id === "back" ? 0.78 : 0.55),
      );
    }

    if (id === "front") {
      // Línea central del frente.
      ctx.setLineDash([pxPerCm * 1.2, pxPerCm * 0.8]);
      line(ctx, x0 + w / 2, y0, x0 + w / 2, bottom, 3, "#c2410c");
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  for (const zone of garment.zones) {
    const spec = garment.pieces[zone.piece];
    if (!spec) continue;
    const zx = spec.uv.u * size + zone.xCm * pxPerCm;
    const zy = spec.uv.v * size + zone.yCm * pxPerCm;
    const zw = zone.wCm * pxPerCm;
    const zh = zone.hCm * pxPerCm;
    ctx.fillStyle = "rgba(232, 86, 42, 0.35)";
    ctx.fillRect(zx, zy, zw, zh);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e8562a";
    ctx.strokeRect(zx, zy, zw, zh);

    // Cota desde la línea central hasta el centro del recuadro.
    const centerX = spec.uv.u * size + (spec.sizeCm.w / 2) * pxPerCm;
    const zoneCx = zx + zw / 2;
    const offsetCm = (zoneCx - centerX) / pxPerCm;
    const dimY = zy + zh + pxPerCm * 1.5;
    line(ctx, centerX, dimY, zoneCx, dimY, 3, "#e8562a");
    ctx.fillStyle = "#1c1b19";
    ctx.font = `bold ${Math.round(pxPerCm * 1.1)}px system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    // El texto arranca en la línea central para no salirse de la pieza.
    ctx.fillText(`Escudo ${fmt(zone.wCm)} × ${fmt(zone.hCm)} cm`, centerX + 8, zy + zh + pxPerCm * 2.2);
    ctx.fillText(
      `${fmt(Math.abs(offsetCm))} cm del centro · ${fmt(zone.yCm)} cm del hombro`,
      centerX + 8,
      zy + zh + pxPerCm * 3.6,
    );
  }
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
