import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.ts';

interface TracerItem {
  line: THREE.Line;
  remaining: number;
}

/**
 * Pooled 3D bullet tracer lines aligned strictly with the actual ballistics ray trajectory.
 */
export class TracerSystem {
  private readonly pool: ObjectPool<TracerItem>;
  private readonly active: TracerItem[] = [];

  constructor(effectsGroup: THREE.Group) {
    const mat = new THREE.LineBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending
    });

    this.pool = new ObjectPool<TracerItem>(
      () => {
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(),
          new THREE.Vector3(0, 0, -1)
        ]);
        const line = new THREE.Line(geom, mat);
        line.visible = false;
        effectsGroup.add(line);
        return { line, remaining: 0 };
      },
      (item) => {
        item.line.visible = false;
        item.remaining = 0;
      },
      20,
      64
    );
  }

  spawnTracer(start: THREE.Vector3, end: THREE.Vector3): void {
    const item = this.pool.acquire();
    const posAttr = item.line.geometry.getAttribute('position');
    if (posAttr) {
      posAttr.setXYZ(0, start.x, start.y, start.z);
      posAttr.setXYZ(1, end.x, end.y, end.z);
    }
    item.line.visible = true;
    item.remaining = 0.055;
    this.active.push(item);
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.remaining -= dt;
      if (item.remaining <= 0) {
        this.pool.release(item);
        this.active.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.pool.releaseAll();
    this.active.length = 0;
  }
}
