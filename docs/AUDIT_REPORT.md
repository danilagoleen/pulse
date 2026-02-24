# Pulse — АУДИТ ДОКУМЕНТАЦИИ И РЕАЛИЗАЦИИ

**Date:** 2026-02-24  
**Status:** RECON COMPLETE → WAITING FOR GO

---

## MARKER_AUDIT_001: ЧТО СДЕЛАНО (IMPLEMENTED)

### Core Features ✅
| Фича | Файл | Статус |
|------|------|--------|
| Tauri + React + TypeScript | src-tauri/ | ✅ |
| MediaPipe Hand Tracking | src/vision/HandTracker.ts | ✅ |
| WebAudio Synth Engine | src/audio/SynthEngine.ts | ✅ |
| BPM Detection | src/audio/BPMDetector.ts | ✅ |
| Key Detection | src/audio/KeyDetector.ts | ✅ |
| Scale Refinement | src/music/scales_db.ts:refineToMinimal() | ✅ |
| 34 Scales Database | src/music/scales_db.ts | ✅ |
| Scale Quantizer | src/music/theory.ts:quantizeToScale() | ✅ |
| Unified Wheel UI | src/components/UnifiedWheel.tsx | ✅ |
| Camelot Matrix | src/music/theory.ts:CAMELOT_MATRIX | ✅ |
| Left/Right Hand Mapping | src/App.tsx | ✅ |

---

## MARKER_AUDIT_002: ИССЛЕДОВАТЕЛЬСКИЕ ДОКУМЕНТЫ

### GROK Research ✅
| Документ | Содержание | Статус |
|----------|------------|--------|
| `grok_bigd2_scale_pulse.md` | 34+ scale formulas, KORG Electribe, math | ✅ |
| `grok-extr1_research_pulse.md` | Open source libraries (Essentia, Aubio, Librosa) | ✅ |
| `Матрица Scale=Genre=VST_GROK.txt` | Матрица: шкала → жанр → VST | ✅ |

### KIMI Research ✅
| Документ | Содержание | Статус |
|----------|------------|--------|
| `KIMI_K2_UNIFIED.md` | Unified Architecture: Trigger → Downbeat → Key → Predict | ✅ |

### CSV Data ✅
| Файл | Содержание |
|------|------------|
| `scale-genge-numbers.csv` | Vertices, colors, genres для 34 шкал |
| `genre_geometry.csv` | Геометрическая визуализация жанров |
| `genre.csv` | Список жанров |

---

## MARKER_AUDIT_003: ГЭПЫ (ЧТО НЕ РЕАЛИЗОВАНО)

### HIGH PRIORITY (Следующие шаги)

| # | Гэп | Источник исследования | Формула/Данные |
|---|-----|---------------------|----------------|
| 1 | **ARP Engine** | GROK research + KIMI K2 | Паттерны: up, down, ping-pong, random |
| 2 | **Auto ARP Type** | Нужно исследовать | По нотам (2-3 ноты = chord arp, 4+ = run) |
| 3 | **Genre Detection** | GROK Matrix | BPM + Scale → Genre (120 BPM + Minor = Metal) |
| 4 | **Scale→Genre→VST** | GROK Matrix | JSON матрица из документа |
| 5 | **Smooth VST Crossfade** | Нужно исследовать | Формула: crossfade 2-4 секунды |
| 6 | **BPM Pulse Light** | KIMI K2 | Импульс в центре колеса по downbeat |

### MEDIUM PRIORITY

| # | Гэп | Описание |
|---|-----|---------|
| 7 | Piano Roll | Визуализация нот (легато/арп маркеры) |
| 8 | Color Key Filter | Цвет как фильтр для видео |
| 9 | Sound Wave Visualizer | Живая звуковая волна |
| 10 | MIDI Recording | Запись MIDI-дорожек |
| 11 | Loop Engine | Лупер с наложением |
| 12 | Multitrack | Несколько дорожек |

