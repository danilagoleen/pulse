export interface ScaleDef {
  name: string;
  intervals: number[];
  vertices: number[];
  colors: string[];
  genres: string[];
}

export const SCALES_DB: ScaleDef[] = [
  {
    name: "Chromatic",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    vertices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    colors: ["#FF0000", "#FF4500", "#FF8800", "#FFD700", "#FFFF00", "#9ACD32", "#00FF00", "#00FA9A", "#0000FF", "#8A2BE2", "#EE82EE", "#FF00FF"],
    genres: ["Avant-Garde", "Experimental", "Atonal"]
  },
  {
    name: "Ionian (Major)",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    vertices: [0, 2, 4, 5, 7, 9, 11],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#9ACD32", "#00FA9A", "#8A2BE2", "#FF00FF"],
    genres: ["Pop", "Rock", "Classical", "Folk"]
  },
  {
    name: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    vertices: [0, 2, 3, 5, 7, 9, 10],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#9ACD32", "#00FA9A", "#8A2BE2", "#EE82EE"],
    genres: ["Jazz", "Rock", "Blues", "Funk"]
  },
  {
    name: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    vertices: [0, 1, 3, 5, 7, 8, 10],
    colors: ["#FF0000", "#FF4500", "#FFD700", "#9ACD32", "#00FA9A", "#4169E1", "#EE82EE"],
    genres: ["Metal", "Flamenco", "Middle Eastern"]
  },
  {
    name: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    vertices: [0, 2, 4, 6, 7, 9, 11],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#00FA9A", "#8A2BE2", "#FF00FF"],
    genres: ["Jazz", "Film Scores", "Progressive Rock"]
  },
  {
    name: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    vertices: [0, 2, 4, 5, 7, 9, 10],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#9ACD32", "#00FA9A", "#8A2BE2", "#EE82EE"],
    genres: ["Blues", "Rock", "Country", "Funk"]
  },
  {
    name: "Aeolian (Natural Minor)",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    vertices: [0, 2, 3, 5, 7, 8, 10],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#9ACD32", "#00FA9A", "#4169E1", "#EE82EE"],
    genres: ["Rock", "Metal", "Classical", "Pop Ballads"]
  },
  {
    name: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    vertices: [0, 1, 3, 5, 6, 8, 10],
    colors: ["#FF0000", "#FF4500", "#FFD700", "#9ACD32", "#008000", "#0000FF", "#EE82EE"],
    genres: ["Metal", "Avant-Garde", "Experimental"]
  },
  {
    name: "Harmonic Minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    vertices: [0, 2, 3, 5, 7, 8, 11],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#9ACD32", "#00FA9A", "#4169E1", "#FF00FF"],
    genres: ["Metal", "Classical", "Flamenco", "Middle Eastern"]
  },
  {
    name: "Melodic Minor",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    vertices: [0, 2, 3, 5, 7, 9, 11],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#9ACD32", "#00FA9A", "#8A2BE2", "#FF00FF"],
    genres: ["Jazz", "Fusion", "Classical"]
  },
  {
    name: "Major Blues",
    intervals: [0, 2, 3, 4, 7, 9],
    vertices: [0, 2, 3, 4, 7, 9],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#FFFF00", "#00FA9A", "#8A2BE2"],
    genres: ["Blues", "Rockabilly", "Swing"]
  },
  {
    name: "Minor Blues",
    intervals: [0, 3, 5, 6, 7, 10],
    vertices: [0, 3, 5, 6, 7, 10],
    colors: ["#FF0000", "#FFD700", "#9ACD32", "#008000", "#00FA9A", "#EE82EE"],
    genres: ["Blues", "Jazz", "Rock"]
  },
  {
    name: "Diminished",
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    vertices: [0, 2, 3, 5, 6, 8, 9, 11],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#9ACD32", "#008000", "#4169E1", "#8A2BE2", "#FF00FF"],
    genres: ["Jazz", "Metal", "Horror Scores"]
  },
  {
    name: "Combination Diminished",
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    vertices: [0, 1, 3, 4, 6, 7, 9, 10],
    colors: ["#FF0000", "#FF4500", "#FFD700", "#FFFF00", "#008000", "#00FA9A", "#8A2BE2", "#EE82EE"],
    genres: ["Jazz", "Blues", "Fusion"]
  },
  {
    name: "Major Pentatonic",
    intervals: [0, 2, 4, 7, 9],
    vertices: [0, 2, 4, 7, 9],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#00FA9A", "#8A2BE2"],
    genres: ["Rock", "Blues", "Country", "Folk"]
  },
  {
    name: "Minor Pentatonic",
    intervals: [0, 3, 5, 7, 10],
    vertices: [0, 3, 5, 7, 10],
    colors: ["#FF0000", "#FFD700", "#9ACD32", "#00FA9A", "#EE82EE"],
    genres: ["Blues", "Rock", "Metal", "Hip-Hop"]
  },
  {
    name: "Raga Bhairav",
    intervals: [0, 1, 4, 5, 7, 8, 11],
    vertices: [0, 1, 4, 5, 7, 8, 11],
    colors: ["#FF0000", "#FF4500", "#FFFF00", "#9ACD32", "#00FA9A", "#4169E1", "#FF00FF"],
    genres: ["Indian Classical", "World"]
  },
  {
    name: "Arabic",
    intervals: [0, 2, 4, 5, 6, 8, 10],
    vertices: [0, 2, 4, 5, 6, 8, 10],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#9ACD32", "#008000", "#4169E1", "#EE82EE"],
    genres: ["Middle Eastern", "World"]
  },
  {
    name: "Spanish",
    intervals: [0, 1, 3, 4, 5, 7, 8, 10],
    vertices: [0, 1, 3, 4, 5, 7, 8, 10],
    colors: ["#FF0000", "#FF4500", "#FFD700", "#FFFF00", "#9ACD32", "#00FA9A", "#4169E1", "#EE82EE"],
    genres: ["Flamenco", "Latin", "Metal"]
  },
  {
    name: "Gypsy",
    intervals: [0, 2, 3, 6, 7, 8, 11],
    vertices: [0, 2, 3, 6, 7, 8, 11],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#008000", "#00FA9A", "#4169E1", "#FF00FF"],
    genres: ["Gypsy", "Folk", "Metal"]
  },
  {
    name: "Egyptian",
    intervals: [0, 2, 5, 7, 10],
    vertices: [0, 2, 5, 7, 10],
    colors: ["#FF0000", "#FFA500", "#9ACD32", "#00FA9A", "#EE82EE"],
    genres: ["Middle Eastern", "Ambient"]
  },
  {
    name: "Hawaiian",
    intervals: [0, 2, 3, 7, 9],
    vertices: [0, 2, 3, 7, 9],
    colors: ["#FF0000", "#FFA500", "#FFD700", "#00FA9A", "#8A2BE2"],
    genres: ["Traditional Hawaiian", "Slack-Key", "Jawaiian", "Folk"]
  },
  {
    name: "Pelog",
    intervals: [0, 1, 3, 7, 8],
    vertices: [0, 1, 3, 7, 8],
    colors: ["#FF0000", "#FF4500", "#FFD700", "#00FA9A", "#4169E1"],
    genres: ["Indonesian", "World", "Ambient"]
  },
  {
    name: "Japanese (In Sen)",
    intervals: [0, 1, 5, 7, 8],
    vertices: [0, 1, 5, 7, 8],
    colors: ["#FF0000", "#FF4500", "#9ACD32", "#00FA9A", "#4169E1"],
    genres: ["Traditional Japanese", "Folk", "Ambient", "Metal/Jazz Fusion"]
  },
  {
    name: "Ryuku",
    intervals: [0, 4, 5, 7, 11],
    vertices: [0, 4, 5, 7, 11],
    colors: ["#FF0000", "#FFFF00", "#9ACD32", "#00FA9A", "#FF00FF"],
    genres: ["Okinawan Folk", "Ryukyuan Classical", "Island Reggae/Pop", "Ambient"]
  },
  {
    name: "Chinese",
    intervals: [0, 4, 6, 7, 11],
    vertices: [0, 4, 6, 7, 11],
    colors: ["#FF0000", "#FFFF00", "#008000", "#00FA9A", "#FF00FF"],
    genres: ["Traditional Chinese", "Folk/Opera", "C-pop", "Hip-Hop"]
  },
  {
    name: "Bass Line",
    intervals: [0, 7, 10],
    vertices: [0, 7, 10],
    colors: ["#FF0000", "#00FA9A", "#EE82EE"],
    genres: ["Blues", "Funk", "Rock", "Reggae"]
  },
  {
    name: "Whole Tone",
    intervals: [0, 2, 4, 6, 8, 10],
    vertices: [0, 2, 4, 6, 8, 10],
    colors: ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF", "#EE82EE"],
    genres: ["Jazz", "Impressionism", "Film Scores"]
  },
  {
    name: "Minor 3rd",
    intervals: [0, 3, 6, 9],
    vertices: [0, 3, 6, 9],
    colors: ["#FF0000", "#FFD700", "#008000", "#8A2BE2"],
    genres: ["Jazz", "Metal", "Blues", "Horror/Film Scores"]
  },
  {
    name: "Major 3rd",
    intervals: [0, 4, 8],
    vertices: [0, 4, 8],
    colors: ["#FF0000", "#FFFF00", "#0000FF"],
    genres: ["Jazz", "Fusion", "Progressive Rock", "Classical"]
  },
  {
    name: "4th Interval",
    intervals: [0, 5, 10],
    vertices: [0, 5, 10],
    colors: ["#FF0000", "#9ACD32", "#EE82EE"],
    genres: ["Modern Jazz", "Folk", "Classical", "Rock"]
  },
  {
    name: "5th Interval",
    intervals: [0, 7],
    vertices: [0, 7],
    colors: ["#FF0000", "#00FA9A"],
    genres: ["Rock", "Metal", "Blues", "Folk"]
  },
  {
    name: "Octave",
    intervals: [0],
    vertices: [0],
    colors: ["#FF0000"],
    genres: ["Electronic", "Minimalism", "Ragtime", "Rock/Jazz"]
  }
];

