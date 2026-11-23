// Plantillas de arranque: combinaciones clásicas de colores con estructuras genéricas (lisa, bastones, franjas,
// mitades, cuartos, fajas, bandas, chevrón, canesú). Sin escudos, logos, estampados de marcas ni nombres de
// países o clubes: cada una tiene un nombre descriptivo propio.
//
// Una plantilla es una base 100 % editable: al aplicarla carga colores por zona y gráfico. NO toca las capas
// ni el nombre y número. Sumar una = sumar una entrada acá y su miniatura en /public/templates/<id>.webp
// (se generan con scripts/template-thumbs.mjs).

export type ColorTag = "blanco" | "rojo" | "azul" | "celeste" | "amarillo" | "verde" | "naranja" | "negro" | "bordo";

export const COLOR_TAGS: { id: ColorTag; label: string; hex: string }[] = [
  { id: "blanco", label: "Blanco", hex: "#F7F7F5" },
  { id: "rojo", label: "Rojo", hex: "#C8102E" },
  { id: "azul", label: "Azul", hex: "#1F3A93" },
  { id: "celeste", label: "Celeste", hex: "#74B4E0" },
  { id: "amarillo", label: "Amarillo", hex: "#FFCD00" },
  { id: "verde", label: "Verde", hex: "#1E9E4A" },
  { id: "naranja", label: "Naranja", hex: "#F26B1D" },
  { id: "negro", label: "Negro", hex: "#111111" },
  { id: "bordo", label: "Bordó", hex: "#6D1A2E" },
];

export interface TemplateDef {
  id: string;
  name: string;
  /** Colores principales, para el filtro. */
  tags: ColorTag[];
  /** Color por zona de color (ids de garment.config). */
  colors: Record<string, string>;
  /** Gráfico (id del registro de patrones); lo que no se indique sale del registro. */
  graphic: null | { id: string; channels: string[]; scaleCm?: number; angleDeg?: number; zones?: string[] };
}

// Paleta (fabricPalette.ts).
const W = "#F7F7F5", BK = "#111111", RED = "#C8102E", VERM = "#D7261E", NAVY = "#14213D", ROY = "#1F3A93",
  FR = "#2850A0", CEL = "#74B4E0", CEL2 = "#A9D3F0", YEL = "#FFCD00", GOLD = "#C99A2E", GRN = "#1E9E4A",
  EMR = "#00875A", BOT = "#0B4D2C", ORG = "#F26B1D", BOR = "#6D1A2E";

/** Colores por zona: cuerpo, mangas, cuello, puños y bajo. */
const zones = (body: string, sleeves: string, collar: string, cuffs: string, hem = body, back = body) => ({
  front: body,
  back,
  sleeves,
  collar,
  cuffs,
  hem,
});

