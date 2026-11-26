# ==============================================================================
# Auto Filler Pro (ColorLab Edition) v3.3 - Automated Installer for Windows
# Supports Illustrator CC 2015.3 (v20) through CC 2026+ (CSXS 4 - 24)
# Developed by Yahia Bin Zaman | https://github.com/yahiabinzaman
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Auto Filler Pro v3.3 - Windows Installer                 " -ForegroundColor Green
Write-Host " Supports Illustrator CC 2015.3 (v20) - 2026+             " -ForegroundColor Cyan
Write-Host " ColorLab Automation Suite | Yahia Bin Zaman              " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$aiRunning = Get-Process -Name "Illustrator" -ErrorAction SilentlyContinue
if ($aiRunning) {
    Write-Host "[WARNING] Adobe Illustrator is currently running!" -ForegroundColor Yellow
    Write-Host "Please close Adobe Illustrator first so all extension files update cleanly." -ForegroundColor Yellow
    Write-Host ""
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# 1. Enable PlayerDebugMode in Windows Registry for Adobe CEP (CSXS 4..24)
Write-Host "[1/5] Configuring Adobe CEP PlayerDebugMode (CSXS 4 - 24) in Registry..." -ForegroundColor Gray
foreach ($ver in 4..24) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Type String -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "LogLevel" -Value "1" -Type String -Force | Out-Null
    if ($isAdmin) {
        foreach ($hklmBase in @("HKLM:\SOFTWARE\Adobe\CSXS.$ver", "HKLM:\SOFTWARE\WOW6432Node\Adobe\CSXS.$ver")) {
            try {
                if (!(Test-Path $hklmBase)) { New-Item -Path $hklmBase -Force | Out-Null }
                Set-ItemProperty -Path $hklmBase -Name "PlayerDebugMode" -Value "1" -Type String -Force | Out-Null
            } catch {}
        }
    }
}

# 2. Target Directory, Legacy Cleanup & Stale CEP Cache Removal
Write-Host "[2/5] Cleaning legacy folders and Windows CEP cache..." -ForegroundColor Gray
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
    if ($isAdmin -and $env:CommonProgramFiles) {
        $sysLegacy = Join-Path "$env:CommonProgramFiles\Adobe\CEP\extensions" $legacy
        if (Test-Path $sysLegacy) {
            Remove-Item -Path $sysLegacy -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

foreach ($cachePath in @("$env:LOCALAPPDATA\Adobe\CEP\cache", "$env:APPDATA\Adobe\CEP\cache")) {
    if (Test-Path $cachePath) {
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Get-ChildItem -Path $env:TEMP -Filter "cep_cache*" -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

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
    Write-Host "[3/5] Installing from local source files..." -ForegroundColor Gray
    Get-ChildItem -Path $scriptDir -Force | Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".DS_Store" } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetDir -Recurse -Force
    }
} else {
    Write-Host "[3/5] Downloading Auto Filler Pro from GitHub..." -ForegroundColor Cyan
    $tempZip = "$env:TEMP\Auto-Filler-Pro-main.zip"
    $tempExtract = "$env:TEMP\Auto-Filler-Pro-extract"
    if (Test-Path $tempZip) { Remove-Item -Force $tempZip -ErrorAction SilentlyContinue }
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue }

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType](3072 -bor 12288)
    } catch {
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]3072
        } catch {}
    }

    $url = "https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/archive/refs/heads/main.zip"
    try {
        Invoke-WebRequest -Uri $url -OutFile $tempZip -UseBasicParsing
    } catch {
        (New-Object System.Net.WebClient).DownloadFile($url, $tempZip)
    }

    Write-Host "      Extracting and deploying extension..." -ForegroundColor Gray
    if (Get-Command Expand-Archive -ErrorAction SilentlyContinue) {
        Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
    } else {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($tempZip, $tempExtract)
    }

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

# 4. Install Bornomala Bangla Fonts
Write-Host "[4/5] Installing Bornomala Bangla fonts..." -ForegroundColor Gray
$fontsSrc = Join-Path $targetDir "fonts"
if (Test-Path $fontsSrc) {
    $userFontsDir = Join-Path $env:LOCALAPPDATA "Microsoft\Windows\Fonts"
    if (!(Test-Path $userFontsDir)) {
        New-Item -ItemType Directory -Path $userFontsDir -Force -ErrorAction SilentlyContinue | Out-Null
    }
    $userFontsReg = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts"
    if (!(Test-Path $userFontsReg)) {
        New-Item -Path $userFontsReg -Force -ErrorAction SilentlyContinue | Out-Null
    }
    Get-ChildItem -Path $fontsSrc -Filter "*.ttf" -ErrorAction SilentlyContinue | ForEach-Object {
        $destUserFont = Join-Path $userFontsDir $_.Name
        Copy-Item -Path $_.FullName -Destination $destUserFont -Force -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $userFontsReg -Name "$($_.BaseName) (TrueType)" -Value $destUserFont -Type String -Force -ErrorAction SilentlyContinue
        if ($isAdmin) {
            try {
                Copy-Item -Path $_.FullName -Destination (Join-Path "$env:WINDIR\Fonts" $_.Name) -Force -ErrorAction SilentlyContinue
                Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" -Name "$($_.BaseName) (TrueType)" -Value $_.Name -Type String -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
}

# 5. Copy helper JSX script to Documents\Adobe Scripts (+ Illustrator Presets if Admin)
Write-Host "[5/5] Registering helper scripts..." -ForegroundColor Gray
$userScripts = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "Adobe Scripts"
if (!(Test-Path $userScripts)) {
    New-Item -ItemType Directory -Path $userScripts -Force -ErrorAction SilentlyContinue | Out-Null
}
$helperScript = "$targetDir\Set_Bornomala_Default.jsx"
if (Test-Path $helperScript) {
    Copy-Item -Path $helperScript -Destination $userScripts -Force -ErrorAction SilentlyContinue
    if ($isAdmin) {
        Get-ChildItem -Path "$env:ProgramFiles\Adobe" -Filter "Adobe Illustrator*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            Get-ChildItem -Path (Join-Path $_.FullName "Presets") -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $presetScripts = Join-Path $_.FullName "Scripts"
                if (Test-Path $presetScripts) {
                    Copy-Item -Path $helperScript -Destination $presetScripts -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Auto Filler Pro v3.3 installed!                " -ForegroundColor Green
Write-Host " Extension: $targetDir" -ForegroundColor Gray
Write-Host " Scripts:   $userScripts" -ForegroundColor Gray
Write-Host " Restart Adobe Illustrator (v20 - 2026+) and open:" -ForegroundColor Yellow
Write-Host " Window > Extensions > Auto Filler Pro" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
