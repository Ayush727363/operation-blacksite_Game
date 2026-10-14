import * as THREE from 'three';

/**
 * Pooled / reusable muzzle flash light and additive sprite burst at the weapon barrel.
 */
export class MuzzleFlashEffect {
  private readonly flashMesh: THREE.Mesh;
  private readonly flashLight: THREE.PointLight;
  private timer = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), mat);
    this.flashMesh.position.set(0.22, -0.17, -0.78);
    this.flashMesh.visible = false;
    camera.add(this.flashMesh);

    this.flashLight = new THREE.PointLight(0xffb703, 0, 8, 2);
    this.flashLight.position.set(0.22, -0.17, -0.78);
    camera.add(this.flashLight);
  }

  trigger(isAds = false): void {
    this.timer = 0.048;
    this.flashMesh.position.x = isAds ? 0.0 : 0.22;
    this.flashMesh.position.y = isAds ? -0.12 : -0.17;
    this.flashMesh.scale.setScalar(0.85 + Math.random() * 0.45);
    this.flashMesh.visible = true;
    this.flashLight.intensity = 1.6;
  }

  update(dt: number): void {
    if (this.timer <= 0) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.flashMesh.visible = false;
      this.flashLight.intensity = 0;
    }
  }

  reset(): void {
    this.timer = 0;
    this.flashMesh.visible = false;
    this.flashLight.intensity = 0;
  }
}
