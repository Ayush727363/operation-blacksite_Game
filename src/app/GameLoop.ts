import { GameClock } from '../core/Clock.ts';

/**
 * Manages the browser requestAnimationFrame loop and delegates delta-time
 * ticks to the Game controller.
 */
export class GameLoop {
  readonly clock = new GameClock(0.1);
  private rafId: number | null = null;
  private running = false;
  private readonly onTick: (dt: number) => void;

  constructor(onTick: (dt: number) => void) {
    this.onTick = onTick;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const frame = (now: number) => {
      if (!this.running) return;
      const dt = this.clock.tick(now);
      this.onTick(dt);
      if (typeof requestAnimationFrame === 'function') {
        this.rafId = requestAnimationFrame(frame);
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(frame);
    }
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}
