@echo off
cd /d "%~dp0"
rem If something is already listening on 4321 (the CMS), just open the admin.
netstat -ano | findstr /r /c:":4321 .*LISTENING" >nul
if %errorlevel%==0 (
  echo CMS already running - opening admin...
) else (
  echo Starting CMS...
  call npm run cms
)
start "" http://127.0.0.1:4321/keystatic