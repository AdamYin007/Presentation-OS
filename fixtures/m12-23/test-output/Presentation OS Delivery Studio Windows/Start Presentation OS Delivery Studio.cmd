@echo off
setlocal EnableExtensions

if "%PRESENTATION_OS_ROOT%"=="" (
  set "REPO_ROOT=\Users\adamyin\Projects\awe"
) else (
  set "REPO_ROOT=%PRESENTATION_OS_ROOT%"
)

if "%PRESENTATION_OS_PORT%"=="" (
  set "PORT=9304"
) else (
  set "PORT=%PRESENTATION_OS_PORT%"
)

if "%PRESENTATION_OS_STUDIO_DIR%"=="" (
  set "STUDIO_DIR=%REPO_ROOT%\deliverables\studio"
) else (
  set "STUDIO_DIR=%PRESENTATION_OS_STUDIO_DIR%"
)

set "APP_URL=http://localhost:%PORT%"

if "%PRESENTATION_OS_DRY_RUN%"=="1" (
  echo platform=windows
  echo repo=%REPO_ROOT%
  echo port=%PORT%
  echo studioDir=%STUDIO_DIR%
  echo url=%APP_URL%
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js from https://nodejs.org/ and run this launcher again.
  pause
  exit /b 1
)

if not exist "%REPO_ROOT%\scripts\delivery-studio.js" (
  echo Presentation OS repo path is invalid.
  echo Set PRESENTATION_OS_ROOT to the repo root and run again.
  pause
  exit /b 1
)

if not exist "%STUDIO_DIR%" mkdir "%STUDIO_DIR%"

start "Presentation OS Delivery Studio Server" /min "%~dp0Run Studio Server.cmd"
timeout /t 2 /nobreak >nul
start "" "%APP_URL%"
exit /b 0
