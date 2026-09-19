@echo off
:: ==============================================================================
:: One-Click Permanent Installer for Name & Card Auto-Filler (Windows)
:: ==============================================================================
title Installing Name & Card Auto-Filler for Adobe Illustrator...
color 0b

echo.
echo ==============================================================================
echo       Name ^& Card Auto-Filler - One-Click Installer for Adobe Illustrator
echo ==============================================================================
echo.

:: 1. Enable PlayerDebugMode in Windows Registry for CEP panels
echo [*] Enabling CEP Extension debug modes in Registry...
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
REG ADD "HKEY_CURRENT_USER\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

:: 2. Copy CEP Extension
echo [*] Installing Extension Panel to APPDATA...
set "CEP_DIR=%APPDATA%\Adobe\CEP\extensions\Name_Card_AutoFiller"
if not exist "%CEP_DIR%" mkdir "%CEP_DIR%"
xcopy /E /I /Y "%~dp0*" "%CEP_DIR%\" >nul 2>&1

:: 3. Copy Script to Illustrator Presets
echo [*] Installing standalone JSX script to Adobe Illustrator Presets...
for /d %%D in ("C:\Program Files\Adobe\Adobe Illustrator*") do (
    if exist "%%D\Presets" (
        for /d %%P in ("%%D\Presets\*") do (
            if exist "%%P\Scripts" (
                copy /Y "%~dp0Card_Data_AutoFiller.jsx" "%%P\Scripts\" >nul 2>&1
            )
        )
    )
)

echo.
echo ==============================================================================
echo  Installation Successful!
echo.
echo  Access in Illustrator:
echo   1. Extension Panel: Window ^> Extensions ^> Name ^& Card Auto-Filler
echo   2. Script Menu:     File ^> Scripts ^> Card_Data_AutoFiller
echo.
echo  (Please restart Adobe Illustrator to refresh the menus)
echo ==============================================================================
echo.
pause
