import { describe, it, expect } from 'vitest';
import { quantizeToScale, CAMELOT_WHEEL, predictNextKey, CAMELOT_MATRIX, midiToNoteName } from '../music/theory';

describe('Calibration Tests - Key to Notes Mapping', () => {
  describe('8B = C Major (primary test scale)', () => {
    const scale = CAMELOT_WHEEL['8B'];
    
    it('should have 21 notes (3 octaves)', () => {
      expect(scale.length).toBe(21);
    });

    it('should start at C3 = 48', () => {
      expect(scale[0]).toBe(48);
      expect(midiToNoteName(scale[0])).toBe('C3');
    });

    it('X=0 should play C3 (root)', () => {
      expect(quantizeToScale(0, '8B')).toBe(48);
    });

    it('X=1 should play top note', () => {
      const topNote = quantizeToScale(1, '8B');
      expect(topNote).toBeGreaterThan(70);
    });
  });

  describe('Matrix Tests', () => {
    it('should have CAMELOT_MATRIX defined', () => {
      expect(CAMELOT_MATRIX).toBeDefined();
    });

    it('should predict from 8B to compatible key', () => {
      const predicted = predictNextKey('8B');
      // Any key from matrix is valid
      expect(CAMELOT_MATRIX['8B'][predicted]).toBeGreaterThan(0);
    });
  });

  describe('Note Names', () => {
    it('should convert MIDI to note names correctly', () => {
      expect(midiToNoteName(48)).toBe('C3');
      expect(midiToNoteName(60)).toBe('C4');
      expect(midiToNoteName(72)).toBe('C5');
    });
  });
});
