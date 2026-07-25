@echo off
setlocal EnableExtensions
cd /d "%REPO_ROOT%"
node "%REPO_ROOT%\scripts\delivery-studio.js" --port "%PORT%" --studio-dir "%STUDIO_DIR%" >> "%STUDIO_DIR%\desktop-app.log" 2>&1
