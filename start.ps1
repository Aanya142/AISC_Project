# AISC Traffic Signal Optimization - Startup Script
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ' AI Traffic Signal Optimization System' -ForegroundColor Cyan  
Write-Host '========================================' -ForegroundColor Cyan

Write-Host ''
Write-Host 'Starting Backend (FastAPI on port 8000)...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 3

Write-Host 'Starting Frontend (Vite on port 5173)...' -ForegroundColor Yellow  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev -- --host 127.0.0.1 --port 5173"

Start-Sleep -Seconds 3

Write-Host ''
Write-Host 'Both servers starting. Open:' -ForegroundColor Green
Write-Host '  Dashboard:  http://localhost:5173' -ForegroundColor White
Write-Host '  API Docs:   http://localhost:8000/docs' -ForegroundColor White  
Write-Host '  Health:     http://localhost:8000/api/health' -ForegroundColor White
