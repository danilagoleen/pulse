export class BPMDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  
  private readonly MIN_BPM = 60;
  private readonly MAX_BPM = 180;
  private readonly HISTORY_SIZE = 100;
  private onsetTimes: number[] = [];
  private lastBPM: number = 120;
  private confidence: number = 0;

  private readonly ENERGY_THRESHOLD = 0.02;
  private readonly ONSET_COOLDOWN = 100;

  public async start(onBeat: (bpm: number, beat: number, confidence: number) => void): Promise<void> {
    if (this.isRunning) return;

    try {
      console.log("[BPMDetector] Requesting microphone...");
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[BPMDetector] Microphone obtained");

      this.audioContext = new AudioContext();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      this.isRunning = true;
      this.onsetTimes = [];
      this.lastBPM = 120;
      this.confidence = 0;
      
      console.log("[BPMDetector] Starting detect loop...");
      this.detectLoop(onBeat);
    } catch (error) {
      console.error("[BPMDetector] Error:", error);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log("[BPMDetector] Stopped");
  }

  private detectLoop(onBeat: (bpm: number, beat: number, confidence: number) => void): void {
    if (!this.isRunning || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const buffer = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(buffer);

    const energy = this.calculateEnergy(buffer);
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
          this.confidence = confidence;
          
          const beatPhase = this.getBeatPhase(now, bpm);
          
          console.log(`[BPMDetector] BPM: ${bpm.toFixed(0)}, confidence: ${(confidence * 100).toFixed(0)}%, beat: ${beatPhase.toFixed(2)}`);
          onBeat(bpm, beatPhase, confidence);
        }
      }
    }

    if (this.isRunning) {
      setTimeout(() => this.detectLoop(onBeat), 20);
    }
  }

  private calculateEnergy(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
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

  public getCurrentBPM(): number {
    return this.lastBPM;
  }

  public getConfidence(): number {
    return this.confidence;
  }
}
