$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backendDir = Join-Path $root "backend"
$appDir = Join-Path $root "mobile\provider_app"

Write-Host "==> Starting backend (new window)..." -ForegroundColor Cyan
$beCmd = "Set-Location '$backendDir'; Write-Host 'UniMove API - Ctrl+C here stops backend only' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $beCmd)
Start-Sleep -Seconds 3

Set-Location $appDir
Write-Host "==> Flutter provider (Ctrl+C stops app only)" -ForegroundColor Cyan
flutter run @args
