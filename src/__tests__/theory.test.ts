import { describe, it, expect } from 'vitest';
import { quantizeToScale, CAMELOT_KEYS, shiftCamelot, MODE_WHEEL, SCALE_COLORS } from '../music/theory';

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
      // 8B = C Major = [60, 62, 64, 65, 67, 69, 71]
      const note = quantizeToScale(0, '8B');
      expect(note).toBe(60); // First note (C4)
    });

    it('should quantize to middle of scale', () => {
      const note = quantizeToScale(0.5, '8B');
      expect(note).toBe(65); // F4
    });

    it('should quantize to end of scale', () => {
      const note = quantizeToScale(1, '8B');
      expect(note).toBe(71); // B4
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
});
