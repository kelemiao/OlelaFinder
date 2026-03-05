@echo off
chcp 65001 >nul
echo ========================================
echo   Kelebot Gen2 Finder Server kelemiao~
echo   Minecraft 1.21.7 + Tectonic 3.0.13
echo ========================================
echo.
cd src-api
node node_modules/tsx/dist/cli.mjs src/server.ts
