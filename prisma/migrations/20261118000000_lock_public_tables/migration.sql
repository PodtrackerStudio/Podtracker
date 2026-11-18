-- Lock every table in `public` against Supabase's Data API.
--
-- WHY
--
-- Supabase exposes every table in `public` over REST to anyone holding the
-- anon key, and the anon key ships to every browser. The only things between
-- that key and the data are row-level security and table grants. The first 19
-- tables had RLS switched on by hand in the dashboard; no migration ever did
-- it. So a table created by a later migration (Notification, Feedback) would
-- have been world-readable and world-writable the moment it existed: the
-- database's default privileges hand `anon` and `authenticated` full rights on
-- any new table.
--
-- The app never uses the Data API. Every query goes through Prisma as the
-- table owner, which bypasses RLS and needs no grant to anon. So this is free.
--
-- WHAT
--
--   1. RLS on for every table in `public`, with no policies = deny all.
--   2. Take away anon/authenticated's rights on existing tables and sequences.
--   3. Change the default so tables created from now on start with none.
--
-- Guarded on the roles existing, so Prisma's plain shadow database (which has
-- no Supabase roles) runs step 1 and skips the rest instead of failing.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
