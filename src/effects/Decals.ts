import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.ts';

interface DecalItem {
  mesh: THREE.Mesh;
  remaining: number;
}

/**
 * Pooled bullet-hole and explosion scorch decals placed flush against world surfaces.
 */
export class DecalSystem {
  private readonly pool: ObjectPool<DecalItem>;
  private readonly active: DecalItem[] = [];
  private enabled = true;

  constructor(effectsGroup: THREE.Group) {
    const geom = new THREE.BoxGeometry(0.11, 0.11, 0.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x18181b,
      transparent: true,
      opacity: 0.82
    });

    this.pool = new ObjectPool<DecalItem>(
      () => {
        const mesh = new THREE.Mesh(geom, mat);
        mesh.visible = false;
        effectsGroup.add(mesh);
        return { mesh, remaining: 0 };
      },
      (item) => {
        item.mesh.visible = false;
        item.mesh.scale.set(1, 1, 1);
        item.remaining = 0;
      },
      32,
      80
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  spawnBulletDecal(point: THREE.Vector3, normal: THREE.Vector3, scale = 1.0): void {
    if (!this.enabled) return;
    const item = this.pool.acquire();
    item.mesh.position.copy(point).addScaledVector(normal, 0.015);
    const lookTarget = item.mesh.position.clone().add(normal);
    item.mesh.lookAt(lookTarget);
    item.mesh.scale.set(scale, scale, 1);
    item.mesh.visible = true;
    item.remaining = 18.0;
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
