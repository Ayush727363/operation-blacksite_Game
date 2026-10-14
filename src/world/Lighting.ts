import * as THREE from 'three';

/**
 * Configures Mediterranean coastal sunlight, sky-ground hemisphere fill light,
 * and indoor facility practical point lights.
 */
export class LightingSystem {
  readonly sunLight: THREE.DirectionalLight;
  readonly hemiLight: THREE.HemisphereLight;
  readonly ambientLight: THREE.AmbientLight;
  readonly hangarLight: THREE.PointLight;
  readonly depotLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x4b5563, 0.72);
    this.hemiLight.position.set(0, 45, 0);
    scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.25);
    scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 1.25);
    this.sunLight.position.set(38, 62, 28);
    this.sunLight.castShadow = true;
    scene.add(this.sunLight);

    // Indoor Hangar A warm industrial lamp
    this.hangarLight = new THREE.PointLight(0xffb74d, 1.3, 28, 2);
    this.hangarLight.position.set(-34, 6.2, -10);
    scene.add(this.hangarLight);

    // Indoor East Depot cool tactical lamp
    this.depotLight = new THREE.PointLight(0x7dd3fc, 1.2, 26, 2);
    this.depotLight.position.set(34, 5.8, -8);
    scene.add(this.depotLight);
  }
}
