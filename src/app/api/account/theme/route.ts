import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cleanFont, cleanHex, cleanTheme } from "@/lib/theme";

/**
 * Save Account Settings → Theme: the signed-in person's own colours and font.
 *
 * Every field is optional and null means "Sasha's default". Anything that
 * isn't a valid `#rrggbb` or a known font is rejected rather than coerced, so
 * a bad request can't quietly reset someone's theme.
 */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  for (const key of ["main", "accent"] as const) {
    if (body[key] != null && !cleanHex(body[key])) {
      return NextResponse.json({ error: `That ${key} colour isn't valid.` }, { status: 400 });
    }
  }
  if (body.font != null && !cleanFont(body.font)) {
    return NextResponse.json({ error: "That font isn't one of the options." }, { status: 400 });
  }

  const theme = cleanTheme(body);
  await db.user.update({
    where: { id: user.id },
    data: { themeMain: theme.main, themeAccent: theme.accent, themeFont: theme.font },
  });

  return NextResponse.json({ theme });
}
