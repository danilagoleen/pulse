import { describe, it, expect, beforeEach } from 'vitest';
import { CircularAudioBuffer } from '../audio/CircularAudioBuffer';

describe('CircularAudioBuffer', () => {
  let buffer: CircularAudioBuffer;

  beforeEach(() => {
    buffer = new CircularAudioBuffer(1, 1000);
  });

  it('should create buffer with correct size', () => {
    expect(buffer.getSize()).toBe(1000);
    expect(buffer.getDurationSeconds()).toBe(1);
  });

  it('should push single samples', () => {
    buffer.push(0.5);
    buffer.push(0.3);
    expect(buffer.getOccupancy()).toBe(2);
  });

  it('should push arrays', () => {
    buffer.pushArray(new Float32Array([0.1, 0.2, 0.3]));
    expect(buffer.getOccupancy()).toBe(3);
  });

  it('should get recent samples', () => {
    buffer.pushArray(new Float32Array([1, 2, 3, 4, 5]));
    const recent = buffer.getRecent(3);
    expect(recent).toEqual(new Float32Array([3, 4, 5]));
  });

  it('should wrap around when full', () => {
    buffer = new CircularAudioBuffer(1, 5);
    buffer.pushArray(new Float32Array([1, 2, 3, 4, 5]));
    buffer.push(6);
    buffer.push(7);
    const recent = buffer.getRecent(3);
    expect(recent).toEqual(new Float32Array([5, 6, 7]));
  });

  it('should clear buffer', () => {
    buffer.pushArray(new Float32Array([1, 2, 3]));
    buffer.clear();
    expect(buffer.getOccupancy()).toBe(0);
  });

  it('should truncate if requested size exceeds max', () => {
    buffer.pushArray(new Float32Array([1, 2, 3]));
    const recent = buffer.getRecent(10000);
    expect(recent.length).toBe(1000);
  });
});
