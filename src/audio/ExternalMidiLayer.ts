import { invoke } from '@tauri-apps/api/core';

export interface MidiOutputInfo {
  id: string;
  name: string;
  recommended?: boolean;
}

const GENRE_PROGRAM_MAP: Record<string, number> = {
  Ambient: 89,
  House: 81,
  Techno: 91,
  Trance: 93,
  DrumNBass: 87,
  Dubstep: 82,
  Jungle: 84,
  Pop: 80,
  Rock: 29,
  Metal: 30,
  Jazz: 65,
  Funk: 57,
  Impressionism: 88,
  Experimental: 95,
  Unknown: 80,
};

const SCALE_GENRE_PROGRAM_MAP: Record<string, number> = {
  'Mixolydian|DrumNBass': 87,
  'Dorian|DrumNBass': 84,
  'Phrygian|Techno': 92,
  'Lydian|Trance': 93,
  'Ionian (Major)|Pop': 81,
  'Aeolian (Natural Minor)|Ambient': 89,
  'Minor Pentatonic|Rock': 30,
  'Spanish|DrumNBass': 83,
  'Arabic|Techno': 94,
  'Whole Tone|Impressionism': 88,
};

export class ExternalMidiLayer {
  private outputs: MidiOutputInfo[] = [];
  private connectedOutputId = '';
  private activeNotes = new Set<number>();
  private heldNote: number | null = null;
  private currentProgram = 80;

  async initialize(): Promise<boolean> {
    this.outputs = await invoke<MidiOutputInfo[]>('list_midi_outputs');
    return true;
  }

  getOutputs(): MidiOutputInfo[] {
    return this.outputs;
  }

  async setOutputById(outputId: string): Promise<boolean> {
    if (!outputId) {
      await invoke('disconnect_midi_output');
      this.connectedOutputId = '';
      this.stopAll();
      return false;
    }

    await invoke('connect_midi_output', { outputId });
    this.connectedOutputId = outputId;
    this.stopAll();
    return true;
  }

  async startVirtualOutput(name = 'Pulse Virtual Out'): Promise<boolean> {
    try {
      await invoke('start_virtual_midi_output', { name });
      this.connectedOutputId = 'virtual';
      this.stopAll();
      return true;
    } catch {
      return false;
    }
  }

  async autoConnectPreferred(): Promise<MidiOutputInfo | null> {
    if (this.outputs.length === 0) {
      const created = await this.startVirtualOutput();
      if (!created) return null;
      return {
        id: 'virtual',
        name: 'Pulse Virtual Out',
        recommended: true,
      };
    }

    const preferred = this.outputs.find((o) =>
      /iac|surge|logic|ableton|reaper|midi/i.test(o.name)
    ) || this.outputs.find((o) => o.recommended) || this.outputs[0];

    if (!preferred) return null;
    await this.setOutputById(preferred.id);
    return preferred;
  }

  isReady(): boolean {
    return Boolean(this.connectedOutputId);
  }

  async applyGenrePreset(scaleName: string, genre: string): Promise<number | null> {
    if (!this.isReady()) return null;
    const matrixKey = `${scaleName}|${genre}`;
    const program = SCALE_GENRE_PROGRAM_MAP[matrixKey] ?? GENRE_PROGRAM_MAP[genre] ?? GENRE_PROGRAM_MAP.Unknown;
    await this.setProgram(program);
    return program;
  }

  async setProgram(program: number): Promise<void> {
    if (!this.isReady()) return;
    const clamped = Math.min(127, Math.max(0, Math.round(program)));
    this.currentProgram = clamped;
    await invoke('send_midi_program_change', { program: clamped });
  }

  getCurrentProgram(): number {
    return this.currentProgram;
  }

  async shiftProgram(delta: number): Promise<number> {
    const next = Math.min(127, Math.max(0, this.currentProgram + delta));
    await this.setProgram(next);
    return next;
  }

  async playLegato(midiNote: number, velocity = 96): Promise<void> {
    if (!this.isReady()) return;

    if (this.heldNote !== null && this.heldNote !== midiNote) {
      await this.noteOff(this.heldNote);
      this.activeNotes.delete(this.heldNote);
    }

    await this.noteOn(midiNote, velocity);
    this.activeNotes.add(midiNote);
    this.heldNote = midiNote;
  }

  async trigger(midiNote: number, durationMs = 120, velocity = 96): Promise<void> {
    if (!this.isReady()) return;

    await this.noteOn(midiNote, velocity);
    this.activeNotes.add(midiNote);

    setTimeout(() => {
      void this.noteOff(midiNote);
      this.activeNotes.delete(midiNote);
      if (this.heldNote === midiNote) {
        this.heldNote = null;
      }
    }, Math.max(20, durationMs));
  }

  async releaseHeld(): Promise<void> {
    if (this.heldNote === null) return;
    await this.noteOff(this.heldNote);
    this.activeNotes.delete(this.heldNote);
    this.heldNote = null;
  }

  stopAll(): void {
    if (!this.isReady()) {
      this.activeNotes.clear();
      this.heldNote = null;
      return;
    }

    void invoke('send_midi_all_notes_off');
    this.activeNotes.clear();
    this.heldNote = null;
  }

  private async noteOn(midiNote: number, velocity: number): Promise<void> {
    await invoke('send_midi_note_on', {
      note: this.clampMidi(midiNote),
      velocity: this.clampVelocity(velocity),
    });
  }

  private async noteOff(midiNote: number): Promise<void> {
    await invoke('send_midi_note_off', {
      note: this.clampMidi(midiNote),
    });
  }

  private clampMidi(midiNote: number): number {
    return Math.min(127, Math.max(0, Math.round(midiNote)));
  }

  private clampVelocity(velocity: number): number {
    return Math.min(127, Math.max(1, Math.round(velocity)));
  }
}