export function getScaleDef(name: string): ScaleDef {
  return SCALES_DB.find(s => s.name.toLowerCase().includes(name.toLowerCase()) || s.name === name) || SCALES_DB[1];
}

export function getScaleByIndex(index: number): ScaleDef {
  return SCALES_DB[index] || SCALES_DB[0];
}

// Camelot to Scale mapping (basic)
export const CAMELOT_TO_SCALE: Record<string, string> = {
  '8B': 'Ionian (Major)', '9B': 'Ionian (Major)', '10B': 'Ionian (Major)',
  '1B': 'Ionian', '2B': 'Mixolydian', '3B': 'Mixolydian',
  '4B': 'Lydian', '5B': 'Lydian', '6B': 'Ionian',
  '7B': 'Mixolydian',
  '8A': 'Aeolian (Natural Minor)', '9A': 'Aeolian', '10A': 'Aeolian',
  '1A': 'Locrian', '2A': 'Locrian', '3A': 'Phrygian',
  '4A': 'Phrygian', '5A': 'Dorian', '6A': 'Dorian', '7A': 'Dorian',
};

// RRF (Relative Ratio Feature) - filter notes by scale intervals
export function matchNotesToScale(detectedSemitones: number[], scaleIntervals: number[]): number {
  let best = 0;
  for (let root = 0; root < 12; root++) {
    const scaleSet = new Set(scaleIntervals.map((interval) => (interval + root) % 12));
    let matches = 0;
    for (const note of detectedSemitones) {
      if (scaleSet.has(note % 12)) matches++;
    }
    best = Math.max(best, matches / Math.max(detectedSemitones.length, 1));
  }
  return best;
}

// Refine scale toward fewer notes (pentatonic preferred)
export function refineToMinimal(detectedIntervals: number[]): ScaleDef {
  if (!detectedIntervals || detectedIntervals.length === 0) {
    return SCALES_DB[1]; // Default to Ionian
  }
  
  const scores: { scale: ScaleDef; score: number }[] = [];
  
  for (const scale of SCALES_DB) {
    try {
      const rrf = matchNotesToScale(detectedIntervals, scale.intervals);
      const sizeBonus = 12 - scale.intervals.length; // fewer notes = higher bonus
      const totalScore = rrf * 10 + sizeBonus * 0.5;
      scores.push({ scale, score: totalScore });
    } catch (e) {
      // Skip problematic scales
      continue;
    }
  }
  
  if (scores.length === 0) return SCALES_DB[1];
  
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.scale || SCALES_DB[1];
}
