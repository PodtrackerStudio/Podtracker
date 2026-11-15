-- Apply the notifications migration through Supabase's SQL Editor.
--
-- WHY THIS FILE EXISTS
--
-- `prisma migrate deploy` needs DATABASE_URL, and on this project that string
-- cannot be obtained from anywhere a developer can reach:
--
--   * Vercel holds the production one, but it is stored as a **Secret**.
--     Sensitive variables on Vercel are write-only — the dashboard will not
--     display one and `vercel env pull` cannot retrieve one. The copy button
--     copies the variable's NAME. This is not a UI quirk to work around; the
--     value genuinely cannot be read back.
--   * Supabase's own Connect > ORM panel gives the hostname but prints
--     [YOUR-PASSWORD] in place of the password.
--   * Resetting the Supabase database password would produce a working string,
--     but it breaks the live site until Vercel's copy is updated too.
--
-- So: paste this into the Supabase dashboard's SQL Editor and run it. It needs
-- no credentials beyond being logged into Supabase.
--
-- The Supabase project is `tafcanleuusoqsawsqup` — check the URL matches before
-- running, since this is production.
--
-- WHAT IT DOES
--
-- Part 1 is `prisma/migrations/20261114202756_add_notifications/migration.sql`
-- verbatim. Part 2 writes the row Prisma would have written itself, so that a
-- later `prisma migrate deploy` sees this migration as already applied rather
-- than trying to create the table again and failing. The checksum is the
-- SHA-256 of that migration.sql, which is what Prisma compares against.
--
-- If any statement errors with "already exists", STOP and say so — it means the
-- database is in a different state than expected and the rest of this file
-- should not be forced through.

-- ── Part 1: the migration itself ──────────────────────────────────────

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOLLOW', 'FRIEND');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Part 2: tell Prisma it has been applied ───────────────────────────
--
-- Without this, the next `prisma migrate deploy` against this database tries to
-- run the migration again and fails on "type NotificationType already exists",
-- which then reads as a broken migration history rather than a bookkeeping gap.

INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
) VALUES (
    gen_random_uuid()::text,
    '97deb905f561bc965454353cde56fcbe10c8f16c90f1b417fc603502cef6641e',
    now(),
    '20261114202756_add_notifications',
    NULL,
    NULL,
    now(),
    1
);

-- ── Check ─────────────────────────────────────────────────────────────
-- Should return one row naming the migration, and a count of 0 notifications.

SELECT migration_name, finished_at FROM "_prisma_migrations"
 WHERE migration_name = '20261114202756_add_notifications';

SELECT count(*) AS notifications_so_far FROM "Notification";
