import * as THREE from 'three';
import { ObjectPool } from '../core/ObjectPool.ts';

interface ShellItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  remaining: number;
}

/**
 * Pooled brass shell casings ejected from the weapon ejection port on each shot.
 */
export class ShellCasingSystem {
  private readonly pool: ObjectPool<ShellItem>;
  private readonly active: ShellItem[] = [];
  private enabled = true;

  constructor(effectsGroup: THREE.Group) {
    const geom = new THREE.CylinderGeometry(0.008, 0.008, 0.032, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.25,
      metalness: 0.85
    });

    this.pool = new ObjectPool<ShellItem>(
      () => {
        const mesh = new THREE.Mesh(geom, mat);
        mesh.visible = false;
        effectsGroup.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), remaining: 0 };
      },
      (item) => {
        item.mesh.visible = false;
        item.remaining = 0;
      },
      16,
      48
    );
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  spawnShell(origin: THREE.Vector3, rightDir: THREE.Vector3): void {
    if (!this.enabled) return;
    const item = this.pool.acquire();
    item.mesh.position.copy(origin);
    item.velocity
      .copy(rightDir)
      .multiplyScalar(1.8 + Math.random() * 0.8)
      .add(new THREE.Vector3(0, 1.2 + Math.random() * 0.6, 0));
    item.remaining = 1.2;
    item.mesh.visible = true;
    this.active.push(item);
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
      item.velocity.y -= 14.0 * dt;
      item.mesh.position.addScaledVector(item.velocity, dt);
      if (item.mesh.position.y < 0.02) {
        item.mesh.position.y = 0.02;
        item.velocity.y = Math.abs(item.velocity.y) * 0.3;
        item.velocity.x *= 0.6;
        item.velocity.z *= 0.6;
      }
      item.mesh.rotation.x += dt * 12;
      item.mesh.rotation.z += dt * 9;
    }
  }

  clear(): void {
    this.pool.releaseAll();
    this.active.length = 0;
  }
}
