# Pulse — ROADMAP v2.0 (Based on GROK Research)

**Last Updated:** 2026-02-24  
**Version:** 0.1.0 → 0.2.1

---

## ✅ DONE (v0.1.0)

| Feature | Status | Files |
|---------|--------|-------|
| Tauri + React + TypeScript | ✅ | src-tauri/ |
| MediaPipe Hand Tracking | ✅ | src/vision/HandTracker.ts |
| WebAudio Synth Engine | ✅ | src/audio/SynthEngine.ts |
| BPM Detection | ✅ | src/audio/BPMDetector.ts |
| Key Detection | ✅ | src/audio/KeyDetector.ts |
| Scale Refinement (RRF) | ✅ | src/music/scales_db.ts |
| 34 Scales Database | ✅ | src/music/scales_db.ts |
| Scale Quantizer | ✅ | src/music/theory.ts |
| Unified Wheel UI | ✅ | src/components/UnifiedWheel.tsx |
| Camelot Matrix | ✅ | src/music/theory.ts |
| Left/Right Hand Mapping | ✅ | src/App.tsx |

---

## 🚀 NEXT: v0.2.1 — ARP BALANCE + CAMELOT VISUAL CLARITY

### Priority 0: Audio/Visual Polish (Immediate)

| Feature | Status | Notes |
|---------|--------|-------|
| ARP loudness balancing vs lead synth | ✅ In code | Lower ARP output gain + softer level |
| BPM pulse in wheel center | ✅ In code | Pulse now scales with beat phase, not binary blink |
| Camelot inner key readability | ✅ In code | Added central inner key labels (A/B mode context) |
| Scale polygon visibility inside Camelot | ✅ In code | Stronger fill/stroke and vertex readability |

### Priority 0.1: Follow-up (next pass)
1. Add per-mode label ring (`A` and `B` simultaneously, not only active mode).
2. Add BPM pulse trail (decay animation over 1 beat).
3. Add ARP/synth A-B mixer in UI (user-controlled balance).

---

## 🚀 NEXT: v0.2.0 — ARP + GENRE DETECTION

### Priority 1: ARP Engine

#### 1.1 Base ARP Implementation
**Research Source:** GROK Response - ARP Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| `up` | Ascending (C → E → G → C) | Energy, bright |
| `down` | Descending (C → G → E → C) | Melancholy, atmosphere |
| `upDown` | Up then down (C → E → G → E → C) | Most popular, natural wave |
| `downUp` | Down then up | Groove, "bouncy" |
| `random` | Random order | Chaos, experimental |
| `randomOnce` | Random no repeat | Controlled chaos |
| `randomWalk` | ±1 note from current | Organic, "alive" |
| `ordered` | Linear scale pass | Modal/ethnic |
| `chord` | All notes together | Freeze harmony |

#### 1.2 Auto ARP Pattern Selection
**Algorithm (from GROK):**

| Condition | Pattern | Reason |
|-----------|---------|--------|
| 1 note | `ordered` / `up` | Single note - no point in random |
| 2 notes | `upDown` / `downUp` | Classic "groove" between two notes |
| 3-4 notes (triad, 7th) | `up` / `upDown` | Most natural |
| 5+ notes | `random` / `randomWalk` | Avoid boring linear |
| BPM > 140 | `random` / `randomOnce` | Fast arp sounds better chaotic |
| BPM < 90 | `upDown` / `chord` | Long notes = wave or block |
| Minor/Phrygian/Locrian | `down` / `randomWalk` | Dark scales suit descending |
| Major/Lydian/Ionian | `up` / `upDown` | Light scales suit ascending |

#### 1.3 Y-Axis Control
```ts
// Y = 0 (bottom) → Legato/slow
// Y = 0.3-0.7 → Normal ARP
// Y = 1 (top) → Fast ARP + humanize
if (yNorm > 0.7) {
  arp.rate = '32n';      // Fast
  arp.humanize = 0.12;
} else if (yNorm < 0.3) {
  arp.rate = '4n';       // Slow
  arp.pattern = 'chord';
} else {
  arp.rate = '16n';      // Normal
  arp.humanize = 0.08;
}
```

#### 1.4 Implementation Files
- `src/audio/Arpeggiator.ts` (existing, expand)
- `src/audio/ArpeggiatorManager.ts` (new)

---

### Priority 2: Genre Detection

#### 2.1 BPM + Scale → Genre Matrix
**Research Source:** GROK Response - Genre Detection

```ts
const genreMatrix = {
  bpmRanges: [
    { min: 0,   max: 60,  genres: { Ambient: 0.8, Drone: 0.7, Classical: 0.4 } },
    { min: 60,  max: 80,  genres: { Downtempo: 0.7, TripHop: 0.6, Ballad: 0.5 } },
    { min: 80,  max: 100, genres: { Rnb: 0.6, HipHop: 0.55, Soul: 0.5 } },
    { min: 100, max: 120, genres: { Pop: 0.7, Rock: 0.6, Indie: 0.5 } },
    { min: 120, max: 140, genres: { House: 0.75, Techno: 0.7, Trance: 0.6 } },
    { min: 140, max: 160, genres: { DrumNBass: 0.8, Dubstep: 0.65, Jungle: 0.6 } },
    { min: 160, max: 300, genres: { Hardcore: 0.7, Speedcore: 0.6, Gabber: 0.55 } },
  ],
  
  scaleToGenre: {
    'Major Pentatonic':     { Rock: 0.7, Pop: 0.65, Folk: 0.6, Country: 0.55 },
    'Minor Pentatonic':     { Blues: 0.85, Rock: 0.75, Metal: 0.6 },
    'Minor Blues':          { Blues: 0.9, Rock: 0.7, Jazz: 0.5 },
    'Dorian':               { Jazz: 0.8, Funk: 0.7, Rock: 0.6 },
    'Phrygian':             { Metal: 0.75, Flamenco: 0.7, MiddleEastern: 0.65 },
    'Locrian':              { Metal: 0.8, AvantGarde: 0.7, DarkAmbient: 0.6 },
    'Whole Tone':           { Impressionism: 0.8, FilmScore: 0.7, Ambient: 0.65 },
    'Chromatic':            { AvantGarde: 0.9, Experimental: 0.85, FreeJazz: 0.7 },
    // ... from scales_db.ts
  }
};
```

