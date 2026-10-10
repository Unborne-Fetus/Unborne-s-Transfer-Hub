@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js first. & pause & exit /b 1)
where git >nul 2>nul || (echo Install Git first. & pause & exit /b 1)
node scripts\sync-assets.mjs
if errorlevel 1 (echo Asset sync failed. & pause & exit /b 1)
echo Brisk Dex front sprites and species catalogue are ready for offline use.
pause
