export class SynthEngine {
  private static readonly PRESETS = [
    {
      id: 'theremin_classic',
      name: 'Theremin Classic',
      osc1Type: 'sawtooth' as OscillatorType,
      osc2Type: 'square' as OscillatorType,
      osc1Level: 0.5,
      osc2Level: 0.3,
      detuneRatio: 1.01,
      filterHz: 2200,
      filterQ: 5,
      master: 0.4,
    },
    {
      id: 'moog_bass',
      name: 'Moog Bass',
      osc1Type: 'sawtooth' as OscillatorType,
      osc2Type: 'sawtooth' as OscillatorType,
      osc1Level: 0.62,
      osc2Level: 0.48,
      detuneRatio: 1.006,
      filterHz: 980,
      filterQ: 8,
      master: 0.46,
    },
    {
      id: 'korg_pad',
      name: 'Korg Pad',
      osc1Type: 'triangle' as OscillatorType,
      osc2Type: 'sawtooth' as OscillatorType,
      osc1Level: 0.54,
      osc2Level: 0.32,
      detuneRatio: 1.015,
      filterHz: 2800,
      filterQ: 2.6,
      master: 0.42,
    },
    {
      id: 'berlin_seq',
      name: 'Berlin Sequence',
      osc1Type: 'square' as OscillatorType,
      osc2Type: 'sawtooth' as OscillatorType,
      osc1Level: 0.58,
      osc2Level: 0.4,
      detuneRatio: 1.02,
      filterHz: 1600,
      filterQ: 6.8,
      master: 0.45,
    },
    {
      id: 'digital_fmish',
      name: 'Digital FM-ish',
      osc1Type: 'triangle' as OscillatorType,
      osc2Type: 'square' as OscillatorType,
      osc1Level: 0.46,
      osc2Level: 0.52,
      detuneRatio: 1.027,
      filterHz: 3100,
      filterQ: 4.5,
      master: 0.4,
    },
    {
      id: 'dark_drone',
      name: 'Dark Drone',
      osc1Type: 'sawtooth' as OscillatorType,
      osc2Type: 'triangle' as OscillatorType,
      osc1Level: 0.64,
      osc2Level: 0.38,
      detuneRatio: 1.003,
      filterHz: 620,
      filterQ: 10,
      master: 0.47,
    },
  ];

  private audioCtx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private filter: BiquadFilterNode | null = null;
  private reverb: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private vca: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private readonly minFrequency = 110;
  private readonly maxFrequency = 880;
  private isRunning = false;

  private envelopeAttack = 0.22;
  private envelopeDecay = 0.18;
  private envelopeSustain = 0.88;
  private envelopeRelease = 1.1;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private currentPresetIndex = 0;
  private detuneRatio = 1.01;

  constructor() {
    void this.init();
  }

  private async init() {
    this.audioCtx = new AudioContext();

    this.vca = this.audioCtx.createGain();
    this.vca.gain.value = 0;

    this.filter = this.audioCtx.createBiquadFilter();
    this.filter.type = 'lowpass';
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

    const preset = SynthEngine.PRESETS[this.currentPresetIndex];

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = preset.osc1Type;
    osc1.frequency.value = this.minFrequency;

    const osc2 = this.audioCtx.createOscillator();
    osc2.type = preset.osc2Type;
    osc2.frequency.value = this.minFrequency * preset.detuneRatio;

    const osc1Gain = this.audioCtx.createGain();
    osc1Gain.gain.value = preset.osc1Level;

    const osc2Gain = this.audioCtx.createGain();
    osc2Gain.gain.value = preset.osc2Level;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(this.vca);
    osc2Gain.connect(this.vca);

    osc1.start();
    osc2.start();

    this.oscillators = [osc1, osc2];
    this.oscGains = [osc1Gain, osc2Gain];
    this.isRunning = true;
    this.applyPresetToNodes();
  }

