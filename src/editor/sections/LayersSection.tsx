"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { GarmentConfig, PieceId } from "@/garments/garment.config";
import type { ImageLayer, Layer, TextLayer } from "@/design/types";
import { MAX_LAYERS, MAX_TEXT_LENGTH, newLayerId, useDesignStore } from "@/design/store";
import { ACCEPTED_TYPES, imageForLayer, saveUpload, UploadError, useAssets, type AssetMeta } from "@/design/assets";
import { colorLabel, relativeLuminance } from "@/palette/colorMath";
import { DEFAULT_FONT, ensureFont, fontFamily, textFonts, textFontsById } from "@/layers/fonts";
import { displayText, layerSizeCm } from "@/layers/geometry";
import { useEditorUi } from "@/editor/uiStore";
import { ColorPicker, Swatch, usedDesignColors } from "@/editor/ColorPicker";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MinusIcon,
  PlusIcon,
  TextIcon,
  TrashIcon,
  UploadIcon,
} from "@/editor/icons";

/** Debajo de esto (px del original por cm impreso, ~100 dpi) avisamos que puede salir pixelado. */
const MIN_PX_PER_CM = 40;
const fmt = (n: number, d = 1) => n.toLocaleString("es-AR", { maximumFractionDigits: d });
const round1 = (v: number) => Math.round(v * 10) / 10;
const floor1 = (v: number) => Math.floor(v * 10) / 10;

/** Px del original por cm impreso (Infinity si es vectorial o no hay datos). */
function pxPerCm(layer: Layer, meta: AssetMeta | undefined) {
  return layer.kind === "image" && meta && !meta.isVector ? meta.width / layer.sizeCm : Infinity;
}

export function LayersSection({ garment }: { garment: GarmentConfig }) {
  const view = useEditorUi((s) => s.layersView);
  const layers = useDesignStore((s) => s.design.layers);
  const layer = view.mode === "layer" || view.mode === "color" ? layers.find((l) => l.id === view.id) : undefined;
  const top = useRef<HTMLDivElement>(null);
  const viewKey = view.mode === "list" ? "list" : view.mode === "crest" ? `crest-${view.assetId}` : `${view.mode}-${view.id}`;
  // Cada vista arranca arriba del panel (la lista, los ajustes y el color comparten el mismo scroll).
  useEffect(() => {
    top.current?.closest(".section-panel-body, .sheet-body")?.scrollTo({ top: 0 });
  }, [viewKey]);

  return (
    <div ref={top}>
      <LayersView garment={garment} view={view} layer={layer} />
    </div>
  );
}

function LayersView({ garment, view, layer }: { garment: GarmentConfig; view: ReturnType<typeof useEditorUi.getState>["layersView"]; layer: Layer | undefined }) {
  if (view.mode === "crest") return <CrestQuestion garment={garment} assetId={view.assetId} />;
  if (view.mode === "color" && layer) return <LayerColor garment={garment} layer={layer} target={view.target} />;
  if (view.mode === "layer" && layer) return <LayerSettings garment={garment} layer={layer} />;
  return <LayerList garment={garment} />;
}

// ---------- subir imagen ----------

function useUpload() {
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const setView = useEditorUi((s) => s.setLayersView);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setState({ busy: true, error: null });
    try {
      const meta = await saveUpload(file);
      setState({ busy: false, error: null });
      setView({ mode: "crest", assetId: meta.id });
    } catch (e) {
      setState({ busy: false, error: e instanceof UploadError ? e.message : "No pudimos subir la imagen. Probá de nuevo." });
    }
  };
  return { ...state, upload };
}

function UploadInput({ inputRef, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File | undefined) => void }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={[...ACCEPTED_TYPES, ".svg"].join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
}

/** Capa de texto nueva: arriba de la espalda (donde suele ir el nombre del equipo). */
function useAddText(garment: GarmentConfig) {
  const addLayer = useDesignStore((s) => s.addLayer);
  const setView = useEditorUi((s) => s.setLayersView);
  const requestView = useEditorUi((s) => s.requestView);
  return () => {
    const back = garment.pieces.back!;
    const base = useDesignStore.getState().design.colors.back ?? "#F7F7F5";
    const layer: TextLayer = {
      id: newLayerId(),
      kind: "text",
      name: "Texto",
      piece: "back",
      xCm: round1(back.sizeCm.w / 2),
      yCm: 12,
      sizeCm: 4,
      rotationDeg: 0,
      hidden: false,
      text: "Equipo",
      fontId: DEFAULT_FONT,
      color: relativeLuminance(base) > 0.35 ? "#14213D" : "#F7F7F5",
      outline: { color: "#F7F7F5", widthCm: 0 },
    };
    addLayer(layer);
    setView({ mode: "layer", id: layer.id });
    requestView("back");
  };
}

