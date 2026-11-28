#!/usr/bin/env bash
# ==============================================================================
# Auto Filler Pro (ColorLab Edition) - Automated 1-Line Installer for macOS
# Developed by Yahia Bin Zaman | https://github.com/yahiabinzaman
# ==============================================================================

set -e

echo ""
echo -e "\033[1;36m==========================================================\033[0m"
echo -e "\033[1;32m Auto Filler Pro v3.4 - Installer (macOS)                 \033[0m"
echo -e "\033[1;33m ColorLab Automation Suite | Yahia Bin Zaman              \033[0m"
echo -e "\033[1;36m==========================================================\033[0m"
echo ""

# 1. Enable PlayerDebugMode in macOS defaults for Adobe CSXS
echo -e "\033[0;37m[1/4] Configuring Adobe CEP PlayerDebugMode...\033[0m"
for ver in 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    defaults write com.adobe.CSXS.$ver PlayerDebugMode 1 2>/dev/null || true
done

# 2. Target Directory & Legacy Cleanup
CEP_BASE="$HOME/Library/Application Support/Adobe/CEP/extensions"
TARGET_DIR="$CEP_BASE/com.colorlab.autofillerpro"
mkdir -p "$CEP_BASE"

# Remove legacy duplicate installs & stale caches so only Auto Filler Pro appears
rm -rf "$CEP_BASE/Name_Card_AutoFiller" "$CEP_BASE/com.colorlab.keyringautofiller" 2>/dev/null || true
rm -rf "$HOME/Library/Caches/CSXS/cep_cache/ILST_"*"_com.colorlab."*"autofiller"* 2>/dev/null || true

# 3. Install from local source or download latest archive from GitHub
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
fi
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/CSXS/manifest.xml" ]; then
    echo -e "\033[0;37m[2/4] Installing from local source files...\033[0m"
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    shopt -s dotglob 2>/dev/null || true
    cp -R "$SCRIPT_DIR/"* "$TARGET_DIR/" 2>/dev/null || true
    shopt -u dotglob 2>/dev/null || true
else
    echo -e "\033[1;36m[2/4] Downloading latest Auto Filler Pro from GitHub...\033[0m"
    TEMP_DIR=$(mktemp -d)
    curl -fsSL "https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/archive/refs/heads/main.zip" -o "$TEMP_DIR/autofiller.zip"
    echo -e "\033[0;37m[3/4] Extracting and deploying extension...\033[0m"
    unzip -q -o "$TEMP_DIR/autofiller.zip" -d "$TEMP_DIR"
    rm -rf "$TARGET_DIR"
    mkdir -p "$TARGET_DIR"
    EXTRACTED_FOLDER=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
    if [ -d "$EXTRACTED_FOLDER" ]; then
        shopt -s dotglob 2>/dev/null || true
        cp -R "$EXTRACTED_FOLDER/"* "$TARGET_DIR/" 2>/dev/null || true
        shopt -u dotglob 2>/dev/null || true
    fi
    rm -rf "$TEMP_DIR"
fi
rm -rf "$TARGET_DIR/.git" "$TARGET_DIR/.DS_Store" 2>/dev/null || true

if [ ! -f "$TARGET_DIR/CSXS/manifest.xml" ] || [ ! -f "$TARGET_DIR/jsx/hostscript.jsx" ]; then
    echo -e "\033[1;31m[ERROR] Extension files could not be installed in: $TARGET_DIR\033[0m"
    exit 1
fi

# 4. Install Bornomala Fonts (if missing) & Helper Script
echo -e "\033[0;37m[4/4] Installing fonts and helper scripts...\033[0m"
if [ -d "$TARGET_DIR/fonts" ]; then
    mkdir -p "$HOME/Library/Fonts"
    cp -n "$TARGET_DIR/fonts/"*.ttf "$HOME/Library/Fonts/" 2>/dev/null || true
fi

USER_SCRIPTS="$HOME/Documents/Adobe Scripts"
mkdir -p "$USER_SCRIPTS"
if [ -f "$TARGET_DIR/Set_Bornomala_Default.jsx" ]; then
    cp -f "$TARGET_DIR/Set_Bornomala_Default.jsx" "$USER_SCRIPTS/" 2>/dev/null || true
fi

echo ""
echo -e "\033[1;32m==========================================================\033[0m"
echo -e "\033[1;32m [SUCCESS] Auto Filler Pro v3.4 installed!                \033[0m"
echo -e "\033[1;37m Extension: $TARGET_DIR\033[0m"
echo -e "\033[1;37m Scripts:   $USER_SCRIPTS\033[0m"
echo -e "\033[1;33m Restart Adobe Illustrator and open:\033[0m"
echo -e "\033[1;37m Window > Extensions > Auto Filler Pro\033[0m"
echo -e "\033[1;32m==========================================================\033[0m"
echo ""

osascript -e 'display notification "Auto Filler Pro v3.4 installed! Restart Illustrator to use." with title "Auto Filler Pro"' 2>/dev/null || true
