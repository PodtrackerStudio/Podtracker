/**
 * Turning podcast feed text into something safe to print.
 *
 * **Feed descriptions are HTML, and this app renders them as text.** A show's
 * `<itunes:summary>` and an episode's `<content:encoded>` routinely arrive
 * wrapped in `<p>` tags with `<a href>` links and `<br>` inside, and printing
 * that into a React text node shows the markup verbatim — reported 2026-10-22,
 * with `<p>` visible on podcast pages.
 *
 * Episode pages escaped it because `summaryOnly` already stripped tags. Show
 * descriptions went straight from `feed.description` to the page, so they never
 * did, and the "guest" line under each recent episode only escaped when the
 * feed happened to supply `contentSnippet`.
 *
 * This lives in its own module because the fix belongs at the boundary —
 * `podcastApi.ts`, where feed text enters — and `episodeDetail.ts`, which held
 * the original private copy, imports from there. Nothing here imports anything.
 */

/** Decoded after tags are removed; `&amp;` goes last so `&amp;lt;` survives as `&lt;`. */
const NAMED_ENTITIES: [RegExp, string][] = [
  [/&nbsp;/gi, " "],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&(?:apos|#39);/gi, "'"],
  [/&hellip;/gi, "…"],
  [/&mdash;/gi, "—"],
  [/&ndash;/gi, "–"],
  [/&rsquo;/gi, "’"],
  [/&lsquo;/gi, "‘"],
  [/&rdquo;/gi, "”"],
  [/&ldquo;/gi, "“"],
];

/**
 * Markup out, entities in — and in that order.
 *
 * Tags are removed **before** entities are decoded. The other way round, a feed
 * containing `&lt;p&gt;` would decode into a real `<p>` that the stripper had
 * already run past, and the tag would reach the page after all.
 *
 * Tags become a space rather than nothing: `one</p><p>two` has no whitespace of
 * its own, and deleting the tags outright would print "onetwo".
 */
export function feedTextToPlain(text: string): string {
  if (!text) return "";

  let out = text.replace(/<[^>]*>/g, " ");

  // Numeric first, so a decimal or hex escape for `&` is handled by the
  // `&amp;` rule below rather than producing a stray ampersand.
  out = out.replace(/&#(\d+);/g, (_, code: string) => safeCodePoint(Number(code)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeCodePoint(parseInt(code, 16)));

  for (const [pattern, replacement] of NAMED_ENTITIES) out = out.replace(pattern, replacement);
  out = out.replace(/&amp;/gi, "&");

  out = out.replace(/\s+/g, " ").trim();

  // Turning tags into spaces leaves one stranded in front of punctuation that
  // followed the tag: `<a href="…">our page</a>.` came out as "our page ."
  // Feed descriptions are full of links, so this showed constantly — the
  // previous private stripper had the same flaw, which is why episode summaries
  // had it too.
  return out.replace(/ +([.,;:!?%)\]}])/g, "$1");
}

/** An out-of-range escape is left alone rather than throwing on `String.fromCodePoint`. */
function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}
