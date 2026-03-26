@echo off
setlocal enabledelayedexpansion
title DMS Application Launcher

set ROOT=C:\WebApps\DMSProto
set V2=%ROOT%\DMS_V2
set RB=%ROOT%\DMS_RB

set BACKEND_PORT=3000
set RB_PORT=5174

cls
echo ============================================================
echo   DMS Application Launcher
echo ============================================================
echo.
echo   [1]  Start DMS  (Backend + React Bootstrap client)
echo   [2]  Start Backend only  (API server on port %BACKEND_PORT%)
echo   [3]  Exit
echo.
echo ============================================================
set /p CHOICE=  Enter choice [1-3]:

if "%CHOICE%"=="1" goto START_BOTH
if "%CHOICE%"=="2" goto START_BACKEND
if "%CHOICE%"=="3" goto END

echo   Invalid choice. Please enter 1, 2 or 3.
pause
goto :eof

rem ─────────────────────────────────────────────────────────────
:START_BOTH
cls
echo ============================================================
echo   Starting DMS Backend  (http://localhost:%BACKEND_PORT%)
echo   Starting DMS RB       (http://localhost:%RB_PORT%)
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    goto END
)

echo   Pulling latest code...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

rem Install backend dependencies if needed
if not exist "%V2%\node_modules" (
    echo   Installing backend dependencies...
    cd /d "%V2%"
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
start "DMS Backend" cmd /k "cd /d %V2% && npm run dev:server"
timeout /t 3 /nobreak >nul

echo   Starting DMS RB client...
start "DMS RB" cmd /k "cd /d %RB% && npm run dev"
timeout /t 4 /nobreak >nul

start "" "http://localhost:%RB_PORT%"
goto END

rem ─────────────────────────────────────────────────────────────
:START_BACKEND
cls
echo ============================================================
echo   Starting DMS Backend only  (http://localhost:%BACKEND_PORT%)
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    goto END
)

echo   Pulling latest code...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

if not exist "%V2%\node_modules" (
    echo   Installing backend dependencies...
    cd /d "%V2%"
    call npm install
    echo.
)

echo   Starting backend server...
start "DMS Backend" cmd /k "cd /d %V2% && npm run dev:server"
timeout /t 4 /nobreak >nul
start "" "http://localhost:%BACKEND_PORT%/api"
goto END

rem ─────────────────────────────────────────────────────────────
:END
echo.
echo   Done. Close this window or press any key to exit.
pause >nul
