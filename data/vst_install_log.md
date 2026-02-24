# VST Install Log

**Date:** 2026-02-24  
**Status:** PENDING - Manual download required

---

## Overview

This log tracks VST plugin installation for Pulse.

## macOS Plugin Paths

- **VST3:** `~/Library/Audio/Plug-Ins/VST3/` or `/Library/Audio/Plug-Ins/VST3/`
- **AU:** `~/Library/Audio/Plug-Ins/Components/` or `/Library/Audio/Plug-Ins/Components/`

## Download Links

| Plugin | Version | License | Download URL |
|--------|---------|---------|--------------|
| Surge XT | 1.3.4 | GPL-3.0 | https://surse-synthesizer.github.io/downloads/ |
| Helm | 0.9.0 | GPL-3.0 | https://github.com/mtytel/helm/releases |
| Dexed | 0.9.8 | GPL-3.0 | https://github.com/asb2m10/dexed/releases |
| Odin 2 | 3.1.0 | GPL-3.0 | https://www.thewavewarden.com/odin2/ |

## Installation Steps

### 1. Download Plugins

```bash
# Create download directory
mkdir -p ~/Downloads/PulseVST
cd ~/Downloads/PulseVST

# Open download pages (manual)
open https://surge-synthesizer.github.io/downloads/
open https://github.com/mtytel/helm/releases
open https://github.com/asb2m10/dexed/releases
open https://www.thewavewarden.com/odin2/
```

### 2. Install VST3

```bash
# Copy to user VST3 folder
cp -R "Surge XT.vst3" ~/Library/Audio/Plug-Ins/VST3/
cp -R "Helm.vst3" ~/Library/Audio/Plug-Ins/VST3/
cp -R "Dexed.vst3" ~/Library/Audio/Plug-Ins/VST3/
cp -R "Odin2.vst3" ~/Library/Audio/Plug-Ins/VST3/
```

### 3. Install AudioUnits (AU)

```bash
# Copy to user Components folder
cp -R "Surge XT.component" ~/Library/Audio/Plug-Ins/Components/
cp -R "Helm.component" ~/Library/Audio/Plug-Ins/Components/
cp -R "Dexed.component" ~/Library/Audio/Plug-Ins/Components/
```

### 4. Rescan Plugins

Restart your DAW or run:
```bash
# Clear plugin cache (if applicable)
# DAW-specific commands
```

## Manual Download Required

⚠️ **Important:** Due to GitHub license requirements, automatic download scripts cannot be provided. 

Please visit the download URLs above and:
1. Accept the license agreements
2. Download the macOS versions (VST3 or AU)
3. Follow the installation steps above

## Verification

After installation, verify with:

```bash
# Check VST3
ls ~/Library/Audio/Plug-Ins/VST3/

# Check AU
ls ~/Library/Audio/Plug-Ins/Components/
```

---

## Notes

- Surge XT is the **primary recommendation** for Pulse (Berlin School, Ambient, Experimental)
- Helm is **lightweight** and great for EDM/pop
- Dexed is for **FM synthesis** (80s sounds)
- Odin 2 is for **pads and atmospheric** sounds
