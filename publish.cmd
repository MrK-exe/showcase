@echo off
setlocal
rem ?????? Publish: stage everything, commit, push. CI builds + deploys in ~5 min. ??????
cd /d "%~dp0"

git add -A
git diff --cached --quiet
if %errorlevel% equ 0 (
  echo Nothing to publish - no changes since the last publish.
  pause
  exit /b 0
)

echo Changes to publish:
git diff --cached --stat
echo.

git commit -m "content: update via admin"
if errorlevel 1 (
  echo.
  echo COMMIT FAILED - see the message above.
  pause
  exit /b 1
)

git push origin main
if errorlevel 1 (
  echo.
  echo PUSH FAILED - check your internet connection / GitHub sign-in,
  echo then double-click publish.cmd again. Your changes are safely
  echo committed locally and nothing was lost.
  pause
  exit /b 1
)

echo.
echo Published! Live at https://mrk-exe.github.io/showcase/ in about 5 minutes.
pause
