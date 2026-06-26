Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_chart.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python api\run_market.py"
vercel dev