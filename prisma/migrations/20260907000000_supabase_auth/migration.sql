-- Supabase Auth switchover (2026-09-07).
--
-- Credentials and sessions move to Supabase, so the columns that stored them
-- here are removed. `User` keeps everything else — username, display name, bio
-- and all ten relations — and its `id` now holds the Supabase user's UUID
-- instead of a generated cuid.
--
-- No SQL is needed for that id change: Prisma generated cuids in the client, not
-- as a Postgres DEFAULT, so there is no database default to drop.
--
-- NOTE: existing User rows keep their old cuid ids and no longer correspond to
-- any Supabase account, so they cannot be signed into. They are deliberately NOT
-- deleted here — a migration that wipes every user is a landmine if it is ever
-- run against real data. Clear them by hand instead; see
-- docs/supabase-auth-switchover.md.

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- DropTable
DROP TABLE "Session";
