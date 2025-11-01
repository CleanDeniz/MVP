Write-Host "`n=== Starting MVP Bonus Platform (Auto-Update Mode) ===" -ForegroundColor Green

# --- Ensure ngrok is available ---
$ngrokPath = (Get-Command ngrok.exe -ErrorAction SilentlyContinue).Source
if (-not $ngrokPath) {
    Write-Host "ngrok not found. Installing..." -ForegroundColor Yellow

    $ngrokZip = "$env:TEMP\ngrok.zip"
    Invoke-WebRequest -Uri "https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-windows-amd64.zip" -OutFile $ngrokZip

    Expand-Archive $ngrokZip -DestinationPath "C:\ngrok" -Force
    Remove-Item $ngrokZip
    $ngrokPath = "C:\ngrok\ngrok.exe"

    if (-not (Test-Path $ngrokPath)) {
        Write-Host "ERROR: ngrok installation failed." -ForegroundColor Red
        exit 1
    }

    $env:Path += ";C:\ngrok"
    Write-Host "ngrok installed to C:\ngrok" -ForegroundColor Green
} else {
    Write-Host "ngrok found at $ngrokPath" -ForegroundColor Green
}

# --- Start backend ---
Write-Host "`nStarting backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "cd server; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 5

# --- Start ngrok for backend (port 3001) ---
Write-Host "`nStarting ngrok for backend (port 3001)..." -ForegroundColor Cyan
Start-Process -FilePath "ngrok" -ArgumentList "http 3001 --log=stdout --log-format=logfmt" -WindowStyle Hidden

# --- Wait for ngrok to become available ---
$ngrokApi = "http://127.0.0.1:4040/api/tunnels"
$backendUrl = $null
$maxTries = 30
$tries = 0

Write-Host "Waiting for ngrok tunnel..." -ForegroundColor Yellow
while (-not $backendUrl -and $tries -lt $maxTries) {
    try {
        $response = Invoke-RestMethod -Uri $ngrokApi -ErrorAction Stop
        $backendUrl = ($response.tunnels | Where-Object { $_.config.addr -match "3001" }).public_url
    } catch {
        Start-Sleep -Seconds 1
        $tries++
    }
}

if (-not $backendUrl) {
    Write-Host "? Failed to detect ngrok backend URL after 30s." -ForegroundColor Red
    exit 1
}

Write-Host "? Backend ngrok URL: $backendUrl" -ForegroundColor Green

# --- Update client/.env.local ---
$envFilePath = "client\.env.local"
if (-not (Test-Path $envFilePath)) {
    Write-Host "Creating new .env.local..." -ForegroundColor Yellow
    New-Item -Path $envFilePath -ItemType File -Force | Out-Null
}

$envContent = Get-Content $envFilePath -Raw
if ($envContent -match "VITE_SERVER_URL=") {
    $envContent = $envContent -replace "VITE_SERVER_URL=.*", "VITE_SERVER_URL=$backendUrl"
} else {
    $envContent += "`nVITE_SERVER_URL=$backendUrl"
}
Set-Content $envFilePath $envContent -Encoding UTF8

Write-Host "? Updated client/.env.local with backend URL" -ForegroundColor Green

# --- Start frontend ---
Write-Host "`nStarting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "cd client; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 5

# --- Start ngrok for frontend (port 5173) ---
Write-Host "`nStarting ngrok for frontend (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "ngrok http 5173" -WindowStyle Normal

# --- Done ---
Write-Host "`nAll processes launched successfully!" -ForegroundColor Green
Write-Host "Check PowerShell windows labeled [server], [client], [ngrok]" -ForegroundColor Yellow
Write-Host "Links will appear in ngrok windows shortly." -ForegroundColor Gray
Write-Host "Copy the FRONTEND link (port 5173) and paste it into BotFather:" -ForegroundColor Cyan
Write-Host "Menu -> Edit Menu Button -> Web App URL" -ForegroundColor Cyan
