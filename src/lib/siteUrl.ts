/**
 * The public origin of this site — what belongs in a link we email someone.
 *
 * **Why `new URL(request.url).origin` is not enough in production.** Vercel
 * terminates TLS at its edge and forwards a plain HTTP request to the function,
 * so the request the handler sees can carry `http://` and, depending on the
 * hop, an internal host. A password-reset link built from that arrives in
 * somebody's inbox pointing at `http://` — downgraded, and rejected by
 * Supabase's redirect allow-list, which matches on the exact origin.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_SITE_URL`, when set. Explicit beats inferred, and this is
 *      the only source that is certainly right.
 *   2. `x-forwarded-proto` / `x-forwarded-host`, which Vercel sets to the
 *      values the browser actually used.
 *   3. The request's own URL — correct on localhost, where there is no proxy.
 *
 * Whatever this resolves to must also be listed under **Redirect URLs** in the
 * Supabase dashboard, or the link in the email refuses to open.
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const proto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (proto && host) return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;

  return new URL(request.url).origin;
}