// ---------- lista ----------

function LayerList({ garment }: { garment: GarmentConfig }) {
  const layers = useDesignStore((s) => s.design.layers);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const setView = useEditorUi((s) => s.setLayersView);
  const persistError = useAssets((s) => s.persistError);
  const metas = useAssets((s) => s.meta);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, error, upload } = useUpload();
  const addText = useAddText(garment);
  const full = layers.length >= MAX_LAYERS;

  const status = (
    <div aria-live="polite">
      {busy && <p className="text-sm text-ink-2">Preparando la imagen…</p>}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {persistError && (
        <p className="notice">Este navegador no deja guardar imágenes en el dispositivo: si recargás la página, se pierden.</p>
      )}
    </div>
  );

  if (!layers.length) {
    return (
      <div className="space-y-4 pb-6">
        <UploadInput inputRef={fileRef} onFile={upload} />
        <button type="button" className="crest-empty" onClick={() => fileRef.current?.click()} disabled={busy}>
          <svg viewBox="0 0 64 72" aria-hidden="true">
            <path d="M32 4 58 12v22c0 17-11 28-26 34C17 62 6 51 6 34V12Z" />
          </svg>
          <span className="crest-empty-title">Subí tu escudo o un gráfico</span>
          <span className="crest-empty-sub">PNG, JPG o SVG · hasta 10 MB</span>
        </button>
        <p className="text-center text-sm text-ink-2">
          o{" "}
          <button type="button" className="text-btn" onClick={addText}>
            agregá un texto
          </button>
        </p>
        {status}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <UploadInput inputRef={fileRef} onFile={upload} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ink-btn inline-flex items-center gap-2" onClick={() => fileRef.current?.click()} disabled={busy || full}>
          <UploadIcon />
          Subir imagen
        </button>
        <button type="button" className="line-btn" onClick={addText} disabled={full}>
          <TextIcon />
          Agregar texto
        </button>
      </div>
      {status}
      <ul className="divide-y divide-line border-y border-line" aria-label="Capas, de adelante hacia atrás">
        {[...layers].reverse().map((l) => {
          const { w, h } = layerSizeCm(l);
          const piece = garment.pieces[l.piece as PieceId]?.label ?? l.piece;
          const lowRes = l.kind === "image" && pxPerCm(l, metas[l.assetId]) < MIN_PX_PER_CM;
          return (
            <li key={l.id} className="layer-row" data-hidden={l.hidden || undefined}>
              <button type="button" className="layer-row-main" onClick={() => setView({ mode: "layer", id: l.id })}>
                <LayerThumb layer={l} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[0.9375rem] text-ink">{l.kind === "text" ? displayText(l) || "Texto vacío" : l.name}</span>
                  <span className="block truncate text-[0.8125rem] text-ink-2">
                    {piece} · <span className="tabular-nums">{fmt(w)} × {fmt(h)} cm</span>
                  </span>
                  {lowRes && <span className="low-res block text-[0.8125rem]">Baja resolución: puede salir pixelada</span>}
                </span>
                <ChevronRightIcon className="shrink-0 text-ink-3" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-pressed={!l.hidden}
                aria-label={l.hidden ? `Mostrar ${l.name}` : `Ocultar ${l.name}`}
                onClick={() => updateLayer(l.id, { hidden: !l.hidden })}
              >
                {l.hidden ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        {layers.length} de {MAX_LAYERS} capas. Tocá una capa en la camiseta para elegirla y arrastrala para moverla.
      </p>
    </div>
  );
}

/** Miniatura de la capa: la imagen (con el fondo quitado) o el texto en su tipografía. */
function LayerThumb({ layer }: { layer: Layer }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const version = useAssets((s) => s.version);
  useEffect(() => {
    if (layer.kind !== "image") return;
    const c = ref.current;
    const img = imageForLayer(layer.assetId, layer.removeBg) as (CanvasImageSource & { width: number; height: number }) | null;
    if (!c) return;
    const px = 80;
    c.width = c.height = px;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, px, px);
    if (!img) return;
    const s = Math.min(px / img.width, px / img.height);
    ctx.drawImage(img, (px - img.width * s) / 2, (px - img.height * s) / 2, img.width * s, img.height * s);
  }, [layer, version]);
  if (layer.kind === "text") {
    const font = textFontsById[layer.fontId] ?? textFontsById[DEFAULT_FONT]!;
    return (
      <span className="layer-thumb" style={{ fontFamily: fontFamily(font), fontWeight: font.weight, color: layer.color }} aria-hidden="true">
        Aa
      </span>
    );
  }
  return <canvas ref={ref} className="layer-thumb" aria-hidden="true" />;
}

// ---------- ¿es el escudo? ----------

function CrestQuestion({ garment, assetId }: { garment: GarmentConfig; assetId: string }) {
  const meta = useAssets((s) => s.meta[assetId]);
  const image = useAssets((s) => s.images[assetId]) as (CanvasImageSource & { width: number; height: number }) | undefined;
  const addLayer = useDesignStore((s) => s.addLayer);
  const setView = useEditorUi((s) => s.setLayersView);
  const requestView = useEditorUi((s) => s.requestView);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = preview.current;
    if (!c || !image) return;
    const px = 192;
    const s = Math.min(px / image.width, px / image.height);
    c.width = Math.round(image.width * s);
    c.height = Math.round(image.height * s);
    c.getContext("2d")?.drawImage(image, 0, 0, c.width, c.height);
  }, [image]);

  if (!meta || !image) return null;
  const aspect = image.height / image.width;

  const create = (isCrest: boolean) => {
    const front = garment.pieces.front!;
    const crest = garment.placements.find((p) => p.id === "crest");
    let piece = "front", xCm = front.sizeCm.w / 2, yCm = 30, sizeCm = Math.min(30, 34 / aspect);
    if (isCrest && crest) {
      // Entra en la caja del escudo (8 × 8 cm), centrada en el mismo punto.
      piece = crest.piece;
      xCm = crest.xCm + crest.wCm / 2;
      yCm = crest.yCm + crest.hCm / 2;
      sizeCm = floor1(aspect <= crest.hCm / crest.wCm ? crest.wCm : crest.hCm / aspect);
    }
    const layer: ImageLayer = {
      id: newLayerId(),
      kind: "image",
      role: isCrest ? "crest" : undefined,
      name: isCrest ? `Escudo` : meta.name,
      piece,
      xCm: round1(xCm),
      yCm: round1(yCm),
      sizeCm: floor1(sizeCm),
      rotationDeg: 0,
      hidden: false,
      assetId,
      aspect,
      removeBg: suggestedRemoveBg(meta),
    };
    // Un gráfico grande nuevo entra debajo del escudo para no taparlo (después se puede reordenar).
    const layers = useDesignStore.getState().design.layers;
    const crestAt = layers.findIndex((l) => l.kind === "image" && l.role === "crest");
    addLayer(layer, !isCrest && crestAt >= 0 ? crestAt : undefined);
    setView({ mode: "layer", id: layer.id });
    requestView("front");
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start gap-4">
        <div className="crest-preview">
          <canvas ref={preview} aria-label={`Vista previa de ${meta.name}`} role="img" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-ink">¿Es el escudo?</h3>
          <p className="mt-1 text-sm text-ink-2">Va de 8 × 8 cm en el pecho izquierdo. Si es otro gráfico, va grande en el centro del frente.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="ink-btn" onClick={() => create(true)}>
          Sí, es el escudo
        </button>
        <button type="button" className="line-btn" onClick={() => create(false)}>
          No, es otro gráfico
        </button>
      </div>
      <p className="text-sm text-ink-2">
        Después lo podés mover y ajustar.{" "}
        <button type="button" className="text-btn" onClick={() => setView({ mode: "list" })}>
          Cancelar
        </button>
      </p>
    </div>
  );
}

/** JPG con fondo parejo: se propone quitarlo de entrada (blanco o el color de las esquinas). */
function suggestedRemoveBg(meta: AssetMeta) {
  const nearWhite = relativeLuminance(meta.cornerColor) > 0.85;
  return {
    enabled: !meta.hasAlpha && meta.uniformCorners,
    color: nearWhite ? "#FFFFFF" : meta.cornerColor,
    tolerance: 22,
  };
}

// ---------- ajustes de una capa ----------

function LayerSettings({ garment, layer }: { garment: GarmentConfig; layer: Layer }) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const removeLayer = useDesignStore((s) => s.removeLayer);
  const duplicateLayer = useDesignStore((s) => s.duplicateLayer);
  const moveLayer = useDesignStore((s) => s.moveLayer);
  const layers = useDesignStore((s) => s.design.layers);
  const setView = useEditorUi((s) => s.setLayersView);
  const index = layers.findIndex((l) => l.id === layer.id);
  const spec = garment.pieces[layer.piece as PieceId];
  const { w, h } = layerSizeCm(layer);
  const set = (patch: Partial<Layer>) => updateLayer(layer.id, patch);

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-2">
        <button type="button" className="back-btn" onClick={() => setView({ mode: "list" })}>
          <ChevronLeftIcon />
          Capas
        </button>
        <h3 className="min-w-0 truncate font-display text-lg text-ink">
          {layer.kind === "text" ? displayText(layer) || "Texto" : layer.role === "crest" ? "Escudo" : layer.name}
        </h3>
      </div>

      {layer.kind === "image" ? <ImageSettings layer={layer} /> : <TextSettings layer={layer} />}

      <section aria-labelledby="l-place" className="space-y-3">
        <h4 id="l-place" className="family-label">
          Ubicación
        </h4>
        <label className="field">
          <span className="field-label">Pieza</span>
          <select
            className="select"
            value={layer.piece}
            onChange={(e) => {
              const p = garment.pieces[e.target.value as PieceId];
              if (!p) return;
              // Al cambiar de pieza la capa arranca centrada en la nueva.
              set({ piece: e.target.value, xCm: round1(p.sizeCm.w / 2), yCm: round1(p.sizeCm.h / 2) });
            }}
          >
            {Object.entries(garment.pieces).map(([id, p]) => (
              <option key={id} value={id}>
                {p!.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Desde la izquierda" value={layer.xCm} unit="cm" min={0} max={spec?.sizeCm.w ?? 80} onChange={(v) => set({ xCm: v })} />
          <Stepper label="Desde arriba" value={layer.yCm} unit="cm" min={0} max={spec?.sizeCm.h ?? 80} onChange={(v) => set({ yCm: v })} />
          <Stepper
            label={layer.kind === "text" ? "Alto de letra" : "Ancho"}
            value={layer.sizeCm}
            unit="cm"
            min={layer.kind === "text" ? 1 : 1}
            max={60}
            onChange={(v) => set({ sizeCm: v })}
          />
          <Stepper label="Rotación" value={layer.rotationDeg} unit="°" step={5} min={-180} max={180} decimals={0} onChange={(v) => set({ rotationDeg: v })} />
        </div>
        <p className="hint">
          Medida total: <span className="tabular-nums">{fmt(w)} × {fmt(h)} cm</span>. En la camiseta, arrastrá la capa para moverla y usá las asas para agrandar o rotar.
        </p>
      </section>

      <section aria-labelledby="l-actions" className="space-y-2">
        <h4 id="l-actions" className="family-label">
          Capa
        </h4>
        <div className="action-grid">
          <button type="button" className="line-btn" onClick={() => moveLayer(layer.id, 1)} disabled={index === layers.length - 1}>
            <ArrowUpIcon />
            Adelante
          </button>
          <button type="button" className="line-btn" onClick={() => moveLayer(layer.id, -1)} disabled={index === 0}>
            <ArrowDownIcon />
            Atrás
          </button>
          <button type="button" className="line-btn" onClick={() => set({ hidden: !layer.hidden })} aria-pressed={layer.hidden}>
            {layer.hidden ? <EyeOffIcon /> : <EyeIcon />}
            {layer.hidden ? "Mostrar" : "Ocultar"}
          </button>
          <button
            type="button"
            className="line-btn"
            onClick={() => {
              const id = duplicateLayer(layer.id);
              if (id) setView({ mode: "layer", id });
            }}
            disabled={layers.length >= MAX_LAYERS}
          >
            <CopyIcon />
            Duplicar
          </button>
          <button
            type="button"
            className="line-btn line-btn--danger col-span-2"
            onClick={() => {
              removeLayer(layer.id);
              setView({ mode: "list" });
            }}
          >
            <TrashIcon />
            Borrar
          </button>
        </div>
      </section>
    </div>
  );
}

function ImageSettings({ layer }: { layer: ImageLayer }) {
  const meta = useAssets((s) => s.meta[layer.assetId]);
  const missing = useAssets((s) => !!s.failed[layer.assetId]);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const commitGesture = useDesignStore((s) => s.commitGesture);
  const setView = useEditorUi((s) => s.setLayersView);
  const rb = layer.removeBg;
  const setRb = (patch: Partial<typeof rb>, mode: "live" | "commit" = "commit") => updateLayer(layer.id, { removeBg: { ...rb, ...patch } }, mode);

  const density = pxPerCm(layer, meta);
  const lowRes = density < MIN_PX_PER_CM;

  return (
    <>
      {missing && (
        <p className="notice notice--error" role="alert">
          Esta imagen no está en este dispositivo (se borró o se subió desde otro). Volvé a subirla.
        </p>
      )}
      {lowRes && meta && (
        <p className="notice" role="status">
          A {fmt(layer.sizeCm)} cm de ancho, esta imagen tiene {fmt(density, 0)} px por cm y en la fábrica puede salir pixelada.
          Conviene una de al menos {Math.ceil(layer.sizeCm * MIN_PX_PER_CM)} px de ancho (tiene {meta.width}).
        </p>
      )}
      {meta?.isVector && <p className="text-sm text-ink-2">Es un SVG: se imprime nítido a cualquier tamaño.</p>}

      <section aria-labelledby="l-bg" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 id="l-bg" className="family-label !mb-0">
            Quitar fondo
          </h4>
          <button type="button" className="switch" role="switch" aria-checked={rb.enabled} aria-labelledby="l-bg" onClick={() => setRb({ enabled: !rb.enabled })}>
            <span aria-hidden="true" />
          </button>
        </div>
        {rb.enabled && (
          <>
            <ColorRow
              label="Color a quitar"
              hex={rb.color}
              name={rb.color === "#FFFFFF" ? "Blanco" : meta && rb.color === meta.cornerColor ? "Color del borde de la imagen" : undefined}
              onClick={() => setView({ mode: "color", id: layer.id, target: "bg" })}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="filter-chip" aria-pressed={rb.color === "#FFFFFF"} onClick={() => setRb({ color: "#FFFFFF" })}>
                Blanco
              </button>
              {meta && meta.cornerColor !== "#FFFFFF" && (
                <button type="button" className="filter-chip" aria-pressed={rb.color === meta.cornerColor} onClick={() => setRb({ color: meta.cornerColor })}>
                  Color del borde
                </button>
              )}
            </div>
            <Range
              id={`tol-${layer.id}`}
              label="Tolerancia"
              value={rb.tolerance}
              min={0}
              max={100}
              step={1}
              format={(v) => `${fmt(v, 0)} %`}
              onLive={(v) => setRb({ tolerance: v }, "live")}
              onCommit={commitGesture}
            />
          </>
        )}
      </section>
    </>
  );
}

function TextSettings({ layer }: { layer: TextLayer }) {
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const commitGesture = useDesignStore((s) => s.commitGesture);
  const setView = useEditorUi((s) => s.setLayersView);
  const inputId = useId();
  const [draft, setDraft] = useState(layer.text);
  useEffect(() => setDraft(layer.text), [layer.text]);
  useEffect(() => textFonts.forEach(ensureFont), []);

  return (
    <>
      <label className="field" htmlFor={inputId}>
        <span className="field-label">
          Texto
          <span className="field-value text-ink-3">
            {draft.length}/{MAX_TEXT_LENGTH}
          </span>
        </span>
        <input
          id={inputId}
          className="text-field"
          value={draft}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(e) => {
            setDraft(e.target.value);
            updateLayer(layer.id, { text: e.target.value }, "live");
          }}
          onBlur={commitGesture}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), commitGesture())}
        />
      </label>

      <section aria-labelledby="t-font">
        <h4 id="t-font" className="family-label">
          Tipografía
        </h4>
        <div className="font-grid">
          {textFonts.map((f) => (
            <button key={f.id} type="button" className="font-chip" aria-pressed={layer.fontId === f.id} onClick={() => updateLayer(layer.id, { fontId: f.id })}>
              <span style={{ fontFamily: fontFamily(f), fontWeight: f.weight }} className="font-chip-sample" aria-hidden="true">
                {f.uppercase ? "ABC 10" : "Abc 10"}
              </span>
              <span className="font-chip-name">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="t-colors" className="space-y-3">
        <h4 id="t-colors" className="family-label">
          Color y borde
        </h4>
        <ul className="divide-y divide-line border-y border-line">
          <li>
            <ColorRow label="Color del texto" hex={layer.color} onClick={() => setView({ mode: "color", id: layer.id, target: "fill" })} />
          </li>
          <li>
            <ColorRow label="Color del borde" hex={layer.outline.color} onClick={() => setView({ mode: "color", id: layer.id, target: "outline" })} />
          </li>
        </ul>
        <Range
          id={`ow-${layer.id}`}
          label="Grosor del borde"
          value={layer.outline.widthCm}
          min={0}
          max={1.5}
          step={0.05}
          format={(v) => (v === 0 ? "Sin borde" : `${fmt(v, 2)} cm`)}
          onLive={(v) => updateLayer(layer.id, { outline: { ...layer.outline, widthCm: v } }, "live")}
          onCommit={commitGesture}
        />
      </section>
    </>
  );
}

function ColorRow({ label, hex, name, onClick }: { label: string; hex: string; name?: string; onClick: () => void }) {
  return (
    <button type="button" className="zone-row" onClick={onClick}>
      <Swatch hex={hex} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[0.8125rem] font-semibold text-ink-2">{label}</span>
        <span className="block truncate text-[0.9375rem] text-ink">{name ?? colorLabel(hex).split(",")[0]}</span>
      </span>
      <span className="hex">{hex}</span>
      <ChevronRightIcon className="shrink-0 text-ink-3" />
    </button>
  );
}

function LayerColor({ garment, layer, target }: { garment: GarmentConfig; layer: Layer; target: "fill" | "outline" | "bg" }) {
  const colors = useDesignStore((s) => s.design.colors);
  const channels = useDesignStore((s) => s.design.graphic?.channels);
  const updateLayer = useDesignStore((s) => s.updateLayer);
  const setView = useEditorUi((s) => s.setLayersView);
  const current =
    layer.kind === "image" ? layer.removeBg.color : target === "outline" ? layer.outline.color : layer.color;
  const title = target === "bg" ? "Color a quitar" : target === "outline" ? "Color del borde" : "Color del texto";
  return (
    <ColorPicker
      title={title}
      backLabel={layer.kind === "text" ? "Texto" : "Imagen"}
      onBack={() => setView({ mode: "layer", id: layer.id })}
      current={current}
      usedColors={usedDesignColors(colors, garment.colorZones.map((z) => z.id), channels)}
      onApply={(hex) => {
        if (layer.kind === "image") updateLayer(layer.id, { removeBg: { ...layer.removeBg, color: hex } });
        else if (target === "outline") updateLayer(layer.id, { outline: { ...layer.outline, color: hex } });
        else updateLayer(layer.id, { color: hex });
      }}
    />
  );
}

// ---------- controles numéricos ----------

/** Número con − / + (paso 0,5) y campo editable. Acepta coma decimal. */
function Stepper({
  label,
  value,
  unit,
  onChange,
  step = 0.5,
  min,
  max,
  decimals = 1,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  step?: number;
  min: number;
  max: number;
  decimals?: number;
}) {
  const id = useId();
  const [text, setText] = useState(fmt(value, decimals));
  useEffect(() => setText(fmt(value, decimals)), [value, decimals]);
  const clampRound = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10 ** decimals) / 10 ** decimals));
  const commitText = () => {
    const v = Number(text.replace(",", "."));
    if (Number.isFinite(v)) onChange(clampRound(v));
    else setText(fmt(value, decimals));
  };
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="stepper">
        <button type="button" className="stepper-btn" aria-label={`Restar ${fmt(step)} ${unit} a ${label}`} onClick={() => onChange(clampRound(value - step))}>
          <MinusIcon />
        </button>
        <span className="stepper-value">
          <input
            id={id}
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && commitText()}
          />
          <span aria-hidden="true">{unit}</span>
        </span>
        <button type="button" className="stepper-btn" aria-label={`Sumar ${fmt(step)} ${unit} a ${label}`} onClick={() => onChange(clampRound(value + step))}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

function Range({
  id,
  label,
  value,
  min,
  max,
  step,
  format,
  onLive,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onLive: (v: number) => void;
  onCommit: () => void;
}): ReactNode {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
        <span className="field-value">{format(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onLive(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        onTouchEnd={onCommit}
      />
    </div>
  );
}
