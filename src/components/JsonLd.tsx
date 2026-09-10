/**
 * Emits a schema.org JSON-LD block.
 *
 * **What this buys.** Metadata tells a search engine how to *display* a page;
 * structured data tells it what the page *is*. It is the difference between a
 * show page appearing as a blue link and appearing with artwork, an episode
 * count and a rating attached — and it is the only way to be eligible for the
 * search box that appears under a brand result.
 *
 * **Why `dangerouslySetInnerHTML` is correct here and not a shortcut.** A
 * `<script type="application/ld+json">` must contain raw JSON. React escapes
 * text children as HTML entities, which turns valid JSON into something no
 * parser accepts, so the tag renders and every crawler ignores it. Passing the
 * serialised string through is the documented way to do this.
 *
 * The `<` replacement closes the one hole that opens: a value containing the
 * literal `</script>` would otherwise end the tag early and let the rest be
 * parsed as markup. Podcast titles and feed descriptions are third-party text
 * that we do not control, so this is a real input, not a theoretical one.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
