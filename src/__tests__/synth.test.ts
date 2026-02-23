import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SynthEngine Simulation Tests', () => {
  const mockAudioContext = {
    createOscillator: vi.fn(() => ({
      type: 'sawtooth',
      frequency: { value: 220, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createBiquadFilter: vi.fn(() => ({
      type: 'lowpass',
      frequency: { value: 2000 },
      Q: { value: 5 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    createConvolver: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      buffer: null,
    })),
    createDynamicsCompressor: vi.fn(() => ({
      threshold: { value: -20 },
      knee: { value: 10 },
      ratio: { value: 4 },
      attack: { value: 0.01 },
      release: { value: 0.2 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    destination: {},
    state: 'running',
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    sampleRate: 44100,
  };

  beforeEach(() => {
    vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));
    vi.stubGlobal('window', { AudioContext: vi.fn(() => mockAudioContext) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should calculate frequency from normalized Y correctly', () => {
    const minFreq = 110;
    const maxFreq = 880;
    
    // Y=0 (top) -> high freq (880), Y=1 (bottom) -> low freq (110)
    const calcFrequency = (y: number) => {
      const clamped = Math.min(Math.max(y, 0), 1);
      return minFreq + (1 - clamped) * (maxFreq - minFreq);
    };

    expect(calcFrequency(0)).toBe(880);
    expect(calcFrequency(0.5)).toBe(495);
    expect(calcFrequency(1)).toBe(110);
    expect(calcFrequency(0.75)).toBe(302.5);
  });

  it('should calculate filter cutoff from normalized X correctly', () => {
    const minCutoff = 200;
    const maxCutoff = 8200;

    const calcCutoff = (x: number) => {
      return minCutoff + x * (maxCutoff - minCutoff);
    };

    expect(calcCutoff(0)).toBe(200);
    expect(calcCutoff(0.5)).toBe(4200);
    expect(calcCutoff(1)).toBe(8200);
  });

  it('should simulate gesture state changes', () => {
    const gestureState = {
      leftHand: null as { x: number; y: number; isPinching: boolean } | null,
      rightHand: null as { x: number; y: number; isPinching: boolean } | null,
    };

    gestureState.rightHand = { x: 0.5, y: 0.3, isPinching: false };
    expect(gestureState.rightHand.isPinching).toBe(false);
    expect(gestureState.rightHand.y).toBe(0.3);

    gestureState.rightHand.isPinching = true;
    expect(gestureState.rightHand.isPinching).toBe(true);

    gestureState.leftHand = { x: 0.8, y: 0.5, isPinching: false };
    expect(gestureState.leftHand.x).toBe(0.8);
  });

  it('should simulate EMA smoothing', () => {
    const smoothingFactor = 0.3;
    let prevValue: number | undefined;

    const smooth = (current: number) => {
      if (prevValue === undefined) return current;
      return prevValue + smoothingFactor * (current - prevValue);
    };

    const values = [0.5, 0.6, 0.7, 0.8, 0.9];
    const smoothed: number[] = [];

    values.forEach(v => {
      const result = smooth(v);
      smoothed.push(result);
      prevValue = result;
    });

    expect(smoothed[0]).toBe(0.5);
    expect(smoothed[1]).toBe(0.53);
    expect(smoothed[2]).toBeCloseTo(0.581);
    expect(smoothed[3]).toBeCloseTo(0.6467);
    expect(smoothed[4]).toBeCloseTo(0.72269);
  });
});
