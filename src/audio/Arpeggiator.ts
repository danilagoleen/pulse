import * as Tone from 'tone';

export type ArpPattern =
  | 'up'
  | 'down'
  | 'upDown'
  | 'downUp'
  | 'random'
  | 'randomOnce'
  | 'randomWalk'
  | 'ordered'
  | 'chord';

type ArpStepCallback = (midiNote: number, gateMs: number, morph: number) => void;

export class Arpeggiator {
  private loop?: Tone.Loop;
  private _isReady = false;
  private notes: number[] = [];
  private notePool: number[] = [];
  private pattern: ArpPattern = 'up';
  private bpm = 120;
  private smoothedBpm = 120;
  private baseNote: number | null = null;
  private morph = 0;
  private rate: '8n' | '16n' | '32n' = '16n';
  private stepCallback?: ArpStepCallback;

  private cursor = 0;
  private direction = 1;
  private randomWalkIndex = 0;
  private randomOnceOrder: number[] = [];
  private randomOnceCursor = 0;
  private pulseNote: number | null = null;

  async initialize() {
    if (this._isReady) return;

    await Tone.start();
    Tone.Transport.bpm.value = this.bpm;
    this.smoothedBpm = this.bpm;
    this._isReady = true;
    console.log('[Arpeggiator] Scheduler initialized');
  }

  setNotes(notes: number[]) {
    this.notes = [...notes].sort((a, b) => a - b);
    this.rebuildNotePool();
    this.resetCursor();
  }

  setBaseNote(note: number) {
    this.baseNote = note;
    this.rebuildNotePool();
    this.resetCursor();
  }

  setPattern(p: ArpPattern) {
    this.pattern = p;
    this.resetCursor();
  }

  setPulseNote(note: number | null) {
    this.pulseNote = note;
  }

  setNoteCallback(callback: ArpStepCallback) {
    this.stepCallback = callback;
  }

  setBpm(bpm: number) {
    const clamped = Math.min(Math.max(bpm, 50), 190);
    this.bpm = clamped;
    this.smoothedBpm = this.smoothedBpm + (clamped - this.smoothedBpm) * 0.18;
    Tone.Transport.bpm.rampTo(this.smoothedBpm, 0.25);
  }

  setFilterCutoff(_cutoff: number) {
    // Kept for API compatibility with previous versions.
  }

  setOutputLevel(_level: number) {
    // Kept for API compatibility with previous versions.
  }

  setDiffusion(intensity: number) {
    const t = Math.min(Math.max(intensity, 0), 1);
    this.morph = t;

    const nextRate: '8n' | '16n' | '32n' = t < 0.33 ? '8n' : t < 0.66 ? '16n' : '32n';
    if (nextRate !== this.rate) {
      this.rate = nextRate;
      if (this.loop) {
        this.loop.interval = nextRate;
      }
    }
  }

  async start() {
    if (!this._isReady) {
      await this.initialize();
    }
    if (this.loop) return;

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }

    this.loop = new Tone.Loop((time) => {
      const pool = this.notePool.length > 0 ? this.notePool : this.notes;
      if ((pool.length === 0 && this.pulseNote == null) || !this.stepCallback) return;

      const midiNote = this.pulseNote ?? pool[this.nextIndex(pool.length)];
      const stepMs = this.getStepDurationMs();
      const gateMs = Math.max(28, stepMs * (0.9 - this.morph * 0.5));

      this.stepCallback(midiNote, gateMs, this.morph);
      void time;
    }, this.rate).start(0);
  }

  stop() {
    this.loop?.dispose();
    this.loop = undefined;
  }

  isReadyCheck(): boolean {
    return this._isReady;
  }

  isReady(): boolean {
    return this._isReady;
  }

  dispose(): void {
    this.stop();
  }

  private rebuildNotePool() {
    if (this.notes.length === 0) {
      this.notePool = [];
      return;
    }

    if (this.baseNote == null) {
      this.notePool = this.notes.slice(0, 7);
      return;
    }

    const aroundBase = this.notes
      .filter((note) => Math.abs(note - this.baseNote!) <= 12)
      .sort((a, b) => a - b);

    if (aroundBase.length >= 3) {
      this.notePool = aroundBase;
      return;
    }

    const nearest = [...this.notes]
      .sort((a, b) => Math.abs(a - this.baseNote!) - Math.abs(b - this.baseNote!))
      .slice(0, 5)
      .sort((a, b) => a - b);

    this.notePool = nearest;
  }

  private resetCursor() {
    this.cursor = 0;
    this.direction = 1;
    this.randomWalkIndex = 0;
    this.randomOnceOrder = [];
    this.randomOnceCursor = 0;
  }

  private nextIndex(length: number): number {
    if (length <= 1) return 0;

    if (this.pattern === 'chord') {
      return 0;
    }

    if (this.pattern === 'random') {
      return Math.floor(Math.random() * length);
    }

    if (this.pattern === 'randomWalk') {
      if (this.randomWalkIndex <= 0) {
        this.randomWalkIndex = Math.floor(Math.random() * length);
      } else {
        const step = Math.random() < 0.5 ? -1 : 1;
        this.randomWalkIndex = Math.min(length - 1, Math.max(0, this.randomWalkIndex + step));
      }
      return this.randomWalkIndex;
    }

    if (this.pattern === 'randomOnce') {
      if (this.randomOnceOrder.length !== length || this.randomOnceCursor >= length) {
        this.randomOnceOrder = Array.from({ length }, (_, idx) => idx);
        for (let i = this.randomOnceOrder.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.randomOnceOrder[i], this.randomOnceOrder[j]] = [this.randomOnceOrder[j], this.randomOnceOrder[i]];
        }
        this.randomOnceCursor = 0;
      }
      const idx = this.randomOnceOrder[this.randomOnceCursor];
      this.randomOnceCursor += 1;
      return idx;
    }

    if (this.pattern === 'ordered') {
      const idx = this.cursor % length;
      this.cursor = (this.cursor + 1) % length;
      return idx;
    }

    if (this.pattern === 'up') {
      const idx = this.cursor % length;
      this.cursor = (this.cursor + 1) % length;
      return idx;
    }

    if (this.pattern === 'down') {
      const idx = (length - 1 - (this.cursor % length) + length) % length;
      this.cursor = (this.cursor + 1) % length;
      return idx;
    }

    if (this.pattern === 'downUp') {
      const idx = length - 1 - this.cursor;
      this.cursor = (this.cursor + 1) % length;
      return idx;
    }

    const idx = this.cursor;
    this.cursor += this.direction;

    if (this.cursor >= length) {
      this.cursor = Math.max(0, length - 2);
      this.direction = -1;
    } else if (this.cursor < 0) {
      this.cursor = Math.min(length - 1, 1);
      this.direction = 1;
    }

    return idx;
  }

  private getStepDurationMs(): number {
    const beatMs = 60000 / Math.max(this.smoothedBpm, 1);
    if (this.rate === '8n') return beatMs / 2;
    if (this.rate === '32n') return beatMs / 8;
    return beatMs / 4;
  }
}
