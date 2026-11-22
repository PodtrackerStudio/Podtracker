-- Site analytics: visits (bounce rate, time before leaving, signup funnel) and
-- how each account was created (to spot one person making several accounts).
-- See src/lib/visits.ts and src/lib/funnel.ts.
--
-- Neither table holds an IP address or a browser string. `Visit.id` is a random
-- id the browser keeps in sessionStorage for one tab; `SignupSource` keeps only
-- keyed hashes, which can be compared with each other and nothing else.

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "entryPath" TEXT NOT NULL,
    "referrer" TEXT,
    "signedIn" BOOLEAN NOT NULL DEFAULT false,
    "sawSignup" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupSource" (
    "userId" TEXT NOT NULL,
    "visitId" TEXT,
    "networkHash" TEXT,
    "deviceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupSource_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Visit_startedAt_idx" ON "Visit"("startedAt");

-- CreateIndex
CREATE INDEX "SignupSource_networkHash_idx" ON "SignupSource"("networkHash");

-- CreateIndex
CREATE INDEX "SignupSource_deviceHash_idx" ON "SignupSource"("deviceHash");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignupSource" ADD CONSTRAINT "SignupSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase serves every table in `public` over its REST API to anyone with the
-- anon key. The app never uses that API (Prisma connects as the owner), so RLS
-- with no policies is the lock. See CLAUDE.md, "Security rules".
ALTER TABLE "Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignupSource" ENABLE ROW LEVEL SECURITY;
