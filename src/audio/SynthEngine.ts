export class SynthEngine {
  private audioCtx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private vca: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private readonly minFrequency = 110;
  private readonly maxFrequency = 880;
  private isRunning: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    this.audioCtx = new AudioContext();
    
    this.vca = this.audioCtx.createGain();
    this.vca.gain.value = 0;

    this.filter = this.audioCtx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 5;

    this.reverb = this.audioCtx.createConvolver();
    await this.createReverbImpulse();

    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.2;

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.4;

    this.vca.connect(this.filter);
    this.filter.connect(this.reverb);
    this.filter.connect(this.compressor);
    this.reverb.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
  }

  private async createReverbImpulse() {
    if (!this.audioCtx || !this.reverb) return;
    
    const sampleRate = this.audioCtx.sampleRate;
    const length = sampleRate * 2;
    const impulse = this.audioCtx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    
    this.reverb.buffer = impulse;
  }

  private createOscillators() {
    if (!this.audioCtx || !this.vca) return;

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = this.minFrequency;

    const osc2 = this.audioCtx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = this.minFrequency * 1.01;

    const osc1Gain = this.audioCtx.createGain();
    osc1Gain.gain.value = 0.5;

    const osc2Gain = this.audioCtx.createGain();
    osc2Gain.gain.value = 0.3;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(this.vca);
    osc2Gain.connect(this.vca);

    osc1.start();
    osc2.start();

    this.oscillators = [osc1, osc2];
    this.isRunning = true;
  }

  private stopOscillators() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
    this.isRunning = false;
  }

  public start() {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    if (!this.isRunning) {
      this.createOscillators();
    }
  }

  public stop() {
    if (this.vca && this.audioCtx) {
      this.vca.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
    }
  }

  public setFrequency(normalizedY: number) {
    if (!this.audioCtx || !this.isRunning) return;

    const clampedY = Math.min(Math.max(normalizedY, 0), 1);
    const frequency = this.minFrequency + clampedY * (this.maxFrequency - this.minFrequency);

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.02);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setTargetAtTime(frequency * 1.01, this.audioCtx.currentTime, 0.02);
    }
  }

  public setFrequencyFromMidi(midiNote: number) {
    if (!this.audioCtx || !this.isRunning) return;
    
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.02);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setTargetAtTime(frequency * 1.01, this.audioCtx.currentTime, 0.02);
    }
  }

  public setVolume(normalizedVolume: number) {
    if (!this.audioCtx || !this.vca) return;

    const volume = Math.min(Math.max(normalizedVolume, 0), 1) * 0.5;
    this.vca.gain.setTargetAtTime(volume, this.audioCtx.currentTime, 0.02);
  }

  public setFilterCutoff(value: number) {
    if (this.filter && this.audioCtx) {
      const cutoff = 200 + value * 8000;
      this.filter.frequency.setTargetAtTime(cutoff, this.audioCtx.currentTime, 0.02);
    }
  }

  public triggerNote(frequency: number = 440) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    this.start();

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setValueAtTime(frequency * 1.01, this.audioCtx.currentTime);
    }

    this.setVolume(0.5);

    setTimeout(() => {
      this.setVolume(0);
    }, 2000); // 2 seconds for testing
  }

  public dispose() {
    this.stopOscillators();
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
