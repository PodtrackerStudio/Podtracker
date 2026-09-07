/**
 * Supabase configuration, read in one place so every caller agrees on whether
 * Supabase is set up at all.
 *
 * Both variables are `NEXT_PUBLIC_` because the browser client needs them, and
 * that is safe: the anon key is designed to be public. It carries no privileges
 * of its own — what a request may read or write is decided by Row Level
 * Security policies on the Supabase side. **The service-role key is a different
 * thing entirely and must never appear in a `NEXT_PUBLIC_` variable**, because
 * anything with that prefix is inlined into the JavaScript sent to browsers.
 *
 * The literal `process.env.X` reads below are deliberate. Next inlines
 * `NEXT_PUBLIC_` values at build time by matching that exact expression, so
 * indexing dynamically (`process.env[name]`) silently yields undefined in the
 * client bundle.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * False until a Supabase project exists and its keys are in `.env`.
 *
 * Everything Supabase-related is gated on this, so a checkout with no Supabase
 * credentials behaves exactly as it did before any of this was added rather
 * than throwing on every request. Remove the guards once Supabase is the only
 * auth path.
 */
export const isSupabaseConfigured = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";

/**
 * Both values end up in HTTP headers, which may only contain ASCII. A key
 * carrying anything else makes `fetch` throw while assembling the request —
 * before it reaches the network — and the failure is deeply misleading: the
 * Supabase client surfaces it as a normal error with status `0`, so it reads as
 * the server rejecting you rather than a request that was never sent.
 *
 * This happened on the first real setup (2026-09-07). The key had been copied
 * out of a masked field and carried bullet characters (U+2022), and the symptom
 * was a 400 that looked for all the world like Supabase refusing the signup.
 * Several wrong things were investigated first.
 *
 * Checked at import so it fails once, loudly, naming the variable — rather than
 * on every request, as an error about ByteStrings.
 */
function assertHeaderSafe(name: string, value: string) {
  if (!value) return;
  const bad = value.match(/[^\x20-\x7E]/);
  if (!bad) return;

  const codePoint = bad[0].codePointAt(0);
  throw new Error(
    `${name} contains a character that cannot go in an HTTP header ` +
      `(U+${codePoint?.toString(16).toUpperCase().padStart(4, "0")} at index ${bad.index}). ` +
      `This usually means the value was copied from a masked field and picked up ` +
      `bullet or ellipsis characters. Copy it again with the dashboard's copy button.`,
  );
}

assertHeaderSafe("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
assertHeaderSafe("NEXT_PUBLIC_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
