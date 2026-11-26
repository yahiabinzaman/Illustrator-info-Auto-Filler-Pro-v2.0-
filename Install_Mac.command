#!/bin/bash
# ==============================================================================
# One-Click Double-Click Installer for Auto Filler Pro (macOS)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
if bash "$DIR/install.sh"; then
osascript <<EOF
display dialog "Installation Successful!\n\nAuto Filler Pro v3.3 has been installed.\n\nOpen in Adobe Illustrator:\nWindow > Extensions > Auto Filler Pro\n\n(Please restart Adobe Illustrator to refresh the menus)" with title "Auto Filler Pro Installer" buttons {"Awesome!"} default button 1 with icon note
EOF
else
osascript <<EOF
display dialog "Installation failed. Please check the Terminal output for details." with title "Auto Filler Pro Installer" buttons {"OK"} default button 1 with icon stop
EOF
fi
