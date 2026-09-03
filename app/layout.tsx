import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400", "500", "600"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "PulseClip — Ton meilleur monteur ne dort jamais",
  description:
    "PulseClip transforme n'importe quelle vidéo longue en une liste priorisée de séquences à fort potentiel viral, avec un pack d'édition prêt à l'emploi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
