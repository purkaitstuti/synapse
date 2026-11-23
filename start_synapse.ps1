$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Python = Join-Path $Backend ".venv-ai\Scripts\python.exe"

function Test-Server($Url) {
    try {
        $response = Invoke-WebRequest `
            -Uri $Url `
            -UseBasicParsing `
            -TimeoutSec 3

        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

Write-Host "=== STARTING SYNAPSE ===" -ForegroundColor Cyan

if (-not (Test-Path $Python)) {
    throw "Backend Python environment not found."
}

if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    throw "Frontend dependencies not found."
}

# Backend
if (Test-Server "http://127.0.0.1:8000/api/health") {
    Write-Host "Backend already running." -ForegroundColor Green
}
else {
    if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
        throw "Port 8000 is occupied, but SYNAPSE health check failed. No process was stopped."
    }

    Write-Host "Launching backend..."

    Start-Process `
        -FilePath $Python `
        -ArgumentList "-m uvicorn api.main:app --host 127.0.0.1 --port 8000" `
        -WorkingDirectory $Backend
}

# Frontend
if (Test-Server "http://127.0.0.1:5173/app") {
    Write-Host "Frontend already running." -ForegroundColor Green
}
else {
    if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
        throw "Port 5173 is occupied, but frontend check failed. No process was stopped."
    }

    Write-Host "Launching frontend..."

    Start-Process `
        -FilePath "cmd.exe" `
        -ArgumentList '/k', 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort' `
        -WorkingDirectory $Frontend
}

Write-Host ""
Write-Host "SYNAPSE startup checks complete."
Write-Host "Dashboard: http://127.0.0.1:5173/app"
Write-Host "Allow a few seconds for newly started servers to initialize."
