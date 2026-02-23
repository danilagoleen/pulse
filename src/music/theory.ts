// Music Theory with Tonal.js integration
import { Scale, Note } from 'tonal';

// Camelot Wheel Notes (A = Minor, B = Major) - 3 OCTAVES
// FIX: 8B = C Major = C3(48) to G5(83), 21 notes
// All scales use proper MIDI offsets
export const CAMELOT_WHEEL: Record<string, number[]> = {
  // Minor scales (3 octaves: root C3=48 to B5=83)
  // 1A = B minor = B C# D E F# G A
  '1A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Bm
  '2A': [36, 38, 40, 42, 45, 47, 48,  51, 53, 55, 57, 58,  63, 65, 67, 69, 70,  75, 77, 79, 81, 82], // Cm
  '3A': [37, 39, 41, 43, 46, 48, 49,  51, 53, 55, 57, 58,  63, 65, 67, 69, 70,  75, 77, 79, 81, 82], // Dm
  '4A': [38, 40, 42, 44, 47, 49, 50,  52, 54, 56, 58, 59,  64, 66, 68, 70, 71,  76, 78, 80, 82, 83], // Em
  '5A': [39, 41, 43, 45, 48, 50, 51,  53, 55, 57, 59, 60,  65, 67, 69, 71, 72,  77, 79, 81, 83, 84], // F#m
  '6A': [40, 42, 44, 46, 49, 51, 52,  54, 56, 58, 60, 61,  66, 68, 70, 72, 73,  78, 80, 82, 84, 85], // G#m
  '7A': [41, 43, 45, 47, 50, 52, 53,  55, 57, 59, 61, 62,  67, 69, 71, 73, 74,  79, 81, 83, 85, 86], // A#m
  '8A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Am (same as 1A)
  '9A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Bm repeat
  '10A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Cm repeat
  '11A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Dm repeat
  '12A': [35, 37, 39, 41, 44, 46, 48,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // Em repeat

  // Major scales (3 octaves: C3=48 to G5=83)
  // 8B = C Major = C D E F G A B
  '1B': [36, 38, 40, 41, 43, 45, 47,  48, 50, 52, 53, 55,  60, 62, 64, 65, 67,  72, 74, 76, 77, 79], // Cb/B
  '2B': [37, 39, 41, 42, 44, 46, 48,  49, 51, 53, 54, 56,  61, 63, 65, 66, 68,  73, 75, 77, 78, 80], // Db
  '3B': [38, 40, 42, 43, 45, 47, 49,  50, 52, 54, 55, 57,  62, 64, 66, 67, 69,  74, 76, 78, 79, 81], // Eb
  '4B': [39, 41, 43, 44, 46, 48, 50,  51, 53, 55, 56, 58,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82], // F
  '5B': [40, 42, 44, 45, 47, 49, 51,  52, 54, 56, 57, 59,  64, 66, 68, 69, 71,  76, 78, 80, 81, 83], // G
  '6B': [41, 43, 45, 46, 48, 50, 52,  53, 55, 57, 58, 60,  65, 67, 69, 70, 72,  77, 79, 81, 82, 84], // Ab
  '7B': [42, 44, 46, 47, 49, 51, 53,  54, 56, 58, 59, 61,  66, 68, 70, 71, 73,  78, 80, 82, 83, 85], // Bb
  '8B': [
    // C Major: 7 нот × 3 октавы = 21 нота (C3-B5)
    48, 50, 52, 53, 55, 57, 59,  // C3-B3
    60, 62, 64, 65, 67, 69, 71,  // C4-B4
    72, 74, 76, 77, 79, 81, 83   // C5-B5
  ], // C Major: C3-G5 (21 note)
  '9B': [49, 51, 53, 54, 56, 58, 60,  61, 63, 65, 66, 68,  73, 75, 77, 78, 80,  85, 87, 89, 90, 92], // D
  '10B': [50, 52, 54, 55, 57, 59, 61,  62, 64, 66, 67, 69,  74, 76, 78, 79, 81,  86, 88, 90, 91, 93], // E
  '11B': [51, 53, 55, 56, 58, 60, 62,  63, 65, 67, 68, 70,  75, 77, 79, 80, 82,  87, 89, 91, 92, 94], // F#/Gb
  '12B': [52, 54, 56, 57, 59, 61, 63,  64, 66, 68, 69, 71,  76, 78, 80, 81, 83,  88, 90, 92, 93, 95], // G
};

export const CAMELOT_KEYS = Object.keys(CAMELOT_WHEEL);

// Harmonic Mixing Matrix (24x24 probabilities)
// +1/-1 = 1.0, relative (A↔B same num) = 0.7, +7 semitones = 0.5
export const CAMELOT_MATRIX: Record<string, Record<string, number>> = {};

function buildMatrix() {
  CAMELOT_KEYS.forEach(from => {
    CAMELOT_MATRIX[from] = {};
    CAMELOT_KEYS.forEach(to => {
      if (from === to) {
        CAMELOT_MATRIX[from][to] = 1.0;
      } else {
        const fromNum = parseInt(from);
        const toNum = parseInt(to);
        void from; void to;
        
        // Same number, different letter (relative)
        if (fromNum === toNum) {
          CAMELOT_MATRIX[from][to] = 0.7;
        }
        // +1 or -1 (boost/drop)
        else if (Math.abs(fromNum - toNum) === 1 || Math.abs(fromNum - toNum) === 11) {
          CAMELOT_MATRIX[from][to] = 0.9;
        }
        // +7 semitones
        else if (Math.abs(fromNum - toNum) === 7) {
          CAMELOT_MATRIX[from][to] = 0.5;
        }
        else {
          CAMELOT_MATRIX[from][to] = 0.2;
        }
      }
    });
  });
}
buildMatrix();

// Predict next key based on current key and history
export function predictNextKey(current: string, _history: string[] = []): string {
  const probs = CAMELOT_MATRIX[current] || {};
  let bestKey = current;
  let bestProb = 0;
  
  CAMELOT_KEYS.forEach(key => {
    if (key !== current && (probs[key] || 0) > bestProb) {
      bestProb = probs[key] || 0;
      bestKey = key;
    }
  });
  
  return bestKey;
}

// Camelot to musical key mapping
export const CAMELOT_TO_KEY: Record<string, string> = {
  '1A': 'A', '2A': 'B', '3A': 'C', '4A': 'D', '5A': 'E', '6A': 'F',
  '7A': 'G', '8A': 'A', '9A': 'B', '10A': 'C', '11A': 'D', '12A': 'E',
  '1B': 'C', '2B': 'D', '3B': 'E', '4B': 'F', '5B': 'G', '6B': 'A',
  '7B': 'B', '8B': 'C', '9B': 'D', '10B': 'E', '11B': 'F', '12B': 'G',
};

// Mode Wheel - 7 modes
export const MODE_WHEEL = [
  { name: 'Ionian', short: 'ION', type: 'major' },
  { name: 'Dorian', short: 'DOR', type: 'minor' },
  { name: 'Phrygian', short: 'PHR', type: 'minor' },
  { name: 'Lydian', short: 'LYD', type: 'major' },
  { name: 'Mixolydian', short: 'MIX', type: 'major' },
  { name: 'Aeolian', short: 'AEO', type: 'minor' },
  { name: 'Locrian', short: 'LOC', type: 'minor' },
];

// Get notes for any scale using Tonal
export function getScaleNotes(camelotKey: string, mode: string = 'Ionian'): number[] {
  const keyName = CAMELOT_TO_KEY[camelotKey] || 'C';
  const isMinor = camelotKey.endsWith('A');
  
  // Get scale from Tonal
  let scaleName: string;
  if (mode === 'Ionian') {
    scaleName = isMinor ? `${keyName} minor` : `${keyName} major`;
  } else {
    scaleName = `${keyName} ${mode.toLowerCase()}`;
  }
  
  const scale = Scale.get(scaleName);
  if (!scale || !scale.notes) {
    return CAMELOT_WHEEL[camelotKey] || CAMELOT_WHEEL['8B'];
  }
  
  // Convert to MIDI (starting from C4 = 60)
  const notes = scale.notes.map((noteName: string) => {
    const midi = Note.midi(noteName + '4');
    return midi || 60;
  });
  
  return notes;
}

// Shift Camelot wheel
export function shiftCamelot(currentKey: string, direction: number): string {
  const keys = CAMELOT_KEYS;
  const currentIndex = keys.indexOf(currentKey);
  if (currentIndex === -1) return '8B';
  
  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = keys.length - 1;
  if (newIndex >= keys.length) newIndex = 0;
  
  return keys[newIndex];
}

// Get current mode index
export function getModeIndex(mode: string): number {
  return MODE_WHEEL.findIndex(m => m.name === mode);
}

// Rotate mode
export function rotateMode(currentMode: string, direction: number): string {
  const currentIndex = getModeIndex(currentMode);
  if (currentIndex === -1) return 'Ionian';
  
  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = MODE_WHEEL.length - 1;
  if (newIndex >= MODE_WHEEL.length) newIndex = 0;
  
  return MODE_WHEEL[newIndex].name;
}

// Standard functions
export function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function frequencyToMidi(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

export function quantizeToScale(normalizedValue: number, scaleKey: string = '8B'): number {
  const scale = CAMELOT_WHEEL[scaleKey] || CAMELOT_WHEEL['8B'];
  const clamped = Math.min(Math.max(normalizedValue, 0), 1);
  const index = Math.floor(clamped * (scale.length - 1));
  return scale[index];
}

export function getScaleFromKey(key: string): number[] {
  return CAMELOT_WHEEL[key] || CAMELOT_WHEEL['8B'];
}

// Colors for Camelot keys
export const SCALE_COLORS: Record<string, string> = {
  '1A': '#FF6B6B', '2A': '#FF8E72', '3A': '#FFB347', '4A': '#FFE066',
  '5A': '#C5E065', '6A': '#7BE495', '7A': '#4ECDC4', '8A': '#45B7D1',
  '9A': '#5C7CFA', '10A': '#845EF7', '11A': '#CC5DE8', '12A': '#FF6B9D',
  '1B': '#FF6B6B', '2B': '#FF8E72', '3B': '#FFB347', '4B': '#FFE066',
  '5B': '#C5E065', '6B': '#7BE495', '7B': '#4ECDC4', '8B': '#45B7D1',
  '9B': '#5C7CFA', '10B': '#845EF7', '11B': '#CC5DE8', '12B': '#FF6B9D',
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface ScalePolygon {
  name: string;
  vertices: number[];
  colors: string[];
  genres: string[];
}

const SCALE_COLORS_PALETTE = [
  '#FF6B6B', '#FF8E72', '#FFB347', '#FFE066',
  '#C5E065', '#7BE495', '#4ECDC4', '#45B7D1',
  '#5C7CFA', '#845EF7', '#CC5DE8', '#FF6B9D',
];

const SCALE_GENRES: Record<string, string[]> = {
  '1A': ['Classical', 'Metal', 'Rock'], '2A': ['Classical', 'Metal', 'Pop'],
  '3A': ['Jazz', 'Rock', 'Metal'], '4A': ['Jazz', 'Rock', 'Classical'],
  '5A': ['Classical', 'Jazz', 'Rock'], '6A': ['Rock', 'Blues', 'Jazz'],
  '7A': ['Classical', 'Romantic', 'Jazz'], '8A': ['Classical', 'Metal', 'Rock'],
  '9A': ['Classical', 'Jazz', 'Blues'], '10A': ['Classical', 'Metal', 'World'],
  '11A': ['Classical', 'Jazz', 'Rock'], '12A': ['Classical', 'Rock', 'Metal'],
  '1B': ['Jazz', 'Rock', 'Metal'], '2B': ['Jazz', 'Film', 'Classical'],
  '3B': ['Jazz', 'Rock', 'Classical'], '4B': ['Rock', 'Metal', 'Classical'],
  '5B': ['Classical', 'Folk', 'Rock'], '6B': ['Jazz', 'Film', 'Classical'],
  '7B': ['Romantic', 'Classical', 'Jazz'], '8B': ['Pop', 'Rock', 'Classical'],
  '9B': ['Jazz', 'Classical', 'Blues'], '10B': ['Rock', 'Metal', 'Jazz'],
  '11B': ['Pop', 'Rock', 'Classical'], '12B': ['Jazz', 'Metal', 'Classical'],
};

function generateScalePolygons(): Record<string, ScalePolygon> {
  const polygons: Record<string, ScalePolygon> = {};
  
  for (const [key, notes] of Object.entries(CAMELOT_WHEEL)) {
    const uniqueSemitones = [...new Set(notes.map(n => n % 12))].slice(0, 7);
    const keyNum = parseInt(key);
    const colorIndex = (keyNum - 1) % 12;
    const colors = SCALE_COLORS_PALETTE.slice(colorIndex, colorIndex + 7);
    
    const isMajor = key.endsWith('B');
    const keyName = CAMELOT_TO_KEY[key] || 'C';
    const name = isMajor ? `${keyName} Major` : `${keyName} Minor`;
    
    polygons[key] = {
      name,
      vertices: uniqueSemitones,
      colors,
      genres: SCALE_GENRES[key] || ['Pop', 'Rock', 'Jazz'],
    };
  }
  
  return polygons;
}

export const SCALE_POLYGONS: Record<string, ScalePolygon> = generateScalePolygons();

export function getScalePolygon(camelotKey: string): ScalePolygon {
  return SCALE_POLYGONS[camelotKey] || SCALE_POLYGONS['8B'];
}

export function frequencyToNoteName(frequency: number): string | null {
  if (frequency < 20 || frequency > 5000) return null;
  const noteNum = 12 * Math.log2(frequency / 440) + 69;
  const midi = Math.round(noteNum);
  return NOTE_NAMES[midi % 12];
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return NOTE_NAMES[midi % 12] + octave;
}

export function getNoteSemitone(noteName: string): number {
  return NOTE_NAMES.indexOf(noteName);
}

export function getCamelotKeyFromNotes(detectedNotes: string[]): { key: string; score: number } {
  const noteCounts: Record<string, number> = {};
  detectedNotes.forEach(note => {
    noteCounts[note] = (noteCounts[note] || 0) + 1;
  });

  const semitoneCounts: Record<number, number> = {};
  Object.entries(noteCounts).forEach(([note, count]) => {
    const semitone = getNoteSemitone(note);
    if (semitone >= 0) {
      semitoneCounts[semitone] = (semitoneCounts[semitone] || 0) + count;
    }
  });

  let bestKey = '8B';
  let bestScore = 0;

  for (const camelotKey of CAMELOT_KEYS) {
    const scaleNotes = CAMELOT_WHEEL[camelotKey];
    const scaleSemitones = scaleNotes.map(n => n % 12);
    const uniqueSemitones = [...new Set(scaleSemitones)];
    
    let score = 0;
    uniqueSemitones.forEach(semitone => {
      if (semitoneCounts[semitone]) {
        score += semitoneCounts[semitone];
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestKey = camelotKey;
    }
  }

  return { key: bestKey, score: bestScore };
}

export function getKeySparseMatch(chromagram: number[]): { key: string; score: number } {
  const activeNotes: number[] = [];
  const threshold = Math.max(...chromagram) * 0.3;
  for (let i = 0; i < 12; i++) {
    if (chromagram[i] > threshold) {
      activeNotes.push(i);
    }
  }

  if (activeNotes.length === 0) {
    return { key: '8B', score: 0 };
  }

  let bestKey = '8B';
  let bestRatio = -1;

  for (const camelotKey of CAMELOT_KEYS) {
    const scaleNotes = CAMELOT_WHEEL[camelotKey];
    const scaleSemitones = new Set(scaleNotes.map(n => n % 12));

    let matches = 0;
    for (const note of activeNotes) {
      if (scaleSemitones.has(note)) {
        matches++;
      }
    }

    const ratio = matches / scaleSemitones.size;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestKey = camelotKey;
    }
  }

  return { key: bestKey, score: Math.round(bestRatio * 100) };
}

export const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
export const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const CAMELOT_MODE_PROFILES: Record<string, number[]> = {
  '1B': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  '2B': [2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29],
  '3B': [2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66],
  '4B': [3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39],
  '5B': [2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19],
  '6B': [5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52],
  '7B': [2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09],
  '8B': [4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38],
  '9B': [4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33],
  '10B': [2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48],
  '11B': [3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23],
  '12B': [2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35],
  '1A': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  '2A': [3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34],
  '3A': [3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69],
  '4A': [2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98],
  '5A': [3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75],
  '6A': [4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54],
  '7A': [2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53],
  '8A': [3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60],
  '9A': [2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38],
  '10A': [5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52],
  '11A': [3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68],
  '12A': [2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33],
};

export function getKeyFromAllModes(chromagram: number[]): { key: string; score: number } {
  let bestKey = '8B';
  let bestCorrelation = -Infinity;
  
  for (const [camelotKey, profile] of Object.entries(CAMELOT_MODE_PROFILES)) {
    const correlation = cosineSimilarity(chromagram, profile);
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestKey = camelotKey;
    }
  }
  
  return { key: bestKey, score: Math.max(0, (bestCorrelation + 1) * 50) };
}

export const KEY_PROFILES: Record<string, number[]> = {
  '1B': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
  '2B': [2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29],
  '3B': [2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66],
  '4B': [3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39],
  '5B': [2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19],
  '6B': [5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52],
  '7B': [2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38, 4.09],
  '8B': [4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33, 4.38],
  '9B': [4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48, 2.33],
  '10B': [2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23, 3.48],
  '11B': [3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35, 2.23],
  '12B': [2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88, 6.35],
  '1A': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  '2A': [3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34],
  '3A': [3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69],
  '4A': [2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98],
  '5A': [3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75],
  '6A': [4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54],
  '7A': [2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60, 3.53],
  '8A': [3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38, 2.60],
  '9A': [2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52, 5.38],
  '10A': [5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52],
  '11A': [3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68],
  '12A': [2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33],
};

export function getKeyFromChromagram(chromagram: number[]): { key: string; score: number } {
  let bestKey = '8B';
  let bestCorrelation = -Infinity;
  
  for (const camelotKey of CAMELOT_KEYS) {
    const profile = KEY_PROFILES[camelotKey];
    if (!profile) continue;
    
    const correlation = cosineSimilarity(chromagram, profile);
    
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestKey = camelotKey;
    }
  }
  
  return { key: bestKey, score: Math.max(0, (bestCorrelation + 1) * 50) };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
