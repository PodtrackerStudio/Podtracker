import type { Metadata } from "next";
import { PT_Serif_Caption, Roboto, Londrina_Solid } from "next/font/google";
import { staticSiteOrigin } from "@/lib/siteUrl";
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

const SITE_DESCRIPTION =
  "Track the podcasts you listen to, rate episodes, write reviews, and find out which episodes of a show are worth your time.";

export const metadata: Metadata = {
  // Everything below that looks like a path — Open Graph images, canonical
  // urls, the sitemap's entries — is resolved against this. Without it Next
  // emits relative urls, which crawlers and link-preview scrapers ignore, so
  // the tags are present and do nothing.
  metadataBase: new URL(staticSiteOrigin()),

  title: {
    default: "Podtracker — track, rate and review the podcasts you listen to",
    // Page titles become "About Podtracker · Podtracker". The brand belongs in
    // every title because that is the search anyone types to find this site by
    // name, and it is the one search it can realistically win.
    template: "%s · Podtracker",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Podtracker",

  alternates: { canonical: "/" },

  // What Google is allowed to do with the pages it finds. Explicit because the
  // default varies by crawler, and `max-image-preview: large` is what gets show
  // artwork into a result rather than a thumbnail or nothing.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },

  // The card people see when the site is pasted into iMessage, Discord, Slack
  // or a tweet. Without these a shared link renders as a bare url.
  openGraph: {
    type: "website",
    siteName: "Podtracker",
    title: "Podtracker — track, rate and review the podcasts you listen to",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Podtracker",
    description: SITE_DESCRIPTION,
  },
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
