/**
 * Seeded Mulberry32 pseudo-random number generator for deterministic ballistics,
 * recoil spray patterns, bot decisions, and repeatable unit tests.
 */
export class SeededRandom {
  private state: number;

  constructor(seed = 1337) {
    this.state = seed >>> 0;
  }

  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 0.999999));
  }

  spreadGaussian(): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}
