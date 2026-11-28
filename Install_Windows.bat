@echo off
setlocal EnableExtensions EnableDelayedExpansion
:: ==============================================================================
:: Universal Windows One-Click Installer for Auto Filler Pro v3.4
:: Supports Adobe Illustrator CC 2015.3 (v20) through CC 2026+ (CSXS 4 - 24)
:: Works with or without Administrator rights (zero PowerShell policy blocks)
:: Developed by Yahia Bin Zaman | ColorLab
:: ==============================================================================

title Installing Auto Filler Pro v3.4 for Adobe Illustrator...
color 0b

set "SRC_DIR=%~dp0"
if "%SRC_DIR:~-1%"=="\" set "SRC_DIR=%SRC_DIR:~0,-1%"
set "EXT_ID=com.colorlab.autofillerpro"
set "USER_CEP=%APPDATA%\Adobe\CEP\extensions"
set "TARGET_USER=%USER_CEP%\%EXT_ID%"
set "SYS_CEP=%CommonProgramFiles%\Adobe\CEP\extensions"
set "TARGET_SYS=%SYS_CEP%\%EXT_ID%"
set "SYS86_CEP=%CommonProgramFiles(x86)%\Adobe\CEP\extensions"
set "USER_SCRIPTS=%USERPROFILE%\Documents\Adobe Scripts"
set "USER_FONTS=%LOCALAPPDATA%\Microsoft\Windows\Fonts"

set "IS_ADMIN=0"
net session >nul 2>&1
if %errorlevel%==0 set "IS_ADMIN=1"

echo.
echo ==========================================================
echo  Auto Filler Pro v3.4 - Windows Universal Installer
echo  Supports Illustrator CC 2015.3 (v20) - 2026+
echo  ColorLab Automation Suite ^| Yahia Bin Zaman
echo ==========================================================
echo.

if not exist "%SRC_DIR%\CSXS\manifest.xml" (
    echo [ERROR] CSXS\manifest.xml not found next to this installer!
    echo         Please extract the full ZIP folder first and try again.
    echo.
    pause
    exit /b 1
)

tasklist /FI "IMAGENAME eq Illustrator.exe" 2>nul | find /I "Illustrator.exe" >nul
if %errorlevel%==0 (
    echo [WARNING] Adobe Illustrator is currently running!
    echo           Please close Adobe Illustrator before restarting so panel files refresh cleanly.
    echo.
)

:: ------------------------------------------------------------------------------
:: 1. Enable CEP PlayerDebugMode for CSXS.4 through CSXS.24 (v20 - 2026+)
:: ------------------------------------------------------------------------------
echo [1/5] Enabling Adobe CEP PlayerDebugMode (CSXS.4 - CSXS.24)...
for /L %%V in (4,1,24) do (
    reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
    reg add "HKCU\Software\Adobe\CSXS.%%V" /v LogLevel /t REG_SZ /d 1 /f >nul 2>&1
    if "%IS_ADMIN%"=="1" (
        reg add "HKLM\SOFTWARE\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
        reg add "HKLM\SOFTWARE\WOW6432Node\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
    )
)

:: ------------------------------------------------------------------------------
:: 2. Remove legacy duplicates & clear stale Windows CEP caches
:: ------------------------------------------------------------------------------
echo [2/5] Cleaning legacy duplicates and CEP cache...
for %%L in ("Name_Card_AutoFiller" "com.colorlab.keyringautofiller") do (
    if exist "%USER_CEP%\%%~L" rmdir /S /Q "%USER_CEP%\%%~L" >nul 2>&1
    if "%IS_ADMIN%"=="1" (
        if exist "%SYS_CEP%\%%~L" rmdir /S /Q "%SYS_CEP%\%%~L" >nul 2>&1
        if defined CommonProgramFiles(x86) if exist "%SYS86_CEP%\%%~L" rmdir /S /Q "%SYS86_CEP%\%%~L" >nul 2>&1
    )
)

if exist "%LOCALAPPDATA%\Adobe\CEP\cache" rmdir /S /Q "%LOCALAPPDATA%\Adobe\CEP\cache" >nul 2>&1
if exist "%APPDATA%\Adobe\CEP\cache" rmdir /S /Q "%APPDATA%\Adobe\CEP\cache" >nul 2>&1
for /D %%C in ("%TEMP%\cep_cache*") do rmdir /S /Q "%%~C" >nul 2>&1

