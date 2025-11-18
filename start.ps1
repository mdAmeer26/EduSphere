# EduSphere - Start Everything
# Launches backend and frontend in separate PowerShell windows

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Launching EduSphere (Backend + Frontend)..." -ForegroundColor Cyan

# Start backend in new window
$backendScript = Join-Path $RootDir "backend\start.ps1"
Write-Host "Starting backend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$backendScript`""

# Wait 2 seconds for backend to initialize
Start-Sleep -Seconds 2

# Start frontend in new window
$frontendScript = Join-Path $RootDir "frontend\start.ps1"
Write-Host "Starting frontend in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$frontendScript`""

Write-Host ""
Write-Host "==> EduSphere is starting!" -ForegroundColor Green
Write-Host "    Backend:  http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "    Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both servers will open in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow
