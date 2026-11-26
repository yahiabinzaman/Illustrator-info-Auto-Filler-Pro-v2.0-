# ==============================================================================
# Auto Filler Pro (ColorLab Edition) v3.0 - Automated Installer for Windows
# Developed by Yahia Bin Zaman | https://github.com/yahiabinzaman
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Auto Filler Pro v3.0 - Windows Installer                 " -ForegroundColor Green
Write-Host " ColorLab Automation Suite | Yahia Bin Zaman              " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$aiRunning = Get-Process -Name "Illustrator" -ErrorAction SilentlyContinue
if ($aiRunning) {
    Write-Host "[WARNING] Adobe Illustrator is currently running!" -ForegroundColor Yellow
    Write-Host "Please close Adobe Illustrator first so all extension files update cleanly." -ForegroundColor Yellow
    Write-Host ""
}

# 1. Enable PlayerDebugMode in Windows Registry for Adobe CEP
Write-Host "[1/4] Configuring Adobe CEP PlayerDebugMode in Registry..." -ForegroundColor Gray
$csxsVersions = @(8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20)
foreach ($ver in $csxsVersions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Type String -Force | Out-Null
}

# 2. Target Directory & Legacy Cleanup
$parentDir = "$env:APPDATA\Adobe\CEP\extensions"
$targetDir = "$parentDir\com.colorlab.autofillerpro"
if (!(Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

foreach ($legacy in @("Name_Card_AutoFiller", "com.colorlab.keyringautofiller")) {
    $legacyPath = Join-Path $parentDir $legacy
    if (Test-Path $legacyPath) {
        Remove-Item -Path $legacyPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path $targetDir) {
    try {
        Remove-Item -Path $targetDir -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Host "[ERROR] Could not remove existing extension folder: $targetDir" -ForegroundColor Red
        Write-Host "Close Adobe Illustrator completely and re-run this installer." -ForegroundColor Yellow
        return
    }
}
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

# 3. Install from local repository folder or download latest ZIP from GitHub
$scriptDir = $null
if ($MyInvocation.MyCommand.Path) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ($scriptDir -and (Test-Path "$scriptDir\CSXS\manifest.xml")) {
    Write-Host "[2/4] Installing from local source files..." -ForegroundColor Gray
    Get-ChildItem -Path $scriptDir -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".DS_Store" } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetDir -Recurse -Force
    }
} else {
    Write-Host "[2/4] Downloading Auto Filler Pro from GitHub..." -ForegroundColor Cyan
    $tempZip = "$env:TEMP\Auto-Filler-Pro-main.zip"
    $tempExtract = "$env:TEMP\Auto-Filler-Pro-extract"
    if (Test-Path $tempZip) { Remove-Item -Force $tempZip -ErrorAction SilentlyContinue }
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue }

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    } catch {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    }
    $url = "https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/archive/refs/heads/main.zip"
    Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing

    Write-Host "[3/4] Extracting and deploying extension..." -ForegroundColor Gray
    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

    $extractedFolder = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
    if (!$extractedFolder -or !(Test-Path "$($extractedFolder.FullName)\CSXS\manifest.xml")) {
        Write-Host "[ERROR] Downloaded archive did not contain extension files." -ForegroundColor Red
        return
    }

    Get-ChildItem -Path $extractedFolder.FullName -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".DS_Store" } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetDir -Recurse -Force
    }

    Remove-Item -Force $tempZip -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
}

# Verify deployed files
$requiredFiles = @(
    "CSXS\manifest.xml",
    "index.html",
    "js\CSInterface.js",
    "js\main.js",
    "jsx\hostscript.jsx"
)
foreach ($req in $requiredFiles) {
    if (!(Test-Path "$targetDir\$req")) {
        Write-Host "[ERROR] Installation verification failed. Missing: $targetDir\$req" -ForegroundColor Red
        return
    }
}

# 4. Copy helper JSX script to Documents\Adobe Scripts
Write-Host "[4/4] Registering helper scripts..." -ForegroundColor Gray
$userScripts = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Adobe Scripts"
if (!(Test-Path $userScripts)) {
    New-Item -ItemType Directory -Path $userScripts -Force -ErrorAction SilentlyContinue | Out-Null
}
$helperScript = "$targetDir\Set_Bornomala_Default.jsx"
if (Test-Path $helperScript) {
    Copy-Item -Path $helperScript -Destination $userScripts -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Auto Filler Pro v3.0 installed!                " -ForegroundColor Green
Write-Host " Extension: $targetDir" -ForegroundColor Gray
Write-Host " Scripts:   $userScripts" -ForegroundColor Gray
Write-Host " Restart Adobe Illustrator and open:" -ForegroundColor Yellow
Write-Host " Window > Extensions > Auto Filler Pro" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
