import { Hands, Results, HAND_CONNECTIONS } from "@mediapipe/hands";

export interface HandData {
  x: number;
  y: number;
  z: number;
  isPinching: boolean;
}

export interface GestureState {
  leftHand: HandData | null;
  rightHand: HandData | null;
}

export class HandTracker {
  private hands: Hands | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private onGesture: ((state: GestureState) => void) | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  private smoothingFactor = 0.3;
  private prevLeft: HandData | null = null;
  private prevRight: HandData | null = null;

  constructor() {}

  public async initialize(
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    onGesture: (state: GestureState) => void
  ): Promise<void> {
    console.log("[HandTracker] Initializing...");
    
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext("2d");
    this.onGesture = onGesture;

    this.hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this.onResults(results));
    
    console.log("[HandTracker] MediaPipe Hands initialized");
  }

  private smoothValue(current: number, previous: number | undefined): number {
    if (previous === undefined) return current;
    return previous + this.smoothingFactor * (current - previous);
  }

  private async processFrame() {
    if (!this.hands || !this.videoElement || !this.isRunning) return;

    try {
      await this.hands.send({ image: this.videoElement });
    } catch (error) {
      console.error("[HandTracker] Frame processing error:", error);
    }

    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this.processFrame());
    }
  }

  private onResults(results: Results) {
    if (!this.canvasElement || !this.canvasCtx) return;

    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // Flip horizontally to match mirrored video
    this.canvasCtx.translate(this.canvasElement.width, 0);
    this.canvasCtx.scale(-1, 1);
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);

    let leftHand: HandData | null = null;
    let rightHand: HandData | null = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i];
        const isLeft = handedness.label === "Left";

        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const pinchDistance = Math.hypot(
          indexTip.x - thumbTip.x,
          indexTip.y - thumbTip.y
        );
        const isPinching = pinchDistance < 0.25;

        // Flip X coordinate to match mirrored display
        const flippedX = 1 - indexTip.x;

        const rawData: HandData = {
          x: flippedX,
          y: indexTip.y,
          z: indexTip.z,
          isPinching,
        };

        if (isLeft) {
          this.prevLeft = {
            x: this.smoothValue(rawData.x, this.prevLeft?.x),
            y: this.smoothValue(rawData.y, this.prevLeft?.y),
            z: this.smoothValue(rawData.z, this.prevLeft?.z),
            isPinching: rawData.isPinching,
          };
          leftHand = this.prevLeft;
        } else {
          this.prevRight = {
            x: this.smoothValue(rawData.x, this.prevRight?.x),
            y: this.smoothValue(rawData.y, this.prevRight?.y),
            z: this.smoothValue(rawData.z, this.prevRight?.z),
            isPinching: rawData.isPinching,
          };
          rightHand = this.prevRight;
        }

        this.drawConnectors(this.canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: isLeft ? "#00FF00" : "#FF0000",
          lineWidth: 2,
        });
        this.drawLandmarks(this.canvasCtx, landmarks, {
          color: isLeft ? "#00FF00" : "#FF0000",
          lineWidth: 1,
          radius: 3,
        });
      }
    }

    this.canvasCtx.restore();

    if (this.onGesture) {
      this.onGesture({ leftHand, rightHand });
    }
  }

  private drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    connections: any[],
    style: { color: string; lineWidth: number }
  ) {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.lineWidth;

    for (const connection of connections) {
      const [start, end] = connection;
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      if (!startPoint || !endPoint) continue;

      ctx.beginPath();
      ctx.moveTo(startPoint.x * this.canvasElement!.width, startPoint.y * this.canvasElement!.height);
      ctx.lineTo(endPoint.x * this.canvasElement!.width, endPoint.y * this.canvasElement!.height);
      ctx.stroke();
    }
  }

  private drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    style: { color: string; lineWidth: number; radius: number }
  ) {
    ctx.fillStyle = style.color;

    for (const landmark of landmarks) {
      ctx.beginPath();
      ctx.arc(
        landmark.x * this.canvasElement!.width,
        landmark.y * this.canvasElement!.height,
        style.radius,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[HandTracker] Starting...");
    await this.processFrame();
  }

  public async stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log("[HandTracker] Stopped");
  }

  public dispose() {
    this.stop();
    
    this.hands?.close();
    this.hands = null;
  }
}