### LOW PRIORITY

| # | Гэп |
|---|-----|
| 13 | FX Chain (reverb, delay, chorus, phaser) |
| 14 | MIDI Controllers поддержка |
| 15 | Mac Touchpad управление |
| 16 | Audio Input (MIDI/Line) |
| 17 | VETKA Nodal Modulations |

---

## MARKER_AUDIT_004: КАКИЕ ИССЛЕДОВАНИЯ НУЖНЫ

### Исследование 1: ARP PATTERNS
**Вопрос для GROK:**
- Какие существуют паттерны арпеджио?
- Как автоматически выбрать паттерн по входным данным (кол-во нот, интервалы)?
- Формулы для WebAudio/Tone.js реализации

### Исследование 2: GENRE DETECTION
**Вопрос для GROK:**
- Какой алгоритм определения жанра по BPM + Scale?
- Таблица: BPM ranges → Genre, Scale → Genre
- Формула confidence для жанра

### Исследование 3: OPEN SOURCE SYNTH LIBRARIES
**Вопрос для GROK:**
- Бесплатные JS/WebAudio синтезаторы с хорошим звучанием
- Tone.js vs WebAudio native
- Как подключить VST в Tauri/WebAudio

### Исследование 4: SMOOTH CROSSFADE
**Вопрос для GROK:**
- Формула плавного переключения инструментов
- Как VETKA интегрирует модуляции по двум рукам

---

## MARKER_AUDIT_005: ПЛАН РАЗВИТИЯ

### Sprint 1: ARP + Genre (HIGH)
1. Реализовать ARP Engine (up/down/ping-pong)
2. Auto ARP Type по входным нотам
3. Genre Detection по BPM + Scale
4. Подключить Scale→Genre→VST матрицу
5. BPM Pulse Light в центре колеса

### Sprint 2: Visualization (MEDIUM)
1. Piano Roll визуализация
2. Sound Wave Visualizer

### Sprint 3: Recording (MEDIUM)
1. MIDI Recording
2. Loop Engine

### Sprint 4: Expansion (LOW)
1. FX Chain
2. MIDI Controllers
3. VETKA Nodal Modulations

---

## MARKER_AUDIT_006: ЗАПРОСЫ К GROK

### Запрос 1: ARP Patterns
```
GROK, исследуй:
1. Полный список паттернов арпеджио (up, down, up-down, random, etc)
2. Как автоматически выбирать паттерн по входным данным:
   - 2 ноты = chord
   - 3+ ноты = arp run
   - интервалы (малые = strum, большие = spread)
3. Формулы для WebAudio/Tone.js реализации
```

### Запрос 2: Genre Detection Algorithm
```
GROK, исследуй:
1. Алгоритм определения жанра по BPM + Scale
2. Таблица: 
   - BPM 60-80 = Ambient, Ballad
   - BPM 80-100 = R&B, Hip-Hop
   - BPM 100-120 = Pop, Rock
   - BPM 120-140 = House, Techno
   - BPM 140-160 = Drum & Bass, Dubstep
   - BPM 160+ = Hardcore, Death Metal
3. Scale → Genre:
   - Minor Pentatonic = Blues, Rock
   - Phrygian = Metal, Flamenco
   - Dorian = Jazz, Funk
4. Формула confidence score
```

### Запрос 3: Open Source Synth Libraries
```
GROK, исследуй:
1. Бесплатные JS синтезаторы (Tone.js, Mo.js, etc)
2. Как подключить VST в Tauri/WebAudio
3. Примеры кода для synth с crossfade
```

---

## CONCLUSION

**Сделано:** Core audio pipeline, hand tracking, scale detection, 34 scales, Camelot wheel, quantizer

**Гэпы:** ARP, Genre Detection, VST selection, visualization, recording

**Следующий шаг:** Получить ответы от GROK по ARP, Genre Detection, Synth Libraries → затем IMPL
