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

function getGenericPenalty(scaleName: string, uniqueCount: number): number {
  const n = scaleName.toLowerCase();
  if (n.includes('chromatic')) {
    return uniqueCount >= 10 ? -0.08 : -0.32;
  }
  if (n.includes('ionian') || n.includes('major')) return -0.09;
  if (n.includes('aeolian') || n.includes('natural minor')) return -0.05;
  return 0;
}

function getNicheBonus(scale: ScaleDef): number {
  const n = scale.name.toLowerCase();
  const exoticKeywords = [
    'raga', 'arabic', 'egyptian', 'gypsy', 'japanese', 'pelog', 'ryuku', 'chinese', 'spanish', 'hawaiian'
  ];
  const hasExoticName = exoticKeywords.some((k) => n.includes(k));
  const uncommonSizeBonus = scale.intervals.length !== 7 ? 0.02 : 0;
  const explicitNicheBonus = hasExoticName ? 0.06 : 0;
  const pentatonicBonus = n.includes('pentatonic') ? 0.03 : 0;
  const wholeToneBonus = n.includes('whole tone') ? 0.02 : 0;
  return uncommonSizeBonus + explicitNicheBonus + pentatonicBonus + wholeToneBonus;
}

export class ScaleLearner {
  private noteHistory: NoteEntry[] = [];
  private readonly MAX_HISTORY = 140; // Keep longer phrase context
  private readonly WINDOW_MS = 20000; // 20 second phrase window
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
    const uniqueNotes = this.getUniqueSemitones();
    const bestRoot = this.findBestRoot(uniqueNotes, scaleIntervals);
    const shifted = scaleIntervals.map((i) => (i + bestRoot) % 12);
    const histogram = this.getIntervalHistogram();
    let matches = 0;
    let total = 0;
    
    for (const [interval, count] of histogram) {
      if (shifted.includes(interval)) {
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
      const bestRoot = this.findBestRoot(uniqueNotes, scale.intervals);
      const shiftedIntervals = scale.intervals.map((interval) => (interval + bestRoot) % 12);

      // Direct note matching
      const noteMatches = uniqueNotes.filter(n => 
        shiftedIntervals.includes(n)
      ).length;
      const noteScore = noteMatches / uniqueNotes.length;
      const scaleCoverage = noteMatches / Math.max(shiftedIntervals.length, 1);
      
      // Interval matching (how well intervals match)
      const intervalScore = this.matchIntervals(scale.intervals);
      
      // Prefer fewer notes (pentatonic > major > chromatic)
      const sizePenalty = scale.intervals.length / 12;
      const genericPenalty = getGenericPenalty(scale.name, uniqueNotes.length);
      const nicheBonus = getNicheBonus(scale);
      
      // Combined score: note match + interval match - size penalty
      const baseConfidence = (noteScore * 0.48 + intervalScore * 0.27 + scaleCoverage * 0.25) * (1 - sizePenalty * 0.2);
      const confidence = Math.min(1, Math.max(0, baseConfidence + genericPenalty + nicheBonus));
      
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

  private findBestRoot(uniqueNotes: number[], scaleIntervals: number[]): number {
    let bestRoot = 0;
    let bestMatches = -1;

    for (let root = 0; root < 12; root++) {
      const shifted = new Set(scaleIntervals.map((interval) => (interval + root) % 12));
      let matches = 0;
      for (const note of uniqueNotes) {
        if (shifted.has(note % 12)) matches++;
      }
      if (matches > bestMatches) {
        bestMatches = matches;
        bestRoot = root;
      }
    }

    return bestRoot;
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
    let bestMatches = 0;
    for (let root = 0; root < 12; root++) {
      const shifted = scale.intervals.map((interval) => (interval + root) % 12);
      const matches = semitones.filter((n) => shifted.includes(n % 12)).length;
      bestMatches = Math.max(bestMatches, matches);
    }
    const matches = bestMatches;
    const rrf = matches / Math.max(semitones.length, 1);
    const sizeBonus = (12 - scale.intervals.length) * 0.5;
    const genericPenalty = getGenericPenalty(scale.name, semitones.length) * 10;
    const nicheBonus = getNicheBonus(scale) * 10;
    scores.push({ scale, score: rrf * 10 + sizeBonus + nicheBonus + genericPenalty });
  }
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.scale || SCALES_DB[1];
}

export const scaleLearner = new ScaleLearner();
