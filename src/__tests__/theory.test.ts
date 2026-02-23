import { describe, it, expect } from 'vitest';
import { quantizeToScale, CAMELOT_KEYS, shiftCamelot, MODE_WHEEL, SCALE_COLORS, midiToNoteName, midiToFrequency } from '../music/theory';

describe('Music Theory Tests', () => {
  describe('Camelot Wheel', () => {
    it('should have 24 keys', () => {
      expect(CAMELOT_KEYS.length).toBe(24);
    });

    it('should have all minor keys (1A-12A)', () => {
      const minors = CAMELOT_KEYS.filter(k => k.endsWith('A'));
      expect(minors.length).toBe(12);
    });

    it('should have all major keys (1B-12B)', () => {
      const majors = CAMELOT_KEYS.filter(k => k.endsWith('B'));
      expect(majors.length).toBe(12);
    });

    it('should quantize to scale correctly', () => {
      const note = quantizeToScale(0, '8B');
      expect(note).toBe(48); // C3
    });

    it('should quantize to end of scale', () => {
      const note = quantizeToScale(1, '8B');
      expect(note).toBe(83); // B5
    });

    it('should shift camelot forward', () => {
      const next = shiftCamelot('8B', 1);
      expect(next).toBe('9B');
    });

    it('should shift camelot backward', () => {
      const prev = shiftCamelot('8B', -1);
      expect(prev).toBe('7B');
    });

    it('should wrap around forward', () => {
      const next = shiftCamelot('12B', 1);
      expect(next).toBe('1A');
    });

    it('should wrap around backward', () => {
      const prev = shiftCamelot('1A', -1);
      expect(prev).toBe('12B');
    });
  });

  describe('Mode Wheel', () => {
    it('should have 7 modes', () => {
      expect(MODE_WHEEL.length).toBe(7);
    });

    it('should have Ionian first', () => {
      expect(MODE_WHEEL[0].name).toBe('Ionian');
    });

    it('should have Dorian second', () => {
      expect(MODE_WHEEL[1].name).toBe('Dorian');
    });

    it('should have all mode types', () => {
      const names = MODE_WHEEL.map(m => m.name);
      expect(names).toContain('Ionian');
      expect(names).toContain('Dorian');
      expect(names).toContain('Phrygian');
      expect(names).toContain('Lydian');
      expect(names).toContain('Mixolydian');
      expect(names).toContain('Aeolian');
      expect(names).toContain('Locrian');
    });
  });

  describe('Scale Colors', () => {
    it('should have colors for all keys', () => {
      for (const key of CAMELOT_KEYS) {
        expect(SCALE_COLORS[key]).toBeDefined();
      }
    });

    it('should have valid hex colors', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const key of CAMELOT_KEYS) {
        expect(SCALE_COLORS[key]).toMatch(hexRegex);
      }
    });
  });

  describe('Note Name Conversion', () => {
    it('should convert MIDI 60 to C4', () => {
      expect(midiToNoteName(60)).toBe('C4');
    });

    it('should convert MIDI 69 to A4 (440Hz)', () => {
      expect(midiToNoteName(69)).toBe('A4');
    });

    it('should convert MIDI 48 to C3', () => {
      expect(midiToNoteName(48)).toBe('C3');
    });

    it('should convert MIDI 72 to C5', () => {
      expect(midiToNoteName(72)).toBe('C5');
    });

    it('should handle all notes in octave', () => {
      expect(midiToNoteName(60)).toBe('C4');
      expect(midiToNoteName(61)).toBe('C#4');
      expect(midiToNoteName(62)).toBe('D4');
      expect(midiToNoteName(63)).toBe('D#4');
      expect(midiToNoteName(64)).toBe('E4');
      expect(midiToNoteName(65)).toBe('F4');
      expect(midiToNoteName(66)).toBe('F#4');
      expect(midiToNoteName(67)).toBe('G4');
      expect(midiToNoteName(68)).toBe('G#4');
      expect(midiToNoteName(69)).toBe('A4');
      expect(midiToNoteName(70)).toBe('A#4');
      expect(midiToNoteName(71)).toBe('B4');
    });

    it('should work with 3 octave range (C3-B5)', () => {
      expect(midiToNoteName(48)).toBe('C3');
      expect(midiToNoteName(57)).toBe('A3');
      expect(midiToNoteName(72)).toBe('C5');
      expect(midiToNoteName(83)).toBe('B5');
    });
  });

  describe('MIDI Frequency Conversion', () => {
    it('should convert MIDI 69 to 440Hz', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 1);
    });

    it('should convert MIDI 60 to ~261.63Hz (C4)', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });
  });
});
