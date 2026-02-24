export interface GenreResult {
  genre: string;
  confidence: number;
  suggestedVST: string[];
}

const BPM_RANGES = [
  { min: 0, max: 60, genres: { Ambient: 0.8, Drone: 0.7, Classical: 0.4 } },
  { min: 60, max: 80, genres: { Downtempo: 0.7, TripHop: 0.6, Ballad: 0.5 } },
  { min: 80, max: 100, genres: { RnB: 0.6, HipHop: 0.55, Soul: 0.5 } },
  { min: 100, max: 120, genres: { Pop: 0.7, Rock: 0.6, Indie: 0.5 } },
  { min: 120, max: 140, genres: { House: 0.75, Techno: 0.7, Trance: 0.6 } },
  { min: 140, max: 160, genres: { DrumNBass: 0.8, Dubstep: 0.65, Jungle: 0.6 } },
  { min: 160, max: 300, genres: { Hardcore: 0.7, Speedcore: 0.6, Gabber: 0.55 } },
];

const SCALE_TO_GENRE: Record<string, Record<string, number>> = {
  'Ionian (Major)': { Pop: 0.7, Rock: 0.6, Classical: 0.5, Folk: 0.5 },
  'Dorian': { Jazz: 0.8, Funk: 0.7, Rock: 0.6 },
  'Phrygian': { Metal: 0.75, Flamenco: 0.7, MiddleEastern: 0.65 },
  'Lydian': { Jazz: 0.8, FilmScores: 0.7, ProgressiveRock: 0.6 },
  'Mixolydian': { Blues: 0.7, Rock: 0.65, Country: 0.5, Funk: 0.6 },
  'Aeolian (Natural Minor)': { Rock: 0.7, Metal: 0.6, PopBallads: 0.5 },
  'Locrian': { Metal: 0.8, AvantGarde: 0.7, Experimental: 0.6 },
  'Major Pentatonic': { Rock: 0.7, Blues: 0.65, Country: 0.6, Folk: 0.55 },
  'Minor Pentatonic': { Blues: 0.85, Rock: 0.75, Metal: 0.6, HipHop: 0.5 },
  'Minor Blues': { Blues: 0.9, Rock: 0.7, Jazz: 0.5 },
  'Major Blues': { Blues: 0.8, Rockabilly: 0.7, Swing: 0.6 },
  'Harmonic Minor': { Metal: 0.7, Classical: 0.6, Flamenco: 0.55 },
  'Melodic Minor': { Jazz: 0.8, Fusion: 0.7, Classical: 0.5 },
  'Hungarian Minor': { Gypsy: 0.7, Folk: 0.6, Metal: 0.55 },
  'Whole Tone': { Jazz: 0.7, Impressionism: 0.8, FilmScores: 0.65 },
  'Diminished': { Jazz: 0.7, Metal: 0.6, HorrorScores: 0.65 },
  'Combination Diminished': { Jazz: 0.7, Blues: 0.5, Fusion: 0.6 },
  'Chromatic': { AvantGarde: 0.9, Experimental: 0.85, Atonal: 0.8 },
  'Raga Bhairav': { IndianClassical: 0.8, World: 0.6 },
  'Arabic': { MiddleEastern: 0.8, World: 0.6 },
  'Spanish': { Flamenco: 0.7, Latin: 0.6, Metal: 0.5 },
  'Gypsy': { Gypsy: 0.7, Folk: 0.6, Metal: 0.5 },
  'Egyptian': { MiddleEastern: 0.7, Ambient: 0.6 },
  'Hawaiian': { TraditionalHawaiian: 0.8, Folk: 0.5 },
  'Pelog': { Indonesian: 0.7, World: 0.6, Ambient: 0.5 },
  'Japanese (In Sen)': { TraditionalJapanese: 0.7, Ambient: 0.6, Metal: 0.4 },
  'Chinese': { TraditionalChinese: 0.7, Folk: 0.5, HipHop: 0.4 },
};

