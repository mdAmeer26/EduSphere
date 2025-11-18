# EduSphere Frontend Startup Script
# Detects npm location, installs deps, and starts Vite on port 5173

$ErrorActionPreference = "Stop"
$FrontendDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Starting EduSphere Frontend..." -ForegroundColor Cyan
Set-Location $FrontendDir

# Detect npm.cmd location
$npm = $null
$possiblePaths = @(
    "C:\Program Files\nodejs\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd",
    "$env:ProgramFiles\nodejs\npm.cmd"
)

foreach ($p in $possiblePaths) {
    if (Test-Path $p) {
        $npm = $p
        break
    }
}

if (-not $npm) {
    Write-Host "ERROR: npm.cmd not found. Install Node.js LTS from https://nodejs.org" -ForegroundColor Red
    Write-Host "Tried locations:" -ForegroundColor Yellow
    $possiblePaths | ForEach-Object { Write-Host "  $_" }
    exit 1
}

Write-Host "Using npm at: $npm" -ForegroundColor Green

# Ensure Node directory on PATH for this process so npm can spawn 'node'
$nodeDir = Split-Path -Parent $npm
if ($env:Path -notlike "*$nodeDir*") {
    $env:Path = "$nodeDir;" + $env:Path
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& $npm install

# Start Vite dev server (opens browser automatically)
Write-Host "Starting Vite on http://localhost:5173" -ForegroundColor Green
& $npm run dev
