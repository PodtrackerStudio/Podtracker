import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * bcrypt cost. Raised from 10 to 12 on 2026-09-06: 10 was chosen years ago as a
 * general default and hardware has moved on. Measured here, 10 takes ~77ms and
 * 12 takes ~299ms — four times the work for an attacker guessing offline, for a
 * delay nobody notices on a login.
 *
 * Existing hashes keep working: bcrypt stores the cost inside the hash, so old
 * passwords still verify at 10 and are re-hashed at 12 the next time they are
 * changed.
 */
const BCRYPT_COST = 12;

/**
 * A real bcrypt hash of a random string, compared against when a login is
 * attempted for an email that has no account.
 *
 * Without it, `verifyPassword` was skipped entirely for unknown emails, so those
 * requests returned in a few milliseconds while a known email took ~300ms. That
 * difference is measurable from outside and turns the login form into a tool for
 * discovering which email addresses have accounts here. Always doing the work
 * makes both paths cost the same.
 */
export const TIMING_EQUALISER_HASH =
  "$2b$12$5eEnKGseo2Mg9Zbkb2hE/..b/EGSUxdIOsDyrq1YRa1WNhdyuK75.";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Session tokens are high-entropy random values, not user secrets — a fast
// cryptographic hash (not bcrypt) is the correct choice for storing them,
// so a stolen database dump can't be used to replay session tokens directly.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      // Explicitly NOT `user: true`. That returned the whole row, password hash
      // included, to all 29 callers — and several of them are Server Components
      // that pass user data to Client Components. Nothing leaked it, but one
      // careless `<Something user={user} />` would have serialised a password
      // hash into the page. Listing the fields means that can't happen.
      // Anything genuinely needing the hash must fetch it deliberately, as
      // `api/account/password` does.
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          longBio: true,
          externalLink: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}