  private stopOscillators() {
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Oscillator may already be stopped.
      }
    });
    this.oscillators = [];
    this.oscGains = [];
    this.isRunning = false;
  }

  private clearPulseTimer() {
    if (this.pulseTimer) {
      clearTimeout(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  private applyAttackDecay(target: number) {
    if (!this.audioCtx || !this.vca) return;

    const now = this.audioCtx.currentTime;
    const safeTarget = Math.min(Math.max(target, 0), 0.7);
    const sustainTarget = safeTarget * this.envelopeSustain;

    this.vca.gain.cancelScheduledValues(now);
    this.vca.gain.setValueAtTime(this.vca.gain.value, now);
    this.vca.gain.linearRampToValueAtTime(safeTarget, now + this.envelopeAttack);
    this.vca.gain.linearRampToValueAtTime(sustainTarget, now + this.envelopeAttack + this.envelopeDecay);
  }

  public setMorph(morph: number) {
    const t = Math.min(Math.max(morph, 0), 1);

    this.envelopeAttack = 0.22 - t * 0.216;
    this.envelopeDecay = 0.18 - t * 0.14;
    this.envelopeSustain = 0.88 - t * 0.7;
    this.envelopeRelease = 1.1 - t * 1.03;
  }

  public start() {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    if (!this.isRunning) {
      this.createOscillators();
    }
  }

  public stop() {
    this.clearPulseTimer();
    this.releaseNote();
  }

  public releaseNote() {
    if (!this.audioCtx || !this.vca) return;

    const now = this.audioCtx.currentTime;
    this.vca.gain.cancelScheduledValues(now);
    this.vca.gain.setValueAtTime(this.vca.gain.value, now);
    this.vca.gain.linearRampToValueAtTime(0, now + this.envelopeRelease);
  }

  public holdNoteFromMidi(midiNote: number, targetVolume = 0.45) {
    if (!this.audioCtx || !this.isRunning) return;

    this.clearPulseTimer();
    this.setFrequencyFromMidi(midiNote);
    this.applyAttackDecay(targetVolume);
  }

  public triggerArpFromMidi(midiNote: number, targetVolume = 0.4, gateMs = 120) {
    if (!this.audioCtx || !this.isRunning) return;

    this.clearPulseTimer();
    this.setFrequencyFromMidi(midiNote);
    this.applyAttackDecay(targetVolume);

    this.pulseTimer = setTimeout(() => {
      this.releaseNote();
      this.pulseTimer = null;
    }, Math.max(20, gateMs));
  }

  public setFrequency(normalizedY: number) {
    if (!this.audioCtx || !this.isRunning) return;

    const clampedY = Math.min(Math.max(normalizedY, 0), 1);
    const frequency = this.minFrequency + clampedY * (this.maxFrequency - this.minFrequency);

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.02);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setTargetAtTime(frequency * this.detuneRatio, this.audioCtx.currentTime, 0.02);
    }
  }

  public setFrequencyFromMidi(midiNote: number) {
    if (!this.audioCtx || !this.isRunning) return;

    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setTargetAtTime(frequency, this.audioCtx.currentTime, 0.02);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setTargetAtTime(frequency * this.detuneRatio, this.audioCtx.currentTime, 0.02);
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

  public triggerNote(frequency = 440) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    this.start();

    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    }
    if (this.oscillators[1]) {
      this.oscillators[1].frequency.setValueAtTime(frequency * 1.01, this.audioCtx.currentTime);
    }

    this.setMorph(0.2);
    this.applyAttackDecay(0.45);
    this.clearPulseTimer();
    this.pulseTimer = setTimeout(() => {
      this.releaseNote();
      this.pulseTimer = null;
    }, 900);
  }

  public dispose() {
    this.clearPulseTimer();
    this.stopOscillators();
    if (this.audioCtx) {
      void this.audioCtx.close();
    }
  }

  public getPresetNames(): string[] {
    return SynthEngine.PRESETS.map((p) => p.name);
  }

  public getCurrentPresetIndex(): number {
    return this.currentPresetIndex;
  }

  public getCurrentPresetName(): string {
    return SynthEngine.PRESETS[this.currentPresetIndex]?.name || 'Unknown';
  }

  public setPresetByIndex(index: number): number {
    const total = SynthEngine.PRESETS.length;
    if (total === 0) return 0;
    const next = ((index % total) + total) % total;
    this.currentPresetIndex = next;
    this.applyPresetToNodes();
    return next;
  }

  public shiftPreset(delta: number): number {
    return this.setPresetByIndex(this.currentPresetIndex + delta);
  }

  private applyPresetToNodes() {
    const preset = SynthEngine.PRESETS[this.currentPresetIndex];
    if (!preset) return;

    this.detuneRatio = preset.detuneRatio;

    if (this.oscillators[0]) this.oscillators[0].type = preset.osc1Type;
    if (this.oscillators[1]) this.oscillators[1].type = preset.osc2Type;
    if (this.oscGains[0]) this.oscGains[0].gain.value = preset.osc1Level;
    if (this.oscGains[1]) this.oscGains[1].gain.value = preset.osc2Level;

    if (this.filter) {
      this.filter.frequency.setTargetAtTime(
        preset.filterHz,
        this.audioCtx?.currentTime ?? 0,
        0.04
      );
      this.filter.Q.setTargetAtTime(
        preset.filterQ,
        this.audioCtx?.currentTime ?? 0,
        0.04
      );
    }
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        preset.master,
        this.audioCtx?.currentTime ?? 0,
        0.08
      );
    }
  }
}
