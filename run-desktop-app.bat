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

:: Launch borderless native desktop App Window (prioritize Chrome as requested, fallback to Edge)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Launching borderless Chrome window...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3000
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Launching borderless Chrome window...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3000
) else (
    echo [INFO] Chrome not found. Falling back to borderless Edge window...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:3000
)

echo [INFO] App launched successfully!
timeout /t 3 > nul
exit
