#!/bin/bash
# ==============================================================================
# One-Click Permanent Installer for Name & Card Auto-Filler (macOS)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1. Enable CEP PlayerDebugMode for all Illustrator versions
defaults write com.adobe.CSXS.9 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.10 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.11 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.12 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.13 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.14 PlayerDebugMode 1 2>/dev/null || true
defaults write com.adobe.CSXS.15 PlayerDebugMode 1 2>/dev/null || true

# 2. Copy CEP Extension
CEP_USER_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller"
mkdir -p "$CEP_USER_DIR"
cp -R "$DIR/"* "$CEP_USER_DIR/" 2>/dev/null || true

# 3. Copy Standalone Script to /tmp and into Illustrator presets
cp -f "$DIR/jsx/hostscript.jsx" /tmp/Card_Data_AutoFiller.jsx

osascript <<EOF
tell application "System Events"
    activate
end tell
EOF

osascript <<EOF
do shell script "
for d in /Applications/Adobe\ Illustrator*; do
    if [ -d \"\$d\" ]; then
        for s in \"\$d\"/Presets.localized/*/Scripts; do
            if [ -d \"\$s\" ]; then
                cp -f /tmp/Card_Data_AutoFiller.jsx \"\$s/\" 2>/dev/null || true
            fi
        done
        for s in \"\$d\"/Presets/*/Scripts; do
            if [ -d \"\$s\" ]; then
                cp -f /tmp/Card_Data_AutoFiller.jsx \"\$s/\" 2>/dev/null || true
            fi
        done
    fi
done
" with administrator privileges

display dialog "Installation Successful!\n\nName & Card Auto-Filler has been installed.\n\n1. Extension Panel: Window > Extensions > Name & Card Auto-Filler\n2. Script Menu: File > Scripts > Card_Data_AutoFiller\n\n(Please restart Adobe Illustrator to refresh the menus)" with title "Name & Card Auto-Filler Installer" buttons {"Awesome!"} default button 1 with icon note
EOF
