
# Start the AI Service in Virtual Environment
$venvPython = ".\venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual Environment not found! Please run .\setup.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting AI Microservice..." -ForegroundColor Green
& $venvPython main.py
