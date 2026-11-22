import type { Metadata, Viewport } from "next";
import { Barlow, Righteous } from "next/font/google";
import "./globals.css";

// Tipografías de DESIGN.md (ambas OFL):
// - Righteous: solo logo y títulos (redondeada, geométrica).
// - Barlow: botones, etiquetas y texto.
const display = Righteous({ subsets: ["latin"], weight: "400", variable: "--ff-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ff-body" });

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
    <html lang="es-AR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
