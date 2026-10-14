@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 24 or later, then run this file again.
 pause
 exit /b 1
)
if not exist node_modules call npm install
if not exist dist\index.html call npm run build
if errorlevel 1 (
 pause
 exit /b 1
)
echo Open http://localhost:4317 in your browser.
node server\server.mjs
pause
