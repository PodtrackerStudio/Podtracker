-- New functions in `public` are no longer executable by anon or authenticated
-- by default.
--
-- WHY
--
-- 20261118000000 revoked anon's and authenticated's *default* grants on tables
-- and sequences, but not on functions. Checked on 2026-11-21 in
-- pg_default_acl: for functions the `postgres` role creates in `public` (every
-- migration runs as `postgres`), anon and authenticated still received EXECUTE
-- automatically, which makes each new function callable at
-- `/rest/v1/rpc/<name>` with the anon key.
--
-- `FOR ROLE postgres` is spelled out rather than left implicit: a default
-- privilege only ever applies to objects created by the role it names, and an
-- implicit one silently means whichever role happens to run the migration.
--
-- WHAT THIS DOES NOT COVER
--
-- * PUBLIC. Postgres grants EXECUTE on new functions to PUBLIC, and that
--   default cannot be revoked for one schema — only globally, which would also
--   strip it from functions `postgres` creates for extensions in other
--   schemas. So the CLAUDE.md rule stands: every migration that creates a
--   function revokes EXECUTE from PUBLIC, anon and authenticated itself.
-- * `supabase_admin`'s defaults, which still grant everything to anon. Only
--   that role can change them. It is not what migrations or the SQL editor run
--   as; RLS on every table remains the real lock.
--
-- Guarded on the roles existing so Prisma's plain shadow database skips it.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
  END IF;
END $$;
