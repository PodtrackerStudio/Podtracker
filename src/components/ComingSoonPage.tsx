import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

export function ComingSoonPage({ title, active }: { title: string; active?: "home" | "profile" | "explore" }) {
  return (
    <>
      <SiteNav active={active} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "120px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 400, marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>This page hasn&apos;t been designed yet — check back soon.</p>
      </main>
      <SiteFooter />
    </>
  );
}
