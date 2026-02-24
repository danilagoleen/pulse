import { getKeyFromChromagram, NOTE_NAMES } from '../music/theory';
import { CircularAudioBuffer } from './CircularAudioBuffer';

export interface AudioEngineCallbacks {
  onBPM?: (bpm: number, beatPhase: number, confidence: number) => void;
  onKey?: (note: string, key: string, allNotes: string[], score: number) => void;
}

export class SmartAudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffer: CircularAudioBuffer | null = null;
  private isRunning: boolean = false;
  private callbacks: AudioEngineCallbacks = {};
  
  private chromagram: number[] = new Array(12).fill(0);
  private stableKey: string = '8B';
  private frameCount: number = 0;
  private readonly STABLE_FRAMES = 3;
  private readonly MIN_FREQ = 60;
  private readonly MAX_FREQ = 2000;
  private readonly RMS_THRESHOLD = 0.002;
  private readonly CHROMA_SMOOTHING = 0.95;
  private readonly BUFFER_SECONDS = 10;
  
  private readonly MIN_BPM = 60;
  private readonly MAX_BPM = 180;
  private readonly HISTORY_SIZE = 50;
  private onsetTimes: number[] = [];
  public lastBPM: number = 120;
  public _confidence: number = 0;
  private readonly ENERGY_THRESHOLD = 0.008;
  private readonly ONSET_COOLDOWN = 100;

  private keyHistory: string[] = [];
  private readonly KEY_HISTORY_SIZE = 5;

  public async start(callbacks: AudioEngineCallbacks): Promise<void> {
    if (this.isRunning) return;

    this.callbacks = callbacks;

    try {
      console.log("[SmartAudioEngine] Requesting microphone...");
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[SmartAudioEngine] Microphone obtained");

      this.audioContext = new AudioContext();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.6;
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      this.buffer = new CircularAudioBuffer(this.BUFFER_SECONDS, this.audioContext.sampleRate);
      
      this.isRunning = true;
      this.stableKey = '8B';
      this.frameCount = 0;
      this.chromagram = new Array(12).fill(0);
      this.onsetTimes = [];
      this.lastBPM = 120;
      this._confidence = 0;
      
      console.log("[SmartAudioEngine] Starting unified loop...");
      this.detectLoop();
    } catch (error) {
      console.error("[SmartAudioEngine] Error:", error);
    }
  }

  public stop(): void {
    this.isRunning = false;
    
    if (this.buffer) {
      this.buffer.clear();
      this.buffer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log("[SmartAudioEngine] Stopped");
  }

  private detectLoop(): void {
    if (!this.isRunning || !this.analyser || !this.buffer) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(timeData);
    
    this.buffer.pushArray(timeData);

    const rms = this.calculateRMS(timeData);
    const energy = this.calculateEnergy(timeData);
    const now = performance.now();
    
    if (energy > this.ENERGY_THRESHOLD) {
      const timeSinceLastOnset = now - (this.onsetTimes[this.onsetTimes.length - 1] || 0);
      
      if (timeSinceLastOnset > this.ONSET_COOLDOWN) {
        this.onsetTimes.push(now);
        
        if (this.onsetTimes.length > this.HISTORY_SIZE) {
          this.onsetTimes.shift();
        }
        
        if (this.onsetTimes.length >= 4) {
          const { bpm, confidence } = this.calculateBPM();
          this.lastBPM = bpm;
          this._confidence = confidence;
          
          const beatPhase = this.getBeatPhase(now, bpm);
          
          if (this.callbacks.onBPM) {
            this.callbacks.onBPM(bpm, beatPhase, confidence);
          }
        }
      }
    }
    
    if (rms > this.RMS_THRESHOLD) {
      this.updateChromagram();
      
      const { key, score } = getKeyFromChromagram(this.chromagram);
      const activeNotes = this.getActiveNotes();

      if (key === this.stableKey) {
        this.frameCount++;
      } else {
        this.frameCount = 0;
        this.stableKey = key;
      }

      this.keyHistory.push(key);
      if (this.keyHistory.length > this.KEY_HISTORY_SIZE) {
        this.keyHistory.shift();
      }

      const confirmedKey = this.getMostFrequentKey();
      
      if (this.frameCount >= this.STABLE_FRAMES && score > 15 && confirmedKey) {
        const dominantNote = this.getDominantNote();
        
        if (this.callbacks.onKey) {
          this.callbacks.onKey(dominantNote, confirmedKey, activeNotes, Math.round(score / 10));
        }
        this.frameCount = this.STABLE_FRAMES + 1;
      }
    }

    if (this.isRunning) {
      setTimeout(() => this.detectLoop(), 20);
    }
  }

  private updateChromagram(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const binSize = sampleRate / this.analyser.fftSize;
    
    const newChroma = new Array(12).fill(0);
    
    for (let bin = 0; bin < bufferLength; bin++) {
      const freq = bin * binSize;
      
      if (freq < this.MIN_FREQ || freq > this.MAX_FREQ) continue;
      if (frequencyData[bin] < 50) continue;
      
      const midi = 12 * Math.log2(freq / 440) + 69;
      const noteNum = Math.round(midi) % 12;
      const amplitude = frequencyData[bin] / 255;
      
      newChroma[noteNum] += amplitude;
      
      const harmonic1 = Math.round(12 * Math.log2(freq * 2 / 440) + 69) % 12;
      newChroma[harmonic1] += amplitude * 0.5;
      
      const harmonic2 = Math.round(12 * Math.log2(freq * 3 / 440) + 69) % 12;
      newChroma[harmonic2] += amplitude * 0.25;

      const harmonic4 = Math.round(12 * Math.log2(freq * 4 / 440) + 69) % 12;
      newChroma[harmonic4] += amplitude * 0.15;

      const harmonic5 = Math.round(12 * Math.log2(freq * 5 / 440) + 69) % 12;
      newChroma[harmonic5] += amplitude * 0.1;
    }
    
    for (let i = 0; i < 12; i++) {
      this.chromagram[i] = this.chromagram[i] * this.CHROMA_SMOOTHING + newChroma[i] * (1 - this.CHROMA_SMOOTHING);
    }
  }

  private getActiveNotes(): string[] {
    const notes: string[] = [];
    const threshold = Math.max(...this.chromagram) * 0.5;
    const maxNotes = 5;
    
    for (let i = 0; i < 12; i++) {
      if (this.chromagram[i] > threshold) {
        notes.push(NOTE_NAMES[i]);
      }
    }
    
    // Limit to top N notes by amplitude
    if (notes.length > maxNotes) {
      const noteAmplitudes = notes.map(n => ({
        note: n,
        amp: this.chromagram[NOTE_NAMES.indexOf(n)]
      }));
      noteAmplitudes.sort((a, b) => b.amp - a.amp);
      return noteAmplitudes.slice(0, maxNotes).map(n => n.note);
    }
    
    return notes;
  }

  private getDominantNote(): string {
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < 12; i++) {
      if (this.chromagram[i] > maxValue) {
        maxValue = this.chromagram[i];
        maxIndex = i;
      }
    }
    
    return NOTE_NAMES[maxIndex];
  }

  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private calculateEnergy(buffer: Float32Array): number {
    return this.calculateRMS(buffer);
  }

  private calculateBPM(): { bpm: number; confidence: number } {
    if (this.onsetTimes.length < 4) {
      return { bpm: 120, confidence: 0 };
    }

    const intervals: number[] = [];
    for (let i = 1; i < this.onsetTimes.length; i++) {
      intervals.push(this.onsetTimes[i] - this.onsetTimes[i - 1]);
    }

    const medianInterval = this.median(intervals);
    let bpm = 60000 / medianInterval;

    while (bpm < this.MIN_BPM) bpm *= 2;
    while (bpm > this.MAX_BPM) bpm /= 2;

    const avgDeviation = intervals.reduce((sum, i) => sum + Math.abs(i - medianInterval), 0) / intervals.length;
    const confidence = Math.max(0, 1 - (avgDeviation / medianInterval));

    return { bpm: Math.round(bpm), confidence };
  }

  private getBeatPhase(currentTime: number, bpm: number): number {
    if (this.onsetTimes.length < 2) return 0;
    
    const msPerBeat = 60000 / bpm;
    const lastOnset = this.onsetTimes[this.onsetTimes.length - 1];
    const timeSinceLastOnset = currentTime - lastOnset;
    
    return (timeSinceLastOnset % msPerBeat) / msPerBeat;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private getMostFrequentKey(): string | null {
    if (this.keyHistory.length < 3) return this.keyHistory[this.keyHistory.length - 1] || null;
    
    const counts: Record<string, number> = {};
    for (const key of this.keyHistory) {
      counts[key] = (counts[key] || 0) + 1;
    }
    
    let maxCount = 0;
    let mostFrequent = this.keyHistory[0];
    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = key;
      }
    }
    
    return mostFrequent;
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}
