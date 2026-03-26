@echo off
setlocal enabledelayedexpansion
title DMS Application Launcher

set ROOT=C:\WebApps\DMSProto
set V2=%ROOT%\DMS_V2
set RB=%ROOT%\DMS_RB

set V2_PORT=3000
set RB_PORT=5173

cls
echo ============================================================
echo   DMS Application Launcher
echo ============================================================
echo.
echo   [1]  Start DMS V2   (Full stack - Node + React + SQLite)
echo   [2]  Start DMS RB   (React Bootstrap client)
echo   [3]  Start BOTH
echo   [4]  Exit
echo.
echo ============================================================
set /p CHOICE=  Enter choice [1-4]:

if "%CHOICE%"=="1" goto START_V2
if "%CHOICE%"=="2" goto START_RB
if "%CHOICE%"=="3" goto START_BOTH
if "%CHOICE%"=="4" goto END

echo   Invalid choice. Please enter 1, 2, 3 or 4.
pause
goto :eof

rem ─────────────────────────────────────────────────────────────
:START_V2
cls
echo ============================================================
echo   Starting DMS V2  (http://localhost:%V2_PORT%)
echo ============================================================
echo.

rem Check Node is installed
where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    goto END
)

rem Pull latest code
echo   Pulling latest code for DMS V2...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

rem Install dependencies if node_modules missing
if not exist "%V2%\node_modules" (
    echo   Installing server dependencies...
    cd /d "%V2%"
    call npm install
    echo.
)
if not exist "%V2%\client\node_modules" (
    echo   Installing client dependencies...
    cd /d "%V2%\client"
    call npm install
    echo.
)

echo   Launching DMS V2...
echo   Server + Client will open in a new window.
echo.
start "DMS V2" cmd /k "cd /d %V2% && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:%V2_PORT%"
goto END

rem ─────────────────────────────────────────────────────────────
:START_RB
cls
echo ============================================================
echo   Starting DMS RB  (http://localhost:%RB_PORT%)
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    goto END
)

rem Pull latest code
echo   Pulling latest code for DMS RB...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

if not exist "%RB%\client\node_modules" (
    echo   Installing client dependencies...
    cd /d "%RB%"
    call npm run install:client
    echo.
)

echo   Launching DMS RB...
start "DMS RB" cmd /k "cd /d %RB% && npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:%RB_PORT%"
goto END

rem ─────────────────────────────────────────────────────────────
:START_BOTH
cls
echo ============================================================
echo   Starting DMS V2  (http://localhost:%V2_PORT%)
echo   Starting DMS RB  (http://localhost:%RB_PORT%)
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js not found. Please install Node.js from https://nodejs.org
    pause
    goto END
)

rem Pull latest code
echo   Pulling latest code...
cd /d "%ROOT%"
git pull
echo.
echo   Waiting 5 seconds...
timeout /t 5 /nobreak >nul

if not exist "%V2%\node_modules" (
    echo   Installing DMS V2 server dependencies...
    cd /d "%V2%" && call npm install
    echo.
)
if not exist "%V2%\client\node_modules" (
    echo   Installing DMS V2 client dependencies...
    cd /d "%V2%\client" && call npm install
    echo.
)
if not exist "%RB%\client\node_modules" (
    echo   Installing DMS RB client dependencies...
    cd /d "%RB%" && call npm run install:client
    echo.
)

echo   Launching DMS V2...
start "DMS V2" cmd /k "cd /d %V2% && npm run dev"
timeout /t 2 /nobreak >nul

echo   Launching DMS RB...
start "DMS RB" cmd /k "cd /d %RB% && npm run dev"
timeout /t 4 /nobreak >nul

start "" "http://localhost:%V2_PORT%"
start "" "http://localhost:%RB_PORT%"
goto END

rem ─────────────────────────────────────────────────────────────
:END
echo.
echo   Done. Close this window or press any key to exit.
pause >nul
