/**
 * Deterministic & bounded delta-time game clock.
 * Prevents physics explosion on tab-switch or frame spikes.
 */
export class GameClock {
  private lastTimestamp = 0;
  private elapsed = 0;
  private paused = false;
  private readonly maxDelta: number;
  private fpsSamples: number[] = [];
  private currentFps = 60;
  private frameTimeMs = 16.67;

  constructor(maxDelta = 0.1) {
    this.maxDelta = maxDelta;
  }

  start(nowMs = performance.now()): void {
    this.lastTimestamp = nowMs;
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(nowMs = performance.now()): void {
    this.paused = false;
    this.lastTimestamp = nowMs;
  }

  isPaused(): boolean {
    return this.paused;
  }

  tick(nowMs = performance.now()): number {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = nowMs;
      return 1 / 60;
    }
    const rawMs = Math.max(0, nowMs - this.lastTimestamp);
    this.lastTimestamp = nowMs;

    if (this.paused) {
      return 0;
    }

    this.frameTimeMs = rawMs;
    const rawDelta = rawMs / 1000;
    const boundedDelta = Math.min(this.maxDelta, Math.max(0.0001, rawDelta));
    this.elapsed += boundedDelta;

    if (rawMs > 0) {
      this.fpsSamples.push(1000 / rawMs);
      if (this.fpsSamples.length > 30) {
        this.fpsSamples.shift();
      }
      const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
      this.currentFps = Math.round(sum / this.fpsSamples.length);
    }

    return boundedDelta;
  }

  getElapsed(): number {
    return this.elapsed;
  }

  getFps(): number {
    return this.currentFps;
  }

  getFrameTimeMs(): number {
    return this.frameTimeMs;
  }

  reset(): void {
    this.lastTimestamp = 0;
    this.elapsed = 0;
    this.fpsSamples = [];
  }
}
