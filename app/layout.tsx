import type { Metadata } from "next";
import { Lora, Roboto } from "next/font/google";
import "./globals.css";

// Headings in the mockup are a transitional serif; body copy is a neutral
// grotesque. The Figma file does not name its fonts, so these are the closest
// freely available matches.
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Podtracker",
  description:
    "A social platform for podcast listeners to track what they listen to, " +
    "rate episodes, write reviews, and share recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${roboto.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
