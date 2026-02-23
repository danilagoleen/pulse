import { getKeyFromChromagram, NOTE_NAMES } from '../music/theory';
import { CircularAudioBuffer } from './CircularAudioBuffer';

export class KeyDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private buffer: CircularAudioBuffer | null = null;
  private chromagram: number[] = new Array(12).fill(0);
  private stableKey: string = '8B';
  private frameCount: number = 0;
  private readonly STABLE_FRAMES = 2;
  private readonly MIN_FREQ = 60;
  private readonly MAX_FREQ = 2000;
  private readonly RMS_THRESHOLD = 0.01;
  private readonly CHROMA_SMOOTHING = 0.9;
  private readonly BUFFER_SECONDS = 10;

  public async start(onKeyDetected: (note: string, key: string, allNotes: string[], score: number) => void): Promise<void> {
    if (this.isRunning) return;

    try {
      console.log("[KeyDetector] Requesting microphone...");
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[KeyDetector] Microphone obtained");

      this.audioContext = new AudioContext();
      console.log("[KeyDetector] AudioContext created, state:", this.audioContext.state);
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log("[KeyDetector] AudioContext resumed");
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
      console.log(`[KeyDetector] Starting detect loop... (buffer: ${this.BUFFER_SECONDS}s)`);
      this.detectLoop(onKeyDetected);
    } catch (error) {
      console.error("[KeyDetector] Error:", error);
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
    console.log("[KeyDetector] Stopped");
  }

  private detectLoop(onKeyDetected: (note: string, key: string, allNotes: string[], score: number) => void): void {
    if (!this.isRunning || !this.analyser || !this.buffer) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(timeData);
    
    this.buffer.pushArray(timeData);

    const rms = this.calculateRMS(timeData);
    
    if (rms > this.RMS_THRESHOLD) {
      this.updateChromagram();
      
      const { key, score } = getKeyFromChromagram(this.chromagram);
      
      const activeNotes = this.getActiveNotes();
      
      console.log("[KeyDetector] RMS:", rms.toFixed(4), "Notes:", activeNotes.join(','), "→ Key:", key, "score:", score.toFixed(1));

      if (key === this.stableKey) {
        this.frameCount++;
      } else {
        this.frameCount = 0;
        this.stableKey = key;
      }
      
      if (this.frameCount >= this.STABLE_FRAMES && score > 30) {
        const dominantNote = this.getDominantNote();
        console.log("[KeyDetector] STABLE KEY:", key, "note:", dominantNote, "score:", score.toFixed(1));
        onKeyDetected(dominantNote, key, activeNotes, Math.round(score / 10));
        this.frameCount = this.STABLE_FRAMES + 1;
      }
    }

    if (this.isRunning) {
      setTimeout(() => this.detectLoop(onKeyDetected), 80);
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
    }
    
    for (let i = 0; i < 12; i++) {
      this.chromagram[i] = this.chromagram[i] * this.CHROMA_SMOOTHING + newChroma[i] * (1 - this.CHROMA_SMOOTHING);
    }
  }

  private getActiveNotes(): string[] {
    const notes: string[] = [];
    const threshold = Math.max(...this.chromagram) * 0.3;
    
    for (let i = 0; i < 12; i++) {
      if (this.chromagram[i] > threshold) {
        notes.push(NOTE_NAMES[i]);
      }
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
}
