@echo off
setlocal enabledelayedexpansion
title DMS Application Launcher

set ROOT=C:\WebApps\DMSProto
set RB=%ROOT%\DMS_RB

set BACKEND_PORT=3000
set RB_PORT=5174

cls
echo ============================================================
echo   DMS Application Launcher
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo   Pulling latest code...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

rem Install consolidated app dependencies if needed
if not exist "%RB%\node_modules" (
    echo   Installing backend dependencies...
    cd /d "%RB%"
    call npm install
    echo.
)

rem Install RB client dependencies if needed
if not exist "%RB%\client\node_modules" (
    echo   Installing DMS RB client dependencies...
    cd /d "%RB%"
    call npm run install:client
    echo.
)

echo   Starting backend server...
start "DMS Backend" cmd /k "cd /d %RB% && npm run dev:server"
timeout /t 3 /nobreak >nul

echo   Starting DMS RB client...
start "DMS RB" cmd /k "cd /d %RB% && npm run dev:client"
timeout /t 4 /nobreak >nul

start "" "http://localhost:%RB_PORT%"

echo.
echo   Done. Both windows are running. Close this window to exit.
pause >nul
