@echo off
REM Anki Card Generator - Startup Script
REM This script starts both the backend API and frontend dev server

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo ============================================
echo   Anki Card Generator - Starting...
echo ============================================
echo.

REM Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if node is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Install Python dependencies if needed
echo [1/4] Checking Python dependencies...
python -m pip install -r backend\requirements.txt -q

REM Check if frontend dependencies are installed
echo [2/4] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo Frontend dependencies already installed.
)

echo.
echo [3/4] Starting Backend API server...
start "Anki Backend" cmd /k "cd /d "%SCRIPT_DIR%\backend" && python api.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend dev server...
start "Anki Frontend" cmd /k "cd /d "%SCRIPT_DIR%\frontend" && npm run dev"

echo.
echo ============================================
echo   Both servers are starting!
echo ============================================
echo.
echo   Backend API:  http://localhost:8000
echo   Frontend UI:  http://localhost:3000
echo.
echo   Close the terminal windows to stop the servers.
echo ============================================

REM Wait a moment then open the browser
timeout /t 5 /nobreak >nul
start http://localhost:3000

exit /b 0

