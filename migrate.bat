@echo off
REM Apply any pending database migrations, then say whether it worked.
REM
REM Exists for the same reason run-dev.bat does: Windows PowerShell refuses to
REM run npm.ps1 and npx.ps1 under the default execution policy, so `npx prisma
REM migrate deploy` dies with "running scripts is disabled on this system"
REM before it reaches the database. A .bat is not subject to that policy.
REM
REM This matters more than it sounds. A migration that never ran looks exactly
REM like one that did: the site keeps working, because the code is written to
REM survive a missing table. The notifications feature sat broken in production
REM for two days that way. So this runs the check afterwards rather than
REM leaving you to assume.
REM
REM Double-click it, or run migrate.bat from this folder.

cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%

REM Check WHICH database before touching it. On 2026-11-15 this migration was
REM applied, with complete success, to a Neon database abandoned two months
REM earlier — because .env still named it. Production stayed broken and the
REM output looked perfect. A migration run against the wrong database is worse
REM than one that fails, because it reports success.
echo ========================================
echo  Checking which database this points at
echo ========================================
call node scripts/check-env.mjs
if errorlevel 1 (
  echo.
  echo STOPPING. Nothing was migrated.
  echo The database above is not the one the live site uses, so applying
  echo migrations to it would change nothing and look like it worked.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Applying migrations
echo ========================================
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo The migration did NOT apply. The reason is above.
  echo Nothing was changed. Fix that before relying on the site.
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Checking the notifications table
echo ========================================
call node scripts/check-notifications.mjs

echo.
pause
