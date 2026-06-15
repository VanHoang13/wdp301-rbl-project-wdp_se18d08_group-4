# Chạy Node backend + Flutter customer app (một lệnh).
# Usage (từ thư mục gốc repo):
#   .\scripts\run-customer-with-be.ps1
#   .\scripts\run-customer-with-be.ps1 -d windows
#   .\scripts\run-customer-with-be.ps1 -d emulator-5554

param(
    [string]$d = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$backendDir = Join-Path $repoRoot "backend"
$appDir = Join-Path $repoRoot "mobile\customer_app"

if (-not (Test-Path $backendDir)) {
    Write-Error "Không tìm thấy backend: $backendDir"
}
if (-not (Test-Path $appDir)) {
    Write-Error "Không tìm thấy customer_app: $appDir"
}

Write-Host "==> Mở cửa sổ backend (npm run dev)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backendDir'; Write-Host 'UniMove API — http://localhost:3000/api/health' -ForegroundColor Green; npm run dev"
)

Write-Host "==> Đợi API sẵn sàng..." -ForegroundColor Cyan
$healthUrl = "http://localhost:3000/api/health"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if ($r.success -eq $true) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    Write-Warning "API chưa phản hồi /api/health — vẫn chạy Flutter (kiểm tra cửa sổ backend)."
} else {
    Write-Host "==> Backend OK: $healthUrl" -ForegroundColor Green
}

Set-Location $appDir
Write-Host "==> flutter pub get" -ForegroundColor Cyan
flutter pub get

Write-Host "==> flutter run (customer app)" -ForegroundColor Cyan
if ($d) {
    flutter run -d $d
} else {
    flutter run
}
