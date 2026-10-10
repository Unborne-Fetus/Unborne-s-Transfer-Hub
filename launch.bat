@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js first. & pause & exit /b 1)
if not exist "assets\brisk-dex-sprites" echo Tip: run setup-assets.bat once to enable offline sprites.
node scripts\serve.mjs
if errorlevel 1 pause
