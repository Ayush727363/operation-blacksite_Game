/**
 * Generic object pool for high-frequency effects (tracers, impact particles,
 * shell casings, decals) to prevent garbage collection spikes.
 */
export class ObjectPool<T> {
  private readonly factory: () => T;
  private readonly resetFn: (item: T) => void;
  private readonly freeList: T[] = [];
  private readonly activeSet = new Set<T>();
  private readonly maxCapacity: number;

  constructor(factory: () => T, resetFn: (item: T) => void, initialSize = 16, maxCapacity = 128) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxCapacity = maxCapacity;
    for (let i = 0; i < initialSize; i++) {
      this.freeList.push(this.factory());
    }
  }

  acquire(): T {
    let item: T;
    if (this.freeList.length > 0) {
      item = this.freeList.pop()!;
    } else if (this.activeSet.size < this.maxCapacity) {
      item = this.factory();
    } else {
      // Recycle oldest active item if at capacity
      const oldest = this.activeSet.values().next().value as T;
      this.release(oldest);
      item = this.freeList.pop()!;
    }
    this.activeSet.add(item);
    return item;
  }

  release(item: T): void {
    if (this.activeSet.delete(item)) {
      this.resetFn(item);
      this.freeList.push(item);
    }
  }

  releaseAll(): void {
    for (const item of Array.from(this.activeSet)) {
      this.release(item);
    }
  }

  getActiveCount(): number {
    return this.activeSet.size;
  }

  getAvailableCount(): number {
    return this.freeList.length;
  }
}