#### 2.2 Confidence Calculation
```ts
function detectGenre(bpm: number, scaleName: string): { genre: string, confidence: number } {
  let bestGenre = 'Unknown';
  let bestScore = 0;
  
  // BPM contribution (60%)
  const bpmScore = getBpmGenreScore(bpm); // from ranges
  
  // Scale contribution (40%)
  const scaleScore = getScaleGenreScore(scaleName); // from matrix
  
  const combined = bpmScore * 0.6 + scaleScore * 0.4;
  return { genre: bestGenre, confidence: Math.min(combined, 1) };
}
```

#### 2.3 Scale → Genre → VST Integration
**From GROK Matrix:**

| Scale | Genre | Recommended VST |
|-------|-------|-----------------|
| Ionian (Major) | Pop, Rock | Sylenth1, Omnisphere, Serum |
| Dorian | Jazz, Funk | Massive, Serum, Pigments |
| Phrygian | Metal, Flamenco | Omnisphere, Vital, Phase Plant |
| Lydian | Jazz, Film | Omnisphere, Pigments, Falcon |
| Mixolydian | Blues, Rock | Serum, Massive, Sylenth1 |
| Minor Pentatonic | Blues, Rock, Metal | Massive, Serum, Vital |
| Minor Blues | Blues, Jazz | Serum, Omnisphere, Pigments |

#### 2.4 Implementation Files
- `src/music/GenreDetector.ts` (new)
- `src/audio/GenreSynthSelector.ts` (new)
- Update `src/music/scales_db.ts` with VST recommendations

---

### Priority 3: BPM Pulse Light

**From KIMI K2 Architecture:**
- Visual pulse in center of Camelot wheel
- Triggers on downbeat (strong beat)
- Color matches detected scale
- Must include continuous beat-phase animation (not only on/off)

### Priority 4: Camelot Inner Geometry

1. Show inner Camelot key layer (central key labels) for harmonic context.
2. Keep scale polygon in the center as the active mode geometry.
3. Use polygon shape changes as primary visual of scale refinement.

---

## 📋 v0.3.0 — VISUALIZATION

| Feature | Description |
|---------|-------------|
| Piano Roll | Visualize played notes (legato/arp markers) |
| Color Key Filter | Color as video filter |
| Sound Wave Visualizer | Live waveform display |
| BPM Pulse Light | Visual beat sync in wheel center |

---

## 📋 v0.4.0 — RECORDING

| Feature | Description |
|---------|-------------|
| MIDI Recording | Record MIDI tracks |
| Loop Engine | Looper with overdub |
| Multitrack | Multiple tracks |

---

## 📋 v0.5.0 — EXPANSION

| Feature | Description |
|---------|-------------|
| FX Chain | Reverb, Delay, Chorus, Phaser |
| MIDI Controllers | External controller support |
| Mac Touchpad | Touchpad as hand tracking alternative |
| Audio Input | MIDI/Line input support |
| VETKA Nodal Modulations | Modulations via two-hand squares |

---

## 🛠️ TECHNICAL STACK

| Component | Technology |
|-----------|------------|
| Framework | Tauri v2 + React |
| Audio | Tone.js (ARP, Synth) |
| Hand Tracking | MediaPipe |
| Analysis | Chromagram, BPMDetector |
| Visualization | Canvas/WebGL |

---

## 🎯 IMPLEMENTATION ORDER

```
v0.2.0:
1. [NEW] ArpeggiatorManager.ts - Auto pattern selection
2. [NEW] GenreDetector.ts - BPM + Scale → Genre
3. [NEW] GenreSynthSelector.ts - VST recommendation
4. [UPDATE] SmartAudioEngine.ts - Add genre state
5. [UPDATE] App.tsx - Show genre + VST in UI
6. [NEW] BPM Pulse Light in UnifiedWheel

v0.2.1:
1. [UPDATE] Arpeggiator.ts - output gain balancing + safer loop lifecycle
2. [UPDATE] UnifiedWheel.tsx - continuous BPM pulse and stronger scale polygon
3. [UPDATE] UnifiedWheel.tsx - inner Camelot key labels for readable center
```

---

## 📚 RESEARCH SOURCES

- `grok_bigd2_scale_pulse.md` - 34+ scale formulas
- `grok-extr1_research_pulse.md` - Open source libraries
- `Матрица Scale=Genre=VST_GROK.txt` - VST recommendations
- `KIMI_K2_UNIFIED.md` - Architecture
- GROK Response 2026-02-24 - ARP Patterns, Genre Detection, VST
