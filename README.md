# 🎹 Pulse — Periodic Table of Music

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-cyan?style=for-the-badge&logo=music" alt="Version">
  <img src="https://img.shields.io/badge/platform-macOS-cyan?style=for-the-badge&logo=apple" alt="Platform">
  <img src="https://img.shields.io/badge/framework-Tauri%20%2B%20React-blue?style=for-the-badge" alt="Framework">
  <img src="https://img.shields.io/github/license/danilagoleen/pulse?style=for-the-badge" alt="License">
</p>

<p align="center">
  <b>Музыкальная таблица Менделеева</b> — система управления звуком через жесты и AI-анализ.<br/>
  <b>Periodic Table for Sound</b> — gesture-controlled music synthesis with AI analysis.
</p>

---

## ✨ Уникальность / Uniqueness

**Pulse** — это симбиоз математики, цвета и музыки:

| Компонент | Описание |
|-----------|----------|
| 🎨 **Цвета Иттена** | 12 цветов спектра → 12 нот хроматической гаммы |
| 🎡 **Колесо Камелота** | 24 позиции (12 мажор + 12 минор) для гармонического движения |
| 📐 **Scale-геометрия** | 34+ масштаба от хроматики до пентатоники с вершинами и цветами |
| 🤖 **AI-анализ** | Определение BPM, тональности, автоматический подбор шкалы |
| 👋 **Hand Tracking** | MediaPipe — руками как на Theremin |

> *«Музыка — это математика, видимая ухом. Pulse делает её видимой глазам.»*

---

## ✅ Сделано / What's Done

### Core Features
- [x] **Tauri + React + TypeScript** — нативное macOS приложение
- [x] **MediaPipe Hand Tracking** — отслеживание рук в реальном времени
- [x] **WebAudio Synth Engine** — осцилляторы, ADSR, фильтры
- [x] **Smart Audio Analysis** — определение нот из микрофона
- [x] **BPM Detection** — анализ темпа в реальном времени
- [x] **Key Detection** — определение тональности (Krumhansl algorithm)
- [x] **Scale Refinement** — минимальная шкала (пентатоника > мажор > хроматика)
- [x] **34 Musical Scales** — база данных с интервалами, вершинами, цветами, жанрами
- [x] **Unified Wheel UI** — колесо Камелота + Itten colors + геометрия масштабов
- [x] **Left/Right Hand Mapping** — левая рука = ноты, правая = фильтр
- [x] **Real-time Scale Display** — показывает выбранную шкалу и ноты

### Technical
- [x] Ring buffer для аудио
- [x] Chromagram analysis
- [x] Harmonic detection
- [x] Smoothing filters для жестов

---

## 🚀 В планах / Roadmap

### Phase 1: ARP & Synthesis
- [ ] **Мягкий переход в ARP** — как в Kaos (плавное arpeggiate по двум нотам)
- [ ] **Матрица Scale → Genre → VST** — автовыбор синтезатора по жанру
- [ ] **BPM Impulse Light** — импульс света в центре Камелота

### Phase 2: Visualization
- [ ] **Piano Roll** — визуализация нот пользователя (легато/арп маркеры)
- [ ] **Color Key Filter** — цветовая клавиша как фильтр для видео с камеры
- [ ] **Sound Wave Visualizer** — живая звуковая волна

### Phase 3: Recording & Performance
- [ ] **MIDI Recording** — запись MIDI-дорожек
- [ ] **Loop Engine** — лупер с наложением
- [ ] **Multitrack** — несколько дорожек

### Phase 4: Expansion
- [ ] ** расширение базы FX** — эффекты: reverb, delay, chorus, phaser
- [ ] **MIDI Controllers** — поддержка внешних контроллеров
- [ ] **Mac Touchpad** — управление с тачпада как альтернатива камере
- [ ] **Audio Input** — импорт не только микрофона, но и MIDI/Line вход

### Phase 5: Advanced AI
- [ ] **VETKA Nodal Modulations** — модуляции по двум квадратам
- [ ] **AI DJ Mode** — автоматический подбор следующей тональности по Камелот-матрице

---

## 📁 Структура проекта / Project Structure

```
pulse/
├── src/
│   ├── audio/               # Audio engine
│   │   ├── SmartAudioEngine.ts   # BPM + Key detection
│   │   ├── SynthEngine.ts        # WebAudio synth
│   │   ├── Arpeggiator.ts         # ARP patterns
│   │   ├── KeyDetector.ts         # Key detection
│   │   ├── BPMDetector.ts         # Tempo analysis
│   │   └── CircularAudioBuffer.ts
│   ├── music/
│   │   ├── theory.ts         # Music theory utils
│   │   └── scales_db.ts     # 34 scales database
│   ├── vision/
│   │   └── HandTracker.ts    # MediaPipe integration
│   ├── components/
│   │   ├── UnifiedWheel.tsx    # Camelot + Itten + Geometry
│   │   ├── CamelotModeWheel.tsx
│   │   └── Header.tsx
│   └── App.tsx              # Main UI
├── docs/                   # Research & documentation
├── src-tauri/              # Rust backend
└── README.md
```

---

## 🧪 Технологии / Tech Stack

| Категория | Технология |
|-----------|------------|
| **Framework** | Tauri v2 (Rust) |
| **Frontend** | React 18 + TypeScript + Vite |
| **Hand Tracking** | MediaPipe Hands |
| **Audio** | WebAudio API |
| **Music Theory** | Custom algorithms + Chromagram |
| **Styling** | TailwindCSS |

---

## 👥 Команда / Contributors

- **BigPicle** — Architect, AI Integration, Development
- **Grok** — Research, Music Theory Analysis
- **Minimax 2.5** — AI Assistance
- **Kimi K2.5** — Research, Architecture Planning

---

## 📄 License

MIT License — подробности в файле [LICENSE](LICENSE)

---

## 🏃‍♂️ Запуск / Run

```bash
# Install dependencies
npm install

# Development
npm run tauri dev

# Build
npm run tauri build
```

---

## External Dependencies

### Required
- **Node.js 18+** — runtime
- **npm** — package manager
- **Rust** — for Tauri backend

### npm Packages
```bash
npm install
```

### Optional
- **MediaPipe** — for hand tracking (`@mediapipe/hands`, `@mediapipe/camera_utils`)
- **Tauri CLI** — for building (`npm install -D @tauri-apps/cli`)

### System Requirements
- macOS 11+ (tested on Intel and Apple Silicon)
- Webcam for hand tracking

### Quick Start
```bash
npm install
npm run tauri dev
```

---

<p align="center">
  <sub>Built with ❤️ by VETKA + BigPicle + Grok + Kimi + Minimax</sub>
</p>
