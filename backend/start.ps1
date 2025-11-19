# EduSphere Backend Startup Script
# Ensures venv exists, installs deps, and starts FastAPI on port 8000

$ErrorActionPreference = "Stop"
$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Starting EduSphere Backend..." -ForegroundColor Cyan
Set-Location $BackendDir

# Create venv if missing
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

# Install/upgrade dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& ".\.venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
& ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet

# Set OpenAI API Key (for real AI generation)
# $env:OPENAI_API_KEY = "<your-openai-api-key>"  # Set this manually or via environment variable before running

# Start Uvicorn
Write-Host "Starting FastAPI on http://127.0.0.1:8000" -ForegroundColor Green
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
