# Anki Card Generator - Startup Script (PowerShell)
# This script starts both the backend API and frontend dev server

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Ensure path is properly quoted to handle spaces and hyphens
Set-Location -LiteralPath $ScriptDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Anki Card Generator - Starting..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Python dependencies if needed
Write-Host "[1/4] Checking Python dependencies..." -ForegroundColor Yellow
python -m pip install -r backend\requirements.txt -q

# Check if frontend dependencies are installed
Write-Host "[2/4] Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm.cmd install
    Set-Location $ScriptDir
} else {
    Write-Host "Frontend dependencies already installed." -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/4] Starting Backend API server..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$ScriptDir\backend`" && python api.py" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

Write-Host "[4/4] Starting Frontend dev server..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$ScriptDir\frontend`" && npm.cmd run dev" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Both servers are starting!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend API:  " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend UI:  " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Close the terminal windows to stop the servers." -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Green

# Wait a moment then open the browser
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

