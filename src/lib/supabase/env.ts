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
