@echo off
setlocal
rem -- Publish: refresh feeds, stage everything, commit, push. CI builds + deploys in ~5 min. --
cd /d "%~dp0"

rem Substack blocks GitHub's build servers, so new posts can only be pulled from THIS
rem machine — refresh the feed data here and publish it along with everything else.
rem A failed refresh is fine: the publish continues with the last pulled data.
echo Checking Substack / feeds for new posts...
node scripts\pull.mjs
echo.

rem The CV PDF never goes into git (every committed copy would stay in the public history).
rem It ships as the one file on the repo's "cv" release, swapped here when it changed.
echo Checking the CV...
node scripts\cv.mjs publish
set "CV_RC=%errorlevel%"
if "%CV_RC%"=="2" goto cvok
if not "%CV_RC%"=="0" goto cvfailed
:cvok
echo.

git add -A
git diff --cached --quiet -- cv public/cv
if errorlevel 1 goto cvstaged
git diff --cached --quiet
if not errorlevel 1 goto pushcheck

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

rem Push everything main has that GitHub doesn't: this run's commit, or one an earlier run
rem committed but couldn't push.
:pushcheck
set "AHEAD="
for /f %%n in ('git rev-list --count origin/main..main') do set "AHEAD=%%n"
if "%AHEAD%"=="0" (
  if "%CV_RC%"=="2" goto redeploy
  echo Nothing to publish - no changes since the last publish.
  pause
  exit /b 0
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
exit /b 0

rem Only the CV changed and there is nothing to push, so no push triggers a deploy: start one.
:redeploy
node scripts\cv.mjs redeploy
if errorlevel 1 (
  echo.
  echo REDEPLOY FAILED - the new CV is uploaded but the site still shows the old one.
  echo Double-click publish.cmd again, or run the Deploy workflow from GitHub's Actions tab.
  pause
  exit /b 1
)
echo CV updated. The site redeploys with it in about 5 minutes.
pause
exit /b 0

:cvstaged
git reset -q -- cv public/cv
echo STOPPED - a CV file was about to be committed to git, which would keep it in the
echo public history forever. Nothing was committed or pushed. CVs belong only in the
echo admin's CV field; move any PDF out of the cv and public\cv folders and try again.
pause
exit /b 1

:cvfailed
echo.
echo CV PUBLISH FAILED - see the message above. Nothing was committed or pushed.
pause
exit /b 1
