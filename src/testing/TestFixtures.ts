import * as THREE from 'three';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Provides lightweight, deterministic test assertion helpers compatible with
 * both Vitest and our zero-dependency Node test runner, plus reusable world fixtures.
 */
const g = globalThis as any;
let currentGroup = 'Suite';

export function describe(name: string, fn: () => void): void {
  if (typeof g.describe === 'function' && g.describe !== describe) {
    return g.describe(name, fn);
  }
  const prev = currentGroup;
  currentGroup = name;
  fn();
  currentGroup = prev;
}

export function it(name: string, fn: () => void): void {
  if (typeof g.it === 'function' && g.it !== it) {
    return g.it(name, fn);
  }
  const results: Array<{ group: string; name: string; passed: boolean; error?: string }> =
    (g.__TEST_RESULTS__ = g.__TEST_RESULTS__ || []);
  try {
    fn();
    results.push({ group: currentGroup, name, passed: true });
  } catch (err: any) {
    results.push({
      group: currentGroup,
      name,
      passed: false,
      error: err?.message || String(err)
    });
  }
}

export const test = it;

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${a} to equal ${b}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toBeCloseTo(expected: number, precision = 2) {
      const diff = Math.abs(actual - expected);
      const maxDiff = Math.pow(10, -precision) * 0.5;
      if (diff > maxDiff) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff})`);
      }
    },
    toContain(item: any) {
      if (!Array.isArray(actual) && typeof actual !== 'string') {
        throw new Error(`Expected ${actual} to be array or string`);
      }
      if (!actual.includes(item)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      }
    }
  };
}

export class MockStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export function createTestCollisionCorridor(): CollisionWorld {
  const world = new CollisionWorld();
  world.setWorldBounds(new THREE.Vector3(-40, -2, -40), new THREE.Vector3(40, 20, 40));
  // Add a solid wall at Z = 0 blocking shots along Z from +10 to -10 when X is near 0
  world.addBoxCollider(
    'center_wall',
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(6, 4, 1),
    { tag: 'wall', blocksMovement: true, blocksBullets: true, blocksVision: true }
  );
  return world;
}

export function createDeterministicRng(seed = 42): SeededRandom {
  return new SeededRandom(seed);
}
