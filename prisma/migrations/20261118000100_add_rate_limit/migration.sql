-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- Every table in `public` is reachable through Supabase's Data API unless RLS
-- is on. From here on, a migration that creates a table turns it on itself.
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
