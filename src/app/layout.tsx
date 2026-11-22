import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Big_Shoulders } from "next/font/google";
import "./globals.css";

// Tipografías de DESIGN.md (todas OFL): números y títulos, etiquetas y texto corrido.
// Big Shoulders Display = Big Shoulders con eje de tamaño óptico (Google unificó la familia en 2024).
const display = Big_Shoulders({ subsets: ["latin"], weight: "variable", axes: ["opsz"], variable: "--ff-display", adjustFontFallback: false });
const label = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--ff-label" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500"], variable: "--ff-body" });

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${display.variable} ${label.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
