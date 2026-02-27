import type { Metadata } from "next";
import {
  Playfair_Display,
  Lora,
  Newsreader,
  DM_Sans,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { EditionProvider } from "@/components/EditionProvider";
import { AdminPlaycardsPanel } from "@/components/AdminPlaycardsPanel";

import { Analytics } from "@vercel/analytics/react";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "The Future Express — Tomorrow's News, Today's Odds",
  description:
    "The newspaper of record for what hasn't happened yet. Prediction market intelligence from Polymarket and Kalshi, in researched articles.",
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
      "text/markdown": "/llms.txt",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${lora.variable} ${newsreader.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased" style={{ fontFamily: "var(--font-body)" }}>
        <EditionProvider>{children}</EditionProvider>
        <AdminPlaycardsPanel />
        <Analytics />
      </body>
    </html>
  );
}
