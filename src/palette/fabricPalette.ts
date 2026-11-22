// Paleta curada de colores de tela. Nombres propios, legibles y dictables por teléfono.
// Es catálogo del producto (no datos de un cliente): sumar o ajustar colores es tocar esta lista.

export interface FabricColor {
  name: string;
  hex: string;
}

export interface ColorFamily {
  id: string;
  label: string;
  colors: FabricColor[];
}

export const fabricPalette: ColorFamily[] = [
  {
    id: "neutrals",
    label: "Blancos, grises y negros",
    colors: [
      { name: "Blanco", hex: "#F7F7F5" },
      { name: "Hueso", hex: "#EFE9DC" },
      { name: "Gris perla", hex: "#C9C9C6" },
      { name: "Gris medio", hex: "#8A8B8C" },
      { name: "Gris plomo", hex: "#55585B" },
      { name: "Carbón", hex: "#2B2B2B" },
      { name: "Negro", hex: "#111111" },
    ],
  },
  {
    id: "reds",
    label: "Rojos, bordós y rosas",
    colors: [
      { name: "Rojo bermellón", hex: "#D7261E" },
      { name: "Rojo intenso", hex: "#C8102E" },
      { name: "Rojo carmín", hex: "#A6192E" },
      { name: "Bordó", hex: "#6D1A2E" },
      { name: "Rosa chicle", hex: "#E8538F" },
      { name: "Rosa pálido", hex: "#F2B5C4" },
    ],
  },
  {
    id: "oranges",
    label: "Naranjas",
    colors: [
      { name: "Naranja", hex: "#F26B1D" },
      { name: "Mandarina", hex: "#F68D2E" },
      { name: "Salmón", hex: "#F08A6E" },
      { name: "Terracota", hex: "#B5502E" },
    ],
  },
  {
    id: "yellows",
    label: "Amarillos y dorados",
    colors: [
      { name: "Amarillo limón", hex: "#F4E04D" },
      { name: "Amarillo", hex: "#FFCD00" },
      { name: "Dorado", hex: "#C99A2E" },
      { name: "Mostaza", hex: "#A87D1E" },
      { name: "Crema", hex: "#F3E3B5" },
    ],
  },
  {
    id: "greens",
    label: "Verdes",
    colors: [
      { name: "Verde lima", hex: "#9BCB3C" },
      { name: "Verde", hex: "#1E9E4A" },
      { name: "Verde esmeralda", hex: "#00875A" },
      { name: "Verde botella", hex: "#0B4D2C" },
      { name: "Verde oliva", hex: "#6B6B2F" },
      { name: "Verde agua", hex: "#63C6B5" },
    ],
  },
  {
    id: "blues",
    label: "Celestes y azules",
    colors: [
      { name: "Celeste claro", hex: "#A9D3F0" },
      { name: "Celeste", hex: "#74B4E0" },
      { name: "Turquesa", hex: "#1BA6B6" },
      { name: "Azul francia", hex: "#2850A0" },
      { name: "Azul rey", hex: "#1F3A93" },
      { name: "Azul marino", hex: "#14213D" },
      { name: "Azul noche", hex: "#0D1526" },
    ],
  },
  {
    id: "purples",
    label: "Violetas",
    colors: [
      { name: "Lila", hex: "#B49ACB" },
      { name: "Violeta", hex: "#5B2C83" },
      { name: "Uva", hex: "#3E1E5A" },
    ],
  },
  {
    id: "browns",
    label: "Arenas y marrones",
    colors: [
      { name: "Arena", hex: "#D8C29D" },
      { name: "Caqui", hex: "#A89262" },
      { name: "Marrón", hex: "#6B4226" },
      { name: "Chocolate", hex: "#3D2518" },
    ],
  },
];

export const allFabricColors: FabricColor[] = fabricPalette.flatMap((f) => f.colors);
