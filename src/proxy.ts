import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every matched request.
 *
 * **This is `proxy.ts`, not `middleware.ts`.** Next 16 deprecated the
 * `middleware` file convention and renamed it to `proxy`, with the exported
 * function renamed to match. Every Supabase SSR guide currently online tells you
 * to create `middleware.ts` exporting `middleware` — that is the old convention.
 * See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
 *
 * **Why this file has to exist at all.** Supabase access tokens are short-lived
 * and are refreshed by writing a new cookie. Server Components have a read-only
 * cookie store, so the refresh cannot happen during a render — it has to happen
 * here, where the response is still writable. Without it, users are silently
 * signed out when their token expires.
 *
 * The env vars are read inline rather than imported from `./lib/supabase/env`
 * because the Proxy docs warn against relying on shared modules here: proxy is
 * invoked separately from render code and may be deployed to a CDN.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * True when a state-changing request to our API was sent by another website.
 *
 * Defence in depth against cross-site request forgery. Supabase's session
 * cookies are SameSite=Lax, which already keeps them off most cross-site
 * POSTs, and the JSON routes need a CORS preflight that nothing grants. The
 * gap is plain form posts. `/api/auth/confirm` takes one, so another site
 * could post its own emailed token there and sign a visitor into the
 * attacker's account. Every browser sends `Origin` on a POST, so a mismatch is
 * refused. A missing header (curl, server-to-server) is allowed, because that
 * is not a browser carrying someone's cookies.
 */
function isCrossSiteWrite(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return true; // "null" and other unparseable values
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  return originHost !== host.split(",")[0].trim();
}

export async function proxy(request: NextRequest) {
  if (isCrossSiteWrite(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // No Supabase project yet — pass every request straight through, so a
  // checkout without Supabase credentials behaves exactly as it did before.
  // Delete this guard once Supabase is the only auth path.
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Written to the request first so anything reading cookies later in
        // this same pass sees the refreshed values, then to a fresh response so
        // they actually reach the browser.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this call is what performs the refresh. It looks like a
  // pointless read, and deleting it produces sessions that expire early and
  // logouts nobody can reproduce.
  //
  // `getClaims` rather than `getUser`, as Supabase's SSR guide now does. It
  // refreshes an expired token the same way, through `getSession`, then
  // verifies the signature locally against the project's cached public key.
  // `getUser` made a round trip to Supabase on every matched request.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  /**
   * Everything except static assets and image files. Auth cookies are
   * irrelevant to those, and running this on every icon costs latency.
   *
   * `/api/discord` is excluded too: Discord, not a signed-in browser, calls it,
   * and it has 3 seconds to answer, so a Supabase round trip there is pure cost.
   * So is `/api/avatar`: a public image, fetched once per picture on a page.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/discord|api/avatar|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