const SCALE_TO_VST: Record<string, string[]> = {
  'Ionian (Major)': ['Surge XT', 'Helm', 'Dexed'],
  'Dorian': ['Surge XT', 'Dexed', 'Helm'],
  'Phrygian': ['Yoshimi', 'Surge XT', 'Cardinal'],
  'Lydian': ['Surge XT', 'Dexed', 'Cardinal'],
  'Mixolydian': ['Helm', 'Surge XT', 'Dexed'],
  'Aeolian (Natural Minor)': ['Surge XT', 'Helm', 'Yoshimi'],
  'Locrian': ['Surge XT', 'Cardinal', 'Yoshimi'],
  'Major Pentatonic': ['Helm', 'Surge XT', 'Dexed'],
  'Minor Pentatonic': ['Helm', 'Surge XT', 'Dexed'],
  'Minor Blues': ['Helm', 'Surge XT', 'Dexed'],
  'Major Blues': ['Helm', 'Dexed', 'Surge XT'],
  'Harmonic Minor': ['Surge XT', 'Yoshimi', 'Cardinal'],
  'Melodic Minor': ['Surge XT', 'Dexed', 'Yoshimi'],
  'Hungarian Minor': ['Yoshimi', 'Surge XT', 'Cardinal'],
  'Whole Tone': ['Surge XT', 'Cardinal', 'Yoshimi'],
  'Diminished': ['Cardinal', 'Surge XT', 'Dexed'],
  'Chromatic': ['Cardinal', 'Surge XT', 'Yoshimi'],
  'Spanish': ['Yoshimi', 'Surge XT', 'Helm'],
  'Arabic': ['Yoshimi', 'Surge XT', 'Cardinal'],
  'Egyptian': ['Yoshimi', 'Surge XT', 'Dexed'],
};

function getBpmGenreScore(bpm: number): { genre: string; score: number } {
  let bestGenre = 'Unknown';
  let bestScore = 0;
  
  for (const range of BPM_RANGES) {
    if (bpm >= range.min && bpm <= range.max) {
      for (const [genre, score] of Object.entries(range.genres)) {
        if (score > bestScore) {
          bestScore = score;
          bestGenre = genre;
        }
      }
    }
  }
  
  return { genre: bestGenre, score: bestScore };
}

function getScaleGenreScore(scaleName: string): { genre: string; score: number } {
  const genreMap = SCALE_TO_GENRE[scaleName];
  if (!genreMap) return { genre: 'Unknown', score: 0 };
  
  let bestGenre = 'Unknown';
  let bestScore = 0;
  
  for (const [genre, score] of Object.entries(genreMap)) {
    if (score > bestScore) {
      bestScore = score;
      bestGenre = genre;
    }
  }
  
  return { genre: bestGenre, score: bestScore };
}

export function detectGenre(bpm: number, scaleName: string): GenreResult {
  const bpmResult = getBpmGenreScore(bpm);
  const scaleResult = getScaleGenreScore(scaleName);
  
  const bpmWeight = 0.6;
  const scaleWeight = 0.4;
  
  let bestGenre = bpmResult.genre;
  let bestScore = bpmResult.score * bpmWeight;
  
  if (scaleResult.score > 0) {
    const combinedScore = (bpmResult.score * bpmWeight) + (scaleResult.score * scaleWeight);
    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      bestGenre = bpmResult.score >= scaleResult.score ? bpmResult.genre : scaleResult.genre;
    }
  }
  
  const suggestedVST = SCALE_TO_VST[scaleName] || ['Surge XT', 'Helm', 'Dexed'];
  
  return {
    genre: bestGenre,
    confidence: Math.min(bestScore, 1),
    suggestedVST
  };
}

export function getGenreFromScale(scaleName: string): string[] {
  const genreMap = SCALE_TO_GENRE[scaleName];
  if (!genreMap) return ['Pop', 'Rock', 'Jazz'];
  return Object.entries(genreMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);
}

export function getVSTForScale(scaleName: string): string[] {
  return SCALE_TO_VST[scaleName] || ['Surge XT', 'Helm', 'Dexed'];
}
