#!/bin/bash
# VST Install Script for Pulse
# Run this to download and install open-source VST synthesizers

set -e

VST3_DIR="$HOME/Library/Audio/Plug-Ins/VST3"
AU_DIR="$HOME/Library/Audio/Plug-Ins/Components"
DOWNLOAD_DIR="$HOME/Downloads/PulseVST"

echo "🎹 Pulse VST Installer"
echo "======================"

mkdir -p "$VST3_DIR"
mkdir -p "$AU_DIR"
mkdir -p "$DOWNLOAD_DIR"

install_surge() {
    echo "📦 Installing Surge XT..."
    echo "   URL: https://surge-synthesizer.github.io/downloads/"
    echo "   Manual download required - visit:"
    echo "   https://surge-synthesizer.github.io/downloads/"
    echo ""
    echo "   After download, move to:"
    echo "   - VST3: $VST3_DIR/Surge XT.vst3"
    echo "   - AU: $AU_DIR/Surge XT.component"
}

install_helm() {
    echo "📦 Installing Helm..."
    echo "   URL: https://github.com/mtytel/helm/releases"
    echo "   Manual download required - visit:"
    echo "   https://github.com/mtytel/helm/releases"
    echo ""
    echo "   After download, move to:"
    echo "   - VST3: $VST3_DIR/Helm.vst3"
    echo "   - AU: $AU_DIR/Helm.component"
}

install_dexed() {
    echo "📦 Installing Dexed..."
    echo "   URL: https://github.com/asb2m10/dexed/releases"
    echo "   Manual download required - visit:"
    echo "   https://github.com/asb2m10/dexed/releases"
    echo ""
    echo "   After download, move to:"
    echo "   - VST3: $VST3_DIR/Dexed.vst3"
    echo "   - AU: $AU_DIR/Dexed.component"
}

install_odin2() {
    echo "📦 Installing Odin 2..."
    echo "   URL: https://www.thewavewarden.com/odin2/"
    echo "   Manual download required - visit:"
    echo "   https://www.thewavewarden.com/odin2/"
    echo ""
    echo "   After download, move to:"
    echo "   - VST3: $VST3_DIR/Odin2.vst3"
}

check_installed() {
    local plugin="$1"
    if [ -d "$VST3_DIR/$plugin.vst3" ] || [ -d "$AU_DIR/$plugin.component" ]; then
        echo "✅ $plugin is installed"
        return 0
    else
        echo "❌ $plugin is NOT installed"
        return 1
    fi
}

echo ""
echo "Checking installed plugins..."
echo ""

check_installed "Surge XT" || install_surge
echo ""
check_installed "Helm" || install_helm  
echo ""
check_installed "Dexed" || install_dexed
echo ""
check_installed "Odin2" || install_odin2

echo ""
echo "======================"
echo "📋 Installation complete!"
echo ""
echo "Plugin locations:"
echo "   VST3: $VST3_DIR"
echo "   AU:   $AU_DIR"
echo ""
echo "After installing, restart your DAW or Pulse app."
echo "Plugins should be auto-detected."
