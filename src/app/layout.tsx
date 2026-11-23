import type { Metadata, Viewport } from "next";
import { Anton, Barlow, Barlow_Condensed, Big_Shoulders, Graduate, Righteous, Teko } from "next/font/google";
import "./globals.css";

// Tipografías de la interfaz (DESIGN.md, ambas OFL):
// - Righteous: solo logo y títulos (redondeada, geométrica).
// - Barlow: botones, etiquetas y texto.
const display = Righteous({ subsets: ["latin"], weight: "400", variable: "--ff-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ff-body" });

// Tipografías para los textos de la CAMISETA (capas de texto y, después, nombre y número). Todas OFL.
// preload: false → solo se descargan cuando un diseño las usa (ver src/layers/fonts.ts).
const shoulders = Big_Shoulders({ subsets: ["latin"], weight: "800", variable: "--ff-shoulders", preload: false, adjustFontFallback: false });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--ff-anton", preload: false });
const teko = Teko({ subsets: ["latin"], weight: "600", variable: "--ff-teko", preload: false });
const graduate = Graduate({ subsets: ["latin"], weight: "400", variable: "--ff-graduate", preload: false });
const barlowC = Barlow_Condensed({ subsets: ["latin"], weight: "700", variable: "--ff-barlow-c", preload: false });

export const metadata: Metadata = {
  title: "Casaca Creator · Editor",
  description: "Diseñá la camiseta de tu equipo sobre un modelo 3D, con medidas reales en centímetros.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1C1B19",
};

const fontVars = [display, body, shoulders, anton, teko, graduate, barlowC].map((f) => f.variable).join(" ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
