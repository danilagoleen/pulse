// Scale Learning System - accumulates note patterns over time
// Based on: more notes played = better scale detection confidence

import { SCALES_DB, ScaleDef } from './scales_db';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface NoteEntry {
  semitone: number;
  timestamp: number;
}

interface ScaleHypothesis {
  scale: ScaleDef;
  matchCount: number;
  totalNotes: number;
  confidence: number;
}

export class ScaleLearner {
  private noteHistory: NoteEntry[] = [];
  private readonly MAX_HISTORY = 50; // Keep last 50 notes
  private readonly WINDOW_MS = 10000; // 10 second window
  private currentHypothesis: ScaleHypothesis | null = null;
  
  addNote(noteName: string) {
    const semitone = NOTE_NAMES.indexOf(noteName);
    if (semitone < 0) return;
    
    this.noteHistory.push({
      semitone,
      timestamp: Date.now()
    });
    
    // Prune old notes
    const cutoff = Date.now() - this.WINDOW_MS;
    this.noteHistory = this.noteHistory.filter(n => n.timestamp > cutoff);
    
    // Keep max history
    if (this.noteHistory.length > this.MAX_HISTORY) {
      this.noteHistory = this.noteHistory.slice(-this.MAX_HISTORY);
    }
  }
  
  getRecentSemitones(): number[] {
    return this.noteHistory.map(n => n.semitone);
  }
  
  // Get unique semitones (note classes)
  getUniqueSemitones(): number[] {
    const unique = new Set(this.noteHistory.map(n => n.semitone));
    return Array.from(unique);
  }
  
  // Calculate interval histogram - most common intervals = main scale
  getIntervalHistogram(): Map<number, number> {
    const histogram = new Map<number, number>();
    
    for (let i = 0; i < this.noteHistory.length; i++) {
      for (let j = i + 1; j < this.noteHistory.length; j++) {
        const interval = (this.noteHistory[j].semitone - this.noteHistory[i].semitone + 12) % 12;
        histogram.set(interval, (histogram.get(interval) || 0) + 1);
      }
    }
    
    return histogram;
  }
  
  // Match intervals to scale intervals
  matchIntervals(scaleIntervals: number[]): number {
    const histogram = this.getIntervalHistogram();
    let matches = 0;
    let total = 0;
    
    for (const [interval, count] of histogram) {
      if (scaleIntervals.includes(interval)) {
        matches += count;
      }
      total += count;
    }
    
    return total > 0 ? matches / total : 0;
  }
  
  // Learn scale from accumulated notes
  learnScale(): ScaleHypothesis | null {
    const uniqueNotes = this.getUniqueSemitones();
    
    if (uniqueNotes.length < 2) {
      return null;
    }
    
    const hypotheses: ScaleHypothesis[] = [];
    
    // Test each scale
    for (const scale of SCALES_DB) {
      // Direct note matching
      const noteMatches = uniqueNotes.filter(n => 
        scale.intervals.includes(n)
      ).length;
      const noteScore = noteMatches / uniqueNotes.length;
      
      // Interval matching (how well intervals match)
      const intervalScore = this.matchIntervals(scale.intervals);
      
      // Prefer fewer notes (pentatonic > major > chromatic)
      const sizePenalty = scale.intervals.length / 12;
      
      // Combined score: note match + interval match - size penalty
      const confidence = (noteScore * 0.5 + intervalScore * 0.5) * (1 - sizePenalty * 0.2);
      
      hypotheses.push({
        scale,
        matchCount: noteMatches,
        totalNotes: uniqueNotes.length,
        confidence: Math.min(confidence, 1)
      });
    }
    
    // Sort by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);
    
    this.currentHypothesis = hypotheses[0] || null;
    return this.currentHypothesis;
  }
  
  // Get current best scale with confidence
  getCurrentScale(): { scale: ScaleDef | null; confidence: number; noteCount: number } {
    if (!this.currentHypothesis) {
      const unique = this.getUniqueSemitones();
      if (unique.length === 0) {
        return { scale: null, confidence: 0, noteCount: 0 };
      }
      // Initial: use simple refine
      const refined = refineToMinimalSimple(unique);
      return { scale: refined, confidence: 0.3, noteCount: unique.length };
    }
    
    // Confidence grows with more notes
    const noteMultiplier = Math.min(this.currentHypothesis.totalNotes / 10, 1);
    const scaledConfidence = this.currentHypothesis.confidence * (0.5 + noteMultiplier * 0.5);
    
    return {
      scale: this.currentHypothesis.scale,
      confidence: scaledConfidence,
      noteCount: this.currentHypothesis.totalNotes
    };
  }
  
  // Force reset
  reset() {
    this.noteHistory = [];
    this.currentHypothesis = null;
  }
  
  // Get learning status
  getStatus() {
    return {
      noteCount: this.noteHistory.length,
      uniqueNotes: this.getUniqueSemitones().length,
      currentScale: this.currentHypothesis?.scale?.name || null,
      confidence: this.currentHypothesis?.confidence || 0
    };
  }
}

// Simple refine for initial detection
function refineToMinimalSimple(semitones: number[]): ScaleDef {
  if (!semitones || semitones.length === 0) {
    return SCALES_DB[1]; // Ionian default
  }
  
  const scores: { scale: ScaleDef; score: number }[] = [];
  
  for (const scale of SCALES_DB) {
    const matches = semitones.filter(n => scale.intervals.includes(n)).length;
    const rrf = matches / Math.max(semitones.length, 1);
    const sizeBonus = (12 - scale.intervals.length) * 0.5;
    scores.push({ scale, score: rrf * 10 + sizeBonus });
  }
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.scale || SCALES_DB[1];
}

export const scaleLearner = new ScaleLearner();
