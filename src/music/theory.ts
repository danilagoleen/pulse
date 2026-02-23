// Music Theory with Tonal.js integration
import { Scale, Note } from 'tonal';

// Camelot Wheel Notes (A = Minor, B = Major)
export const CAMELOT_WHEEL: Record<string, number[]> = {
  // Minor scales
  '1A': [60, 62, 63, 65, 67, 68, 70],       // A Minor
  '2A': [61, 63, 64, 66, 68, 69, 71],       // B Minor
  '3A': [62, 64, 65, 67, 69, 70, 72],       // C Minor
  '4A': [63, 65, 66, 68, 70, 71, 73],       // D Minor
  '5A': [64, 66, 67, 69, 71, 72, 74],       // E Minor
  '6A': [65, 67, 68, 70, 72, 73, 75],       // F Minor
  '7A': [66, 68, 69, 71, 73, 74, 76],       // G Minor
  '8A': [60, 62, 63, 65, 67, 68, 70],       // A Minor (octave)
  '9A': [68, 70, 71, 73, 75, 76, 78],       // B Minor
  '10A': [69, 71, 72, 74, 76, 77, 79],      // C Minor
  '11A': [70, 72, 73, 75, 77, 78, 80],      // D Minor
  '12A': [71, 73, 74, 76, 78, 79, 81],      // E Minor

  // Major scales
  '1B': [60, 62, 64, 65, 67, 69, 71],       // C Major
  '2B': [61, 63, 65, 66, 68, 70, 72],       // D Major
  '3B': [62, 64, 66, 67, 69, 71, 73],       // E Major
  '4B': [63, 65, 67, 68, 70, 72, 74],       // F Major
  '5B': [64, 66, 68, 69, 71, 73, 75],       // G Major
  '6B': [65, 67, 69, 70, 72, 74, 76],       // A Major
  '7B': [66, 68, 70, 71, 73, 75, 77],       // B Major
  '8B': [60, 62, 64, 65, 67, 69, 71],       // C Major (octave)
  '9B': [68, 70, 72, 73, 75, 77, 79],      // D Major
  '10B': [69, 71, 73, 74, 76, 78, 80],     // E Major
  '11B': [70, 72, 74, 75, 77, 79, 81],     // F Major
  '12B': [71, 73, 75, 76, 78, 80, 82],     // G Major
};

export const CAMELOT_KEYS = Object.keys(CAMELOT_WHEEL);

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

export function frequencyToNoteName(frequency: number): string | null {
  if (frequency < 20 || frequency > 5000) return null;
  const noteNum = 12 * Math.log2(frequency / 440) + 69;
  const midi = Math.round(noteNum);
  return NOTE_NAMES[midi % 12];
}

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
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

export const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
export const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

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
