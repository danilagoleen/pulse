import * as Tone from 'tone';

export type ArpPattern = 'up' | 'down' | 'updown' | 'random';

export class Arpeggiator {
  private synth?: Tone.PolySynth;
  private filter?: Tone.Filter;
  private outputGain?: Tone.Gain;
  private loop?: Tone.Loop;
  private _isReady = false;
  private notes: number[] = [];
  private pattern: ArpPattern = 'up';
  private bpm: number = 120;

  async initialize() {
    if (this._isReady) return;
    
    await Tone.start();
    
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
    });
    this.synth.volume.value = -14;
    
    this.filter = new Tone.Filter(2000, 'lowpass');
    this.outputGain = new Tone.Gain(0.35);
    const reverb = new Tone.Reverb({ decay: 2, wet: 0.3 });
    const compressor = new Tone.Compressor(-20, 4);

    this.synth.connect(this.filter);
    this.filter.connect(reverb);
    this.filter.connect(compressor);
    reverb.connect(compressor);
    compressor.connect(this.outputGain);
    this.outputGain.toDestination();
    
    Tone.Transport.bpm.value = this.bpm;
    this._isReady = true;
    console.log('[Arpeggiator] Initialized');
  }

  setNotes(notes: number[]) {
    this.notes = notes;
  }

  setBaseNote(_note: number) {
  }

  setPattern(p: ArpPattern) {
    this.pattern = p;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    Tone.Transport.bpm.value = bpm;
  }

  setFilterCutoff(cutoff: number) {
    if (this.filter) {
      this.filter.frequency.value = 200 + cutoff * 8000;
    }
  }

  setOutputLevel(level: number) {
    if (!this.outputGain) return;
    const clamped = Math.min(Math.max(level, 0), 1);
    this.outputGain.gain.rampTo(clamped, 0.05);
  }

  async start() {
    if (!this._isReady) {
      await this.initialize();
    }
    if (this.loop) return;
    
    Tone.Transport.start();
    
    this.loop = new Tone.Loop((time) => {
      if (this.notes.length === 0) return;
      
      const ticks = Tone.Transport.ticks;
      const step = Math.floor(ticks / 4) % this.notes.length;
      
      let noteIdx = step;
      if (this.pattern === 'down') {
        noteIdx = this.notes.length - 1 - step;
      } else if (this.pattern === 'updown') {
        const cycle = this.notes.length * 2 - 2;
        const cycleStep = cycle > 0 ? step % cycle : 0;
        noteIdx = cycleStep < this.notes.length ? cycleStep : cycle - cycleStep;
      } else if (this.pattern === 'random') {
        noteIdx = Math.floor(Math.random() * this.notes.length);
      }
      
      const midiNote = this.notes[noteIdx];
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      this.synth?.triggerAttackRelease(freq, '16n', time);
    }, '16n').start(0);
  }

  stop() {
    this.synth?.releaseAll();
    this.loop?.dispose();
    this.loop = undefined;
    Tone.Transport.stop();
  }

  isReadyCheck(): boolean {
    return this._isReady;
  }

  isReady(): boolean {
    return this._isReady;
  }

  dispose(): void {
    this.stop();
    this.synth?.dispose();
    this.filter?.dispose();
    this.outputGain?.dispose();
  }
}
