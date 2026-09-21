# A:\StockSimulatorBD\dev.ps1
# Local development startup script for StockSimulatorBD

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  StockSimulatorBD - Local Development Setup      " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# Function to safely release a busy port from a stale previous run
function Clean-Port([int]$port, [string]$name) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pids = $conn.OwningProcess | Select-Object -Unique
        foreach ($p in $pids) {
            Write-Host "Releasing busy port $port ($name, PID $p)..." -ForegroundColor DarkYellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 400
    }
}

# 1. Clean stale scrapers if still hanging from previous runs
Clean-Port 8001 "Chart Scraper"
Clean-Port 8002 "Market Sync"

# 2. Start Python chart scraper daemon on port 8001
Write-Host "Starting Python DSE Chart Scraper (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_chart.py" -WorkingDirectory $PSScriptRoot

# 3. Start Python market sync daemon on port 8002
Write-Host "Starting Python DSE Market Sync (Port 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_market.py" -WorkingDirectory $PSScriptRoot

# 4. Configure local environment variables so Next.js routes to local Python servers
$env:PYTHON_API_URL = "http://127.0.0.1:8001"
$env:MARKET_SYNC_URL = "http://127.0.0.1:8002"

Write-Host "Connected local scrapers:" -ForegroundColor Cyan
Write-Host "  - PYTHON_API_URL  = $env:PYTHON_API_URL" -ForegroundColor Gray
Write-Host "  - MARKET_SYNC_URL = $env:MARKET_SYNC_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting frontend server..." -ForegroundColor Green

# 5. Run local dev server (prefer pnpm dev for direct Next.js speed, or vercel dev if preferred)
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    vercel dev
} else {
    Write-Host "vercel CLI not found in PATH, running pnpm dev..." -ForegroundColor Yellow
    pnpm dev
}