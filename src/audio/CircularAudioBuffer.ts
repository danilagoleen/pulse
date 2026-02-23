export class CircularAudioBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private maxSize: number;
  private sampleRate: number;
  
  constructor(maxSeconds: number = 10, sampleRate: number = 44100) {
    this.sampleRate = sampleRate;
    this.maxSize = maxSeconds * sampleRate;
    this.buffer = new Float32Array(this.maxSize);
    console.log(`[CircularBuffer] Created: ${maxSeconds}s = ${this.maxSize} samples`);
  }
  
  push(sample: number) {
    this.buffer[this.writeIndex] = sample;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
  }
  
  pushArray(samples: Float32Array | number[]) {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    }
  }
  
  getRecent(size: number): Float32Array {
    if (size > this.maxSize) {
      console.warn(`[CircularBuffer] Requested ${size} > max ${this.maxSize}, truncating`);
      size = this.maxSize;
    }
    
    const result = new Float32Array(size);
    let idx = (this.writeIndex - size + this.maxSize) % this.maxSize;
    
    for (let i = 0; i < size; i++) {
      result[i] = this.buffer[idx];
      idx = (idx + 1) % this.maxSize;
    }
    
    return result;
  }
  
  getAll(): Float32Array {
    return this.getRecent(this.maxSize);
  }
  
  clear() {
    this.buffer.fill(0);
    this.writeIndex = 0;
    console.log('[CircularBuffer] Cleared');
  }
  
  getSize(): number {
    return this.maxSize;
  }
  
  getSampleRate(): number {
    return this.sampleRate;
  }
  
  getDurationSeconds(): number {
    return this.maxSize / this.sampleRate;
  }
  
  getOccupancy(): number {
    return this.writeIndex;
  }
}
