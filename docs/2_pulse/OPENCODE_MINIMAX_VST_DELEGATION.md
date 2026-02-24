# OpenCode Delegation — VST Synth Preparation for Pulse

**Owner:** Minimax (OpenCode)
**Date:** 2026-02-24
**Goal:** Download and prepare open-source synth plugins for Pulse integration tests on macOS.

## Scope
1. Download only legal/open-source synths (or clearly marked free redistributable where license allows).
2. Install plugins into standard macOS locations.
3. Produce machine-readable inventory for Pulse.
4. Prepare starter mapping: `scale/genre -> synth/preset category`.

## Required Outputs
1. `pulse/data/vst_inventory.json`
2. `pulse/data/vst_install_log.md`
3. `pulse/data/vst_genre_mapping.json`
4. `pulse/docs/2_pulse/VST_INTEGRATION_NOTES.md`

## Target Plugin Candidates (priority)
1. Surge XT (open-source, primary Berlin School candidate)
2. Helm (open-source subtractive)
3. Dexed (open-source FM)
4. Odin 2 (open-source hybrid)
5. (Optional) Vital Free — only if license permits local use notes

## macOS Paths
- VST3: `/Library/Audio/Plug-Ins/VST3`
- AudioUnits: `/Library/Audio/Plug-Ins/Components`
- User-level fallback:
  - `~/Library/Audio/Plug-Ins/VST3`
  - `~/Library/Audio/Plug-Ins/Components`

## Inventory JSON Schema (minimum)
```json
[
  {
    "id": "surge_xt",
    "name": "Surge XT",
    "format": ["VST3", "AU"],
    "paths": ["/Library/Audio/Plug-Ins/VST3/Surge XT.vst3"],
    "version": "x.y.z",
    "license": "GPL-3.0",
    "source_url": "https://...",
    "checksum_sha256": "...",
    "status": "installed"
  }
]
```

## Genre Mapping JSON Schema (minimum)
```json
{
  "BerlinSchool": ["surge_xt"],
  "Ambient": ["surge_xt", "odin2"],
  "Techno": ["surge_xt", "helm"],
  "Experimental": ["dexed", "odin2"]
}
```

## Acceptance Criteria
1. Each plugin in `vst_inventory.json` has verified local path and checksum.
2. `vst_install_log.md` includes exact install steps and failures (if any).
3. `VST_INTEGRATION_NOTES.md` includes:
   - host strategy options for Tauri (external host / bridge / scanning)
   - known blockers and next actions
4. No proprietary binaries redistributed without license permission.

## Non-goals
- Full VST hosting implementation inside Pulse runtime.
- UI for preset browsing.

## Suggested Next-Step Hooks for Pulse
- Add plugin scanner endpoint in Tauri backend.
- Add "Preferred Synth Profile" selector per genre.
- Add ARP mode presets for Berlin School (slow step, long release, filter motion).
