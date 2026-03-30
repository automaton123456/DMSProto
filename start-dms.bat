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
    if errorlevel 1 (
        echo.
        echo   ERROR: Backend dependency install failed.
        pause
        exit /b 1
    )
    echo.
)

rem Make sure the SQLite driver is present before starting the backend
if not exist "%RB%\node_modules\better-sqlite3\package.json" (
    echo   Installing missing backend dependency: better-sqlite3...
    cd /d "%RB%"
    call npm install
    if errorlevel 1 (
        echo.
        echo   ERROR: Backend dependency install failed.
        pause
        exit /b 1
    )
    echo.
)

rem Install RB client dependencies if needed
if not exist "%RB%\client\node_modules" (
    echo   Installing DMS RB client dependencies...
    cd /d "%RB%"
    call npm run install:client
    if errorlevel 1 (
        echo.
        echo   ERROR: Client dependency install failed.
        pause
        exit /b 1
    )
    echo.
)

echo   Starting backend server...
start "DMS Backend" cmd /k "cd /d %RB% && npm run dev:server"
timeout /t 3 /nobreak >nul

echo   Starting DMS RB client...
start "DMS RB" cmd /k "cd /d %RB% && npm run dev"
timeout /t 4 /nobreak >nul

start "" "http://localhost:%RB_PORT%"

echo.
echo   Done. Both windows are running. Close this window to exit.
pause >nul
