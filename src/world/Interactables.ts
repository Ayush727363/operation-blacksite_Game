import * as THREE from 'three';
import { BOMB_SITES, BombSiteDefinition } from './LevelData.ts';

/**
 * Handles interactive world zones (Bomb Site A & B boundaries, planted C4 model,
 * blinking LED beacon, and proximity checks for planting/defusing).
 */
export class InteractablesManager {
  private readonly group: THREE.Group;
  private readonly c4Mesh: THREE.Group;
  private readonly c4BeaconMat: THREE.MeshStandardMaterial;
  private readonly c4Light: THREE.PointLight;
  private pulseTimer = 0;
  private bombActive = false;

  constructor(parentGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.group.name = 'Interactables';
    parentGroup.add(this.group);

    this.c4BeaconMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.0,
      roughness: 0.2
    });

    this.c4Mesh = this.buildC4Model();
    this.c4Mesh.visible = false;
    this.group.add(this.c4Mesh);

    this.c4Light = new THREE.PointLight(0xff2222, 0, 12, 2);
    this.c4Mesh.add(this.c4Light);
  }

  private buildC4Model(): THREE.Group {
    const g = new THREE.Group();
    const packMat = new THREE.MeshStandardMaterial({ color: 0x3f4a3c, roughness: 0.7, metalness: 0.2 });
    const keypadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.6 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.28), packMat);
    body.position.y = 0.07;
    g.add(body);

    const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.14), keypadMat);
    keypad.position.set(0.05, 0.15, 0);
    g.add(keypad);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), this.c4BeaconMat);
    led.position.set(-0.1, 0.16, 0);
    g.add(led);

    return g;
  }

  getBombSiteAtPosition(pos: THREE.Vector3): BombSiteDefinition | null {
    for (const site of [BOMB_SITES.A, BOMB_SITES.B]) {
      const dx = pos.x - site.center.x;
      const dz = pos.z - site.center.z;
      if (Math.hypot(dx, dz) <= site.radius && Math.abs(pos.y - site.center.y) < 2.2) {
        return site;
      }
    }
    return null;
  }

  showPlantedBomb(position: THREE.Vector3): void {
    this.c4Mesh.position.copy(position);
    this.c4Mesh.position.y = Math.max(0, position.y);
    this.c4Mesh.visible = true;
    this.bombActive = true;
    this.pulseTimer = 0;
  }

  hidePlantedBomb(): void {
    this.c4Mesh.visible = false;
    this.bombActive = false;
    this.c4Light.intensity = 0;
  }

  update(dt: number, remainingFuseRatio = 1.0): void {
    if (!this.bombActive) return;
    const freq = THREE.MathUtils.lerp(14.0, 2.5, THREE.MathUtils.clamp(remainingFuseRatio, 0, 1));
    this.pulseTimer += dt * freq;
    const blink = Math.sin(this.pulseTimer * Math.PI) > 0 ? 1.0 : 0.08;
    this.c4BeaconMat.emissiveIntensity = blink * 1.4;
    this.c4Light.intensity = blink * 1.8;
  }
}
