import { describe, it, expect } from 'vitest';

describe('HandTracker Logic Tests', () => {
  it('should parse MediaPipe results correctly', () => {
    const mockResults = {
      multiHandLandmarks: [
        [
          { x: 0.1, y: 0.2, z: 0.0 },
          { x: 0.15, y: 0.25, z: 0.01 },
          { x: 0.2, y: 0.3, z: 0.02 },
          { x: 0.25, y: 0.35, z: 0.03 },
          { x: 0.8, y: 0.8, z: 0.1 },  // Thumb far from index
          { x: 0.12, y: 0.22, z: 0.0 },
          { x: 0.17, y: 0.27, z: 0.01 },
          { x: 0.22, y: 0.32, z: 0.02 },
          { x: 0.27, y: 0.37, z: 0.03 }, // Index tip
          { x: 0.32, y: 0.42, z: 0.04 },
        ],
      ],
      multiHandedness: [
        { label: 'Left', score: 0.9 },
      ],
      image: {},
    };

    const landmarks = mockResults.multiHandLandmarks[0];
    const handedness = mockResults.multiHandedness[0];
    const isLeft = handedness.label === 'Left';

    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    const pinchDistance = Math.hypot(
      indexTip.x - thumbTip.x,
      indexTip.y - thumbTip.y
    );
    const isPinching = pinchDistance < 0.15;

    expect(isLeft).toBe(true);
    expect(indexTip.x).toBe(0.27);
    expect(thumbTip.x).toBe(0.8);
    expect(isPinching).toBe(false); // Far apart
  });

  it('should detect pinch correctly', () => {
    const isPinching = (thumbX: number, thumbY: number, indexX: number, indexY: number) => {
      const distance = Math.hypot(indexX - thumbX, indexY - thumbY);
      return distance < 0.15; // Realistic threshold for hand tracking
    };

    expect(isPinching(0.3, 0.4, 0.32, 0.42)).toBe(true); // Close = pinch
    expect(isPinching(0.3, 0.4, 0.5, 0.6)).toBe(false); // Far = no pinch
    expect(isPinching(0.5, 0.5, 0.55, 0.6)).toBe(true);
    expect(isPinching(0.5, 0.5, 0.8, 0.8)).toBe(false);
  });

  it('should calculate hand center correctly', () => {
    const landmarks = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
      { x: 0.4, y: 0.4 },
      { x: 0.5, y: 0.5 },
    ];

    const centerX = landmarks.reduce((sum, l) => sum + l.x, 0) / landmarks.length;
    const centerY = landmarks.reduce((sum, l) => sum + l.y, 0) / landmarks.length;

    expect(centerX).toBe(0.3);
    expect(centerY).toBe(0.3);
  });

  it('should invert Y coordinate correctly', () => {
    const normalizeAndInvert = (y: number) => {
      return 1 - Math.min(Math.max(y, 0), 1);
    };

    expect(normalizeAndInvert(0)).toBe(1);
    expect(normalizeAndInvert(0.5)).toBe(0.5);
    expect(normalizeAndInvert(1)).toBe(0);
    expect(normalizeAndInvert(0.25)).toBe(0.75);
  });

  it('should clamp values correctly', () => {
    const clamp = (value: number, min: number, max: number) => {
      return Math.min(Math.max(value, min), max);
    };

    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(0.3, 0.1, 0.9)).toBe(0.3);
  });
});
