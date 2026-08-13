import type { Metadata } from "next";
import { PT_Serif_Caption, Roboto, Londrina_Solid } from "next/font/google";
import "./globals.css";

// Nav bar + big headlines
const ptSerifCaption = PT_Serif_Caption({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// Smaller text (body copy, labels, UI)
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body",
});

// Rating labels
const londrinaSolid = Londrina_Solid({
  weight: ["400", "900"],
  subsets: ["latin"],
  variable: "--font-rating",
});

export const metadata: Metadata = {
  title: "Podtracker",
  description: "A social platform for podcast listeners to track, rate, and discover shows and episodes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ptSerifCaption.variable} ${roboto.variable} ${londrinaSolid.variable}`}>
      <body>{children}</body>
    </html>
  );
}
