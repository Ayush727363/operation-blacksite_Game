import * as THREE from 'three';

interface ExplosionEffectInstance {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  elapsed: number;
  duration: number;
  maxRadius: number;
}

/**
 * Manages grenade explosion fireballs, shockwave rings, and bomb detonation visuals.
 */
export class ParticleExplosionSystem {
  private readonly group: THREE.Group;
  private readonly active: ExplosionEffectInstance[] = [];

  constructor(effectsGroup: THREE.Group) {
    this.group = new THREE.Group();
    effectsGroup.add(this.group);
  }

  spawnExplosion(position: THREE.Vector3, maxRadius = 4.5, colorHex = 0xf97316): void {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat);
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.6, 0));
    this.group.add(mesh);

    const light = new THREE.PointLight(colorHex, 2.5, maxRadius * 3, 2);
    light.position.copy(mesh.position);
    this.group.add(light);

    this.active.push({
      mesh,
      light,
      elapsed: 0,
      duration: 0.42,
      maxRadius
    });
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ex = this.active[i];
      ex.elapsed += dt;
      if (ex.elapsed >= ex.duration) {
        this.group.remove(ex.mesh);
        this.group.remove(ex.light);
        this.active.splice(i, 1);
        continue;
      }
      const t = ex.elapsed / ex.duration;
      const scale = 1 + t * ex.maxRadius * 1.4;
      ex.mesh.scale.setScalar(scale);
      ex.mesh.material.opacity = (1 - t) * 0.85;
      ex.light.intensity = (1 - t) * 2.5;
    }
  }

  clear(): void {
    for (const ex of this.active) {
      this.group.remove(ex.mesh);
      this.group.remove(ex.light);
    }
    this.active.length = 0;
  }
}
