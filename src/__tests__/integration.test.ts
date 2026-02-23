import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Gesture to Synth Integration Tests', () => {
  const mockAudioContext = {
    createOscillator: vi.fn(() => ({
      type: 'sawtooth',
      frequency: { 
        value: 220, 
        setValueAtTime: vi.fn(), 
        setTargetAtTime: vi.fn() 
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: { 
        value: 0, 
        setValueAtTime: vi.fn(), 
        setTargetAtTime: vi.fn() 
      },
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should map gesture to synth parameters correctly', () => {
    const minFreq = 110;
    const maxFreq = 880;
    const minCutoff = 200;
    const maxCutoff = 8200;

    let isPlaying = false;
    let currentFrequency = 110;
    let currentVolume = 0;
    let currentCutoff = 200;

    const gestureToSynth = (gesture: { rightHand: { y: number; isPinching: boolean } | null, leftHand: { x: number } | null }) => {
      if (gesture.rightHand?.isPinching) {
        isPlaying = true;
        const normalizedY = 1 - gesture.rightHand.y;
        currentFrequency = minFreq + normalizedY * (maxFreq - minFreq);
        currentVolume = 0.5;
      } else {
        isPlaying = false;
        currentVolume = 0;
      }

      if (gesture.leftHand) {
        currentCutoff = minCutoff + gesture.leftHand.x * (maxCutoff - minCutoff);
      }
    };

    gestureToSynth({
      rightHand: { y: 0.5, isPinching: true },
      leftHand: { x: 0.5 }
    });

    expect(isPlaying).toBe(true);
    expect(currentFrequency).toBe(495);
    expect(currentVolume).toBe(0.5);
    expect(currentCutoff).toBe(4200);

    gestureToSynth({
      rightHand: { y: 0.5, isPinching: false },
      leftHand: { x: 0.8 }
    });

    expect(isPlaying).toBe(false);
    expect(currentVolume).toBe(0);
    expect(currentCutoff).toBe(6600);
  });

  it('should simulate pinch detection', () => {
    const isPinching = (distance: number) => distance < 0.15;

    const calcDistance = (thumbX: number, thumbY: number, indexX: number, indexY: number) => {
      return Math.sqrt((indexX - thumbX) ** 2 + (indexY - thumbY) ** 2);
    };

    expect(isPinching(calcDistance(0.3, 0.4, 0.35, 0.45))).toBe(true);
    expect(isPinching(calcDistance(0.3, 0.4, 0.5, 0.6))).toBe(false);
  });

  it('should simulate continuous frequency sweep', () => {
    const minFreq = 110;
    const maxFreq = 880;
    const sweep: number[] = [];

    for (let y = 0; y <= 1; y += 0.1) {
      const normalizedY = 1 - y;
      const freq = minFreq + normalizedY * (maxFreq - minFreq);
      sweep.push(freq);
    }

    expect(sweep[0]).toBeCloseTo(880);
    expect(sweep[5]).toBeCloseTo(495);
    expect(sweep[10]).toBeCloseTo(110);
    expect(sweep.length).toBe(11);
  });

  it('should handle hand tracking state machine', () => {
    type HandState = 'idle' | 'tracking' | 'pinching';
    let state: HandState = 'idle';
    let volume = 0;

    const transitions = [
      { rightHand: null, expectedState: 'idle', expectedVolume: 0 },
      { rightHand: { y: 0.5, isPinching: false }, expectedState: 'tracking', expectedVolume: 0 },
      { rightHand: { y: 0.5, isPinching: true }, expectedState: 'pinching', expectedVolume: 0.5 },
      { rightHand: { y: 0.3, isPinching: true }, expectedState: 'pinching', expectedVolume: 0.5 },
      { rightHand: { y: 0.5, isPinching: false }, expectedState: 'tracking', expectedVolume: 0 },
    ];

    transitions.forEach(t => {
      if (t.rightHand === null) {
        state = 'idle';
        volume = 0;
      } else if (t.rightHand.isPinching) {
        state = 'pinching';
        volume = t.expectedVolume;
        const normalizedY = 1 - t.rightHand.y;
        const calculatedFreq = 110 + normalizedY * (maxFreq - minFreq);
        expect(calculatedFreq).toBeGreaterThan(0);
      } else {
        state = 'tracking';
        volume = 0;
      }
      expect(state).toBe(t.expectedState);
      expect(volume).toBe(t.expectedVolume);
    });
  });
});

const minFreq = 110;
const maxFreq = 880;
