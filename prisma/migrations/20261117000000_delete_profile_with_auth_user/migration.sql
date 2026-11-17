-- Deleting a login in Supabase now deletes the profile too (2026-11-17).
--
-- An account is two rows: Supabase's `auth.users` (email, password) and our
-- `public."User"` (profile, and through cascades every review, rating, list,
-- follow, comment and like). `DELETE /api/account` removes both. Deleting a
-- user from the Supabase dashboard removed only the first, which left:
--
--   - a profile nobody can log into, its reviews still public; and
--   - its email held by `User.email @unique`, so signing up again with that
--     address failed with "An account with that email already exists" —
--     after Supabase had created yet another login, which was then orphaned
--     the other way round.
--
-- On 2026-11-17 there were 16 such profiles. This trigger makes the dashboard
-- do what the Delete account button does. The button deletes our row first,
-- so when it then deletes the login this finds nothing and does nothing.
--
-- SECURITY DEFINER because the delete runs as Supabase's own auth role, which
-- has no rights on public tables. `search_path = ''` so the function cannot be
-- steered at a look-alike table; every name in it is schema-qualified.
--
-- Guarded on `auth.users` existing: Prisma's shadow database for
-- `migrate dev` is plain Postgres with no `auth` schema, and an unguarded
-- trigger would break `migrate dev` for everyone after this.

DO $migration$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users does not exist (not a Supabase database); trigger not created';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.delete_profile_for_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $fn$
  BEGIN
    DELETE FROM public."User" WHERE id = OLD.id::text;
    RETURN OLD;
  END;
  $fn$;

  DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
  CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.delete_profile_for_auth_user();
END
$migration$;
