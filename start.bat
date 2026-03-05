@echo off
chcp 65001 >nul
echo ========================================
echo   OlelaFinder Server
echo   Minecraft World Generation API
echo ========================================
echo.
cd src-api
node node_modules/tsx/dist/cli.mjs src/server.ts
