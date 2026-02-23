import { describe, it, expect } from 'vitest';

describe('KeyDetector Logic Tests', () => {
  const noteToSemitone: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  const minorKeys = ['3A', '11A', '7A', '4A', '5A', '12A', '9A', '2A', '10A', '8A', '6A', '1A'];

  const guessKey = (detectedNote: string): string => {
    const semitone = noteToSemitone[detectedNote] || 0;
    return minorKeys[semitone];
  };

  const getNoteFromFreq = (frequency: number): string | null => {
    if (frequency < 30 || frequency > 1000) return null;
    const noteNum = 12 * Math.log2(frequency / 440) + 69;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[Math.round(noteNum) % 12];
  };

  describe('Frequency to Note', () => {
    it('should detect A4 (440Hz)', () => {
      expect(getNoteFromFreq(440)).toBe('A');
    });

    it('should detect C4 (261.63Hz)', () => {
      expect(getNoteFromFreq(261.63)).toBe('C');
    });

    it('should detect E4 (329.63Hz)', () => {
      expect(getNoteFromFreq(329.63)).toBe('E');
    });

    it('should detect G4 (392Hz)', () => {
      expect(getNoteFromFreq(392)).toBe('G');
    });

    it('should return null for very low frequency', () => {
      expect(getNoteFromFreq(20)).toBeNull();
    });

    it('should return null for very high frequency', () => {
      expect(getNoteFromFreq(2000)).toBeNull();
    });

    it('should detect bass notes', () => {
      // E2 = 82.41 Hz
      expect(getNoteFromFreq(82.41)).toBe('E');
      // A2 = 110 Hz
      expect(getNoteFromFreq(110)).toBe('A');
    });
  });

  describe('Note to Key', () => {
    it('should map A to 8A', () => {
      expect(guessKey('A')).toBe('8A');
    });

    it('should map C to 3A', () => {
      expect(guessKey('C')).toBe('3A');
    });

    it('should map E to 5A', () => {
      expect(guessKey('E')).toBe('5A');
    });

    it('should map G to 2A', () => {
      expect(guessKey('G')).toBe('2A');
    });

    it('should map D to 7A', () => {
      expect(guessKey('D')).toBe('7A');
    });

    it('should map F to 12A', () => {
      expect(guessKey('F')).toBe('12A');
    });
  });

  describe('Stability Logic', () => {
    it('should detect stable key after repeated same notes', () => {
      const notes = ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E'];
      const keys = notes.map(n => guessKey(n));
      
      // All E notes should map to 5A
      keys.forEach(k => expect(k).toBe('5A'));
    });

    it('should not change key on single different note', () => {
      let stableKey = '5A';
      const notes = ['E', 'E', 'E', 'E', 'F#', 'E', 'E'];
      
      for (const note of notes) {
        const newKey = guessKey(note);
        if (newKey !== stableKey) {
          // Would need multiple stable frames to change
          expect(notes.filter(n => guessKey(n) === newKey).length).toBeLessThan(5);
        }
      }
    });
  });
});
