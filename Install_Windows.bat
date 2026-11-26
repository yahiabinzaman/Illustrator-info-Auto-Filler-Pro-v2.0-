@echo off
:: ==============================================================================
:: One-Click Installer for Auto Filler Pro (Windows)
:: ==============================================================================
title Installing Auto Filler Pro v3.0 for Adobe Illustrator...
color 0b

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
