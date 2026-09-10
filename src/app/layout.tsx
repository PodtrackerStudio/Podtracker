import type { Metadata } from "next";
import { PT_Serif_Caption, Roboto, Londrina_Solid } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
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
    // `icon.png` is a 561px square standing in for a proper share image. It is
    // the wrong shape — these cards want 1200×630 — so the crop is not what a
    // designer would choose, but a card with the mark on it beats a card with
    // an empty grey rectangle. Replacing this needs a Figma export, so it is
    // Sasha's; drop a 1200×630 file in and point both entries at it.
    images: [{ url: "/icon.png", width: 561, height: 561, alt: "Podtracker" }],
  },
  twitter: {
    // Deliberately `summary`, not `summary_large_image`: the only image
    // available is square, and the large card stretches a square into a wide
    // frame badly. Show and episode pages override nothing here — their
    // artwork is square too and reads correctly in the small card.
    card: "summary",
    title: "Podtracker",
    description: SITE_DESCRIPTION,
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const origin = staticSiteOrigin();

  // Site-wide structured data, on every page because that is where crawlers
  // expect it and because either node may be the one a given crawl reads.
  //
  // `WebSite` + `SearchAction` is what makes Google offer a search box inside
  // the result for a brand query — someone searching "podtracker" can then
  // search this site without leaving the results page. It only appears for
  // sites Google considers the authoritative match for the name, which is
  // exactly the query this site can win.
  //
  // `Organization` ties the name, logo and domain together so the three are
  // understood as one entity rather than three unrelated strings.
  const siteSchema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: "Podtracker",
      alternateName: "Podtracker Studio",
      url: origin,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${origin}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${origin}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: "Podtracker",
      url: origin,
      logo: `${origin}/icon.png`,
      description: SITE_DESCRIPTION,
    },
  ];

  return (
    <html lang="en" className={`${ptSerifCaption.variable} ${roboto.variable} ${londrinaSolid.variable}`}>
      <body>
        <JsonLd data={siteSchema} />
        {children}
      </body>
    </html>
  );
}
