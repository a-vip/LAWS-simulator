@echo off
title LAWS Simulator Desktop App
cls
echo ====================================================================
echo                 LAWS SIMULATOR DETECTED - BOOTING APP
echo ====================================================================
echo.

:: Check if port 3000 is already active
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo [INFO] Next.js dev server is already active on port 3000.
) else (
    echo [WARNING] Dev server not active. Spinning up background server...
    start /b npm run dev
    echo [INFO] Waiting for server initialization (5 seconds)...
    timeout /t 5 > nul
)

:: Launch in default browser as requested
echo [INFO] Opening in default web browser...
start http://localhost:3000

echo [INFO] App launched successfully!
timeout /t 3 > nul
exit
