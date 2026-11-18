-- Apply the feedback migration through Supabase's SQL Editor.
--
-- Same reason as docs/apply-notifications-by-hand.sql: the production
-- DATABASE_URL cannot be obtained. Vercel stores it as a Secret, and sensitive
-- variables there are write-only — the dashboard will not show one and
-- `vercel env pull` cannot retrieve one. See that file's header for the full
-- set of dead ends.
--
-- **The feedback form works without this.** Its primary delivery is a Discord
-- webhook; the row here is the durable copy. Until this runs, messages reach
-- Discord and nothing is stored, and if the webhook is also unconfigured the
-- form tells the sender it failed rather than pretending it worked.
--
-- The Supabase project is `tafcanleuusoqsawsqup` — check the URL matches before
-- running, since this is production.
--
-- If any statement errors with "already exists", STOP and say so.

-- ── Part 1: the migration itself ──────────────────────────────────────

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Part 2: tell Prisma it has been applied ───────────────────────────
-- The checksum is the SHA-256 of
-- prisma/migrations/20261117090000_add_feedback/migration.sql, which is what
-- Prisma compares against. Without this row the next `migrate deploy` tries to
-- create the table again and fails.

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
    '6cbddb9d390b5e90cff792ada9c13875b47ac4b3384fd4b3377e4b04edc96e0e',
    now(),
    '20261117090000_add_feedback',
    NULL,
    NULL,
    now(),
    1
);

-- ── Check ─────────────────────────────────────────────────────────────

SELECT migration_name, finished_at FROM "_prisma_migrations"
 WHERE migration_name = '20261117090000_add_feedback';

SELECT count(*) AS messages_so_far FROM "Feedback";