:: ------------------------------------------------------------------------------
:: 3. Copy Extension files cleanly (excluding .git / macOS junk)
:: ------------------------------------------------------------------------------
echo [3/5] Installing extension into User CEP folder...
if not exist "%USER_CEP%" mkdir "%USER_CEP%" >nul 2>&1
if exist "%TARGET_USER%" rmdir /S /Q "%TARGET_USER%" >nul 2>&1
mkdir "%TARGET_USER%" >nul 2>&1

set "EXCL_FILE=%TEMP%\autofiller_exclude_%RANDOM%.txt"
(
    echo .git\
    echo .DS_Store
    echo Thumbs.db
) > "%EXCL_FILE%"

xcopy "%SRC_DIR%\*" "%TARGET_USER%\" /E /I /Y /H /Q /EXCLUDE:%EXCL_FILE% >nul
if exist "%TARGET_USER%\.git" rmdir /S /Q "%TARGET_USER%\.git" >nul 2>&1

if "%IS_ADMIN%"=="1" (
    if not exist "%SYS_CEP%" mkdir "%SYS_CEP%" >nul 2>&1
    if exist "%TARGET_SYS%" rmdir /S /Q "%TARGET_SYS%" >nul 2>&1
    xcopy "%SRC_DIR%\*" "%TARGET_SYS%\" /E /I /Y /H /Q /EXCLUDE:%EXCL_FILE% >nul 2>&1
    if exist "%TARGET_SYS%\.git" rmdir /S /Q "%TARGET_SYS%\.git" >nul 2>&1
)

if exist "%EXCL_FILE%" del /F /Q "%EXCL_FILE%" >nul 2>&1

set "MISSING="
for %%R in ("CSXS\manifest.xml" "index.html" "js\CSInterface.js" "js\main.js" "jsx\hostscript.jsx") do (
    if not exist "%TARGET_USER%\%%~R" set "MISSING=!MISSING! %%~R"
)
if defined MISSING (
    echo [ERROR] Verification failed. Missing files:%MISSING%
    pause
    exit /b 1
)

:: ------------------------------------------------------------------------------
:: 4. Install bundled Bornomala Bangla fonts (per-user + system if Admin)
:: ------------------------------------------------------------------------------
echo [4/5] Installing Bornomala Bangla fonts...
if exist "%SRC_DIR%\fonts\*.ttf" (
    if not exist "%USER_FONTS%" mkdir "%USER_FONTS%" >nul 2>&1
    for %%F in ("%SRC_DIR%\fonts\*.ttf") do (
        copy /Y "%%~fF" "%USER_FONTS%\%%~nxF" >nul 2>&1
        reg add "HKCU\Software\Microsoft\Windows NT\CurrentVersion\Fonts" /v "%%~nF (TrueType)" /t REG_SZ /d "%USER_FONTS%\%%~nxF" /f >nul 2>&1
        if "%IS_ADMIN%"=="1" (
            copy /Y "%%~fF" "%WINDIR%\Fonts\%%~nxF" >nul 2>&1
            reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts" /v "%%~nF (TrueType)" /t REG_SZ /d "%%~nxF" /f >nul 2>&1
        )
    )
)

:: ------------------------------------------------------------------------------
:: 5. Register Set_Bornomala_Default.jsx in Adobe Scripts & Presets\Scripts
:: ------------------------------------------------------------------------------
echo [5/5] Registering helper scripts...
if not exist "%USER_SCRIPTS%" mkdir "%USER_SCRIPTS%" >nul 2>&1
if exist "%TARGET_USER%\Set_Bornomala_Default.jsx" (
    copy /Y "%TARGET_USER%\Set_Bornomala_Default.jsx" "%USER_SCRIPTS%\" >nul 2>&1
    if "%IS_ADMIN%"=="1" (
        for /D %%A in ("%ProgramFiles%\Adobe\Adobe Illustrator*") do (
            for /D %%P in ("%%~A\Presets\*") do (
                if exist "%%~P\Scripts" copy /Y "%TARGET_USER%\Set_Bornomala_Default.jsx" "%%~P\Scripts\" >nul 2>&1
            )
        )
    )
)

echo.
echo ==========================================================
echo  [SUCCESS] Auto Filler Pro v3.4 installed cleanly!
echo  User CEP : %TARGET_USER%
if "%IS_ADMIN%"=="1" echo  Sys CEP  : %TARGET_SYS%
echo  Scripts  : %USER_SCRIPTS%
echo.
echo  Restart Adobe Illustrator (v20 - 2026+) and open:
echo  Window ^> Extensions ^> Auto Filler Pro
echo ==========================================================
echo.
pause
