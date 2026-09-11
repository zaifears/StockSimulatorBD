# A:\StockSimulatorBD\dev.ps1
# Local development startup script for StockSimulatorBD

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  StockSimulatorBD - Local Development Setup      " -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Start Python chart scraper daemon on port 8001
Write-Host "Starting Python DSE Chart Scraper (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_chart.py"

# 2. Start Python market sync daemon on port 8002
Write-Host "Starting Python DSE Market Sync (Port 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_market.py"

# 3. Configure local environment variables so Next.js routes to local Python servers
$env:PYTHON_API_URL = "http://127.0.0.1:8001"
$env:MARKET_SYNC_URL = "http://127.0.0.1:8002"

Write-Host "Connected local scrapers:" -ForegroundColor Cyan
Write-Host "  - PYTHON_API_URL  = $env:PYTHON_API_URL" -ForegroundColor Gray
Write-Host "  - MARKET_SYNC_URL = $env:MARKET_SYNC_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "Starting frontend server..." -ForegroundColor Green

# 4. Run local dev server (prefer vercel dev, fallback to pnpm dev)
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    vercel dev
} else {
    Write-Host "vercel CLI not found in PATH, running pnpm dev..." -ForegroundColor Yellow
    pnpm dev
}