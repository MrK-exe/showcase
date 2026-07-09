@echo off
cd /d "%~dp0"

rem --- Local CMS launcher -----------------------------------------------------
rem This window IS the server. Keep it open while you edit; CLOSE it to stop.
rem
rem Why the env var: Astro 7 auto-detects editor/agent terminals and quietly runs
rem the dev server as a detached BACKGROUND daemon - that made the old launcher
rem flash open and vanish (and left the server running with no window). Setting
rem ASTRO_DEV_BACKGROUND=1 is Astro's own signal to run the server HERE, in the
rem foreground, tied to this window. Close the window and the server stops.
rem ---------------------------------------------------------------------------
set "ASTRO_DEV_BACKGROUND=1"

rem Clear any leftover background server from a previous run so the port is free.
call npm run astro -- dev stop >nul 2>&1

echo Starting the CMS - keep this window open while you edit.
echo Close this window when you're done to stop the server.
echo.

rem Runs in the foreground; Astro opens the admin (/keystatic) once it's ready.
call npm run cms -- --open /keystatic
