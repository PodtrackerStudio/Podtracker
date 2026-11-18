-- Stop the Data API offering `delete_profile_for_auth_user()` as an RPC.
--
-- WHY
--
-- Postgres grants EXECUTE on every new function to PUBLIC, and Supabase also
-- grants it to anon and authenticated, so the trigger function added in
-- 20261117000000 showed up as `/rest/v1/rpc/delete_profile_for_auth_user`
-- for anyone holding the anon key (Supabase security advisor lints 0028 and
-- 0029, 2026-11-18). It was not exploitable — Postgres refuses to run a
-- function that RETURNS trigger outside a trigger — but nothing should call it
-- except the `on_auth_user_deleted` trigger.
--
-- Revoking EXECUTE does not affect the trigger: Postgres checks EXECUTE on a
-- trigger function when the trigger is created, not each time it fires.
--
-- Guarded on the function and roles existing, so Prisma's plain shadow
-- database (no `auth` schema, so 20261117000000 never created the function,
-- and no Supabase roles) skips this instead of failing.

DO $$
BEGIN
  IF to_regprocedure('public.delete_profile_for_auth_user()') IS NULL THEN
    RAISE NOTICE 'delete_profile_for_auth_user() does not exist; nothing to revoke';
    RETURN;
  END IF;

  REVOKE EXECUTE ON FUNCTION public.delete_profile_for_auth_user() FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.delete_profile_for_auth_user() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.delete_profile_for_auth_user() FROM authenticated;
  END IF;
END $$;