export const templates: TemplateDef[] = [
  // ---- Lisas con vivos ----
  { id: "amarillo-verde", name: "Amarillo con vivos verdes", tags: ["amarillo", "verde"], colors: zones(YEL, YEL, GRN, GRN), graphic: null },
  { id: "azul-rey-blanco", name: "Azul rey con vivos blancos", tags: ["azul", "blanco"], colors: zones(ROY, ROY, W, W), graphic: null },
  { id: "azul-tricolor", name: "Azul con cuello blanco y puños rojos", tags: ["azul", "blanco", "rojo"], colors: zones(FR, FR, W, VERM), graphic: null },
  { id: "blanco-negro", name: "Blanco con vivos negros", tags: ["blanco", "negro"], colors: zones(W, W, BK, BK), graphic: null },
  { id: "naranja-negro", name: "Naranja con vivos negros", tags: ["naranja", "negro"], colors: zones(ORG, ORG, BK, BK), graphic: null },
  { id: "rojo-blanco", name: "Rojo con vivos blancos", tags: ["rojo", "blanco"], colors: zones(RED, RED, W, W), graphic: null },
  { id: "celeste-negro", name: "Celeste con cuello negro", tags: ["celeste", "negro"], colors: zones(CEL, CEL, BK, CEL), graphic: null },
  { id: "verde-blanco-rojo", name: "Verde con cuello blanco y puños rojos", tags: ["verde", "blanco", "rojo"], colors: zones(EMR, EMR, W, VERM), graphic: null },
  { id: "rojo-amarillo", name: "Rojo con vivos amarillos", tags: ["rojo", "amarillo"], colors: zones(RED, RED, YEL, YEL), graphic: null },
  { id: "marino-rojo", name: "Marino con vivos rojos", tags: ["azul", "rojo"], colors: zones(NAVY, NAVY, VERM, VERM), graphic: null },
  { id: "bordo-blanco", name: "Bordó con vivos blancos", tags: ["bordo", "blanco"], colors: zones(BOR, BOR, W, W), graphic: null },
  {
    id: "verde-paneles",
    name: "Verde con paneles laterales blancos",
    tags: ["verde", "blanco"],
    colors: zones(GRN, GRN, W, W),
    graphic: { id: "panel-lateral", channels: [W, GRN], scaleCm: 8 },
  },

  // ---- Bastones ----
  {
    id: "bastones-celestes",
    name: "Bastones celestes y blancos",
    tags: ["celeste", "blanco"],
    colors: zones(W, W, NAVY, W),
    graphic: { id: "bastones", channels: [CEL, W], scaleCm: 7.5 },
  },
  {
    id: "bastones-rojos",
    name: "Bastones rojos con cuello azul",
    tags: ["rojo", "blanco", "azul"],
    colors: zones(W, W, ROY, ROY),
    graphic: { id: "bastones", channels: [VERM, W], scaleCm: 6.5 },
  },
  {
    id: "rayado-fino",
    name: "Rayado fino marino",
    tags: ["blanco", "azul"],
    colors: zones(W, W, NAVY, NAVY),
    graphic: { id: "bastones", channels: [NAVY, W], scaleCm: 2 },
  },
  {
    id: "bastones-verdes",
    name: "Bastones verdes y blancos",
    tags: ["verde", "blanco"],
    colors: zones(W, W, BOT, BOT),
    graphic: { id: "bastones", channels: [BOT, W], scaleCm: 6 },
  },

  // ---- Franjas ----
  {
    id: "franjas-tricolor",
    name: "Franjas rojas con filete azul",
    tags: ["blanco", "rojo", "azul"],
    colors: zones(W, W, ROY, ROY),
    graphic: { id: "franjas", channels: [RED, ROY], scaleCm: 4.5 },
  },
  {
    id: "franjas-oro-verde",
    name: "Verde con franjas doradas",
    tags: ["verde", "amarillo"],
    colors: zones(BOT, BOT, GOLD, GOLD),
    graphic: { id: "franjas", channels: [GOLD, BOT], scaleCm: 3 },
  },

  // ---- Mitades y dos tonos ----
  {
    id: "mitades-rojo-blanco",
    name: "Mitades rojo y blanco",
    tags: ["rojo", "blanco"],
    colors: zones(RED, W, W, RED),
    graphic: { id: "mitades", channels: [RED, W, RED], scaleCm: 0 },
  },
  {
    id: "mitades-azul-amarillo",
    name: "Mitades azul y amarillo",
    tags: ["azul", "amarillo"],
    colors: zones(ROY, ROY, YEL, YEL),
    graphic: { id: "mitades", channels: [ROY, YEL, ROY], scaleCm: 0 },
  },
  {
    id: "dos-tonos-blanco-rojo",
    name: "Blanco arriba, rojo abajo",
    tags: ["blanco", "rojo"],
    colors: zones(W, W, RED, RED, RED),
    graphic: { id: "dos-tonos", channels: [W, RED, RED], scaleCm: 34 },
  },
  {
    id: "dos-tonos-azul-amarillo",
    name: "Azul arriba, amarillo abajo",
    tags: ["azul", "amarillo"],
    colors: zones(FR, FR, YEL, YEL, YEL),
    graphic: { id: "dos-tonos", channels: [FR, YEL, YEL], scaleCm: 34 },
  },

  // ---- Cuartos ----
  {
    id: "cuartos-rojo-blanco",
    name: "Cuartos rojo y blanco",
    tags: ["rojo", "blanco"],
    colors: zones(RED, RED, W, W),
    graphic: { id: "cuartos", channels: [RED, W] },
  },
  {
    id: "cuartos-marino-celeste",
    name: "Cuartos marino y celeste",
    tags: ["azul", "celeste"],
    colors: zones(NAVY, CEL2, NAVY, CEL2),
    graphic: { id: "cuartos", channels: [NAVY, CEL2] },
  },

  // ---- Chevrón ----
  {
    id: "chevron-rojo",
    name: "Blanco con chevrón rojo",
    tags: ["blanco", "rojo", "azul"],
    colors: zones(W, W, NAVY, NAVY),
    graphic: { id: "chevron", channels: [RED, NAVY], scaleCm: 7, angleDeg: 24 },
  },
  {
    id: "chevron-negro-amarillo",
    name: "Rojo con chevrón negro y amarillo",
    tags: ["rojo", "negro", "amarillo"],
    colors: zones(RED, RED, BK, BK),
    graphic: { id: "chevron", channels: [BK, YEL], scaleCm: 6, angleDeg: 28 },
  },

  // ---- Fajas y bandas ----
  {
    id: "faja-roja",
    name: "Blanco con faja roja",
    tags: ["blanco", "rojo"],
    colors: zones(W, W, RED, RED),
    graphic: { id: "faja", channels: [RED, W], scaleCm: 12, angleDeg: 38 },
  },
  {
    id: "faja-blanca",
    name: "Marino con faja blanca",
    tags: ["azul", "blanco", "celeste"],
    colors: zones(NAVY, NAVY, W, W),
    graphic: { id: "faja", channels: [W, CEL], scaleCm: 11, angleDeg: 35 },
  },
  {
    id: "banda-amarilla",
    name: "Azul con banda amarilla",
    tags: ["azul", "amarillo", "rojo"],
    colors: zones(ROY, ROY, YEL, YEL),
    graphic: { id: "banda-pectoral", channels: [YEL, VERM], scaleCm: 10 },
  },

  // ---- Canesú ----
  {
    id: "canesu-azul",
    name: "Amarillo con canesú azul",
    tags: ["amarillo", "azul", "rojo"],
    colors: zones(YEL, ROY, ROY, YEL),
    graphic: { id: "canesu", channels: [ROY, VERM], scaleCm: 15 },
  },
];

export const templatesById: Record<string, TemplateDef> = Object.fromEntries(templates.map((t) => [t.id, t]));
