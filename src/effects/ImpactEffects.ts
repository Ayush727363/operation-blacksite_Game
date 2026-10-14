import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.ts';

interface ImpactBurstItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  remaining: number;
}

/**
 * Pooled bullet impact sparks, dust puffs, and blood/hit confirmation bursts.
 */
export class ImpactEffectsSystem {
  private readonly pool: ObjectPool<ImpactBurstItem>;
  private readonly active: ImpactBurstItem[] = [];
  private enabled = true;

  constructor(effectsGroup: THREE.Group) {
    const geom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    this.pool = new ObjectPool<ImpactBurstItem>(
      () => {
        const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.visible = false;
        effectsGroup.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), remaining: 0 };
      },
      (item) => {
        item.mesh.visible = false;
        item.remaining = 0;
      },
      24,
      96
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  spawnImpact(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    type: 'concrete' | 'metal' | 'wood' | 'dirt' | 'flesh'
  ): void {
    if (!this.enabled) return;

    const colorHex =
      type === 'flesh'
        ? 0xef4444
        : type === 'metal'
          ? 0xfde047
          : type === 'wood'
            ? 0xb45309
            : 0xcbd5e1;

    const count = type === 'metal' || type === 'flesh' ? 4 : 3;
    for (let i = 0; i < count; i++) {
      const item = this.pool.acquire();
      item.mesh.material.color.setHex(colorHex);
      item.mesh.position.copy(point).addScaledVector(normal, 0.03);
      item.velocity
        .copy(normal)
        .multiplyScalar(1.8 + Math.random() * 2.2)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 2.0,
            Math.random() * 1.8,
            (Math.random() - 0.5) * 2.0
          )
        );
      item.remaining = 0.22 + Math.random() * 0.12;
      item.mesh.visible = true;
      this.active.push(item);
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.remaining -= dt;
      if (item.remaining <= 0) {
        this.pool.release(item);
        this.active.splice(i, 1);
        continue;
      }
      item.velocity.y -= 9.8 * dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
    }
  }

  clear(): void {
    this.pool.releaseAll();
    this.active.length = 0;
  }
}
