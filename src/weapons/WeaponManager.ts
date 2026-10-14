import * as THREE from 'three';
import { WEAPON_DEFINITIONS, WeaponDefinition, WeaponSlot } from './WeaponDefinitions.ts';
import { WeaponInstance } from './WeaponBase.ts';
import { RecoilController } from './RecoilController.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Manages a player's or bot's weapon inventory (Primary Slot 1, Secondary Slot 2, Melee Slot 3),
 * active weapon switching, procedural 3D first-person viewmodel rendering & animation,
 * and recoil integration.
 */
export class WeaponManager {
  private slots = new Map<WeaponSlot, WeaponInstance>();
  private activeSlot: WeaponSlot = 1;
  private isAds = false;
  readonly recoil: RecoilController;
  readonly viewmodelGroup = new THREE.Group();

  private gunMeshGroup = new THREE.Group();
  private muzzlePoint = new THREE.Vector3(0.22, -0.18, -0.65);
  private fireAnimKick = 0;
  private swayX = 0;
  private swayY = 0;

  constructor(rng = new SeededRandom(77), buildViewmodel = true) {
    this.recoil = new RecoilController(rng);
    this.resetDefaultLoadout();
    if (buildViewmodel) {
      this.rebuildViewmodelMesh();
    }
  }

  resetDefaultLoadout(primaryId = 'm4_sentinel', secondaryId = 'p250_enforcer'): void {
    this.slots.clear();
    if (WEAPON_DEFINITIONS[primaryId]) {
      this.slots.set(1, new WeaponInstance(WEAPON_DEFINITIONS[primaryId]));
    }
    if (WEAPON_DEFINITIONS[secondaryId]) {
      this.slots.set(2, new WeaponInstance(WEAPON_DEFINITIONS[secondaryId]));
    }
    this.slots.set(3, new WeaponInstance(WEAPON_DEFINITIONS.combat_knife));
    this.activeSlot = this.slots.has(1) ? 1 : 2;
    this.isAds = false;
    this.recoil.reset();
    this.rebuildViewmodelMesh();
  }

  equipWeaponById(weaponId: string): WeaponInstance | null {
    const def = WEAPON_DEFINITIONS[weaponId];
    if (!def) return null;
    const inst = new WeaponInstance(def);
    this.slots.set(def.slot, inst);
    this.switchSlot(def.slot);
    return inst;
  }

  switchSlot(slot: WeaponSlot): boolean {
    const target = this.slots.get(slot);
    if (!target) return false;
    if (this.activeSlot === slot) return false;

    const current = this.getCurrentWeapon();
    current.cancelReload();
    this.activeSlot = slot;
    this.isAds = false;
    this.recoil.reset();
    target.onEquip();
    this.rebuildViewmodelMesh();
    return true;
  }

  cycleSlot(direction: 1 | -1): WeaponSlot {
    const available: WeaponSlot[] = ([1, 2, 3] as WeaponSlot[]).filter((s) => this.slots.has(s));
    const idx = available.indexOf(this.activeSlot);
    const nextIdx = (idx + direction + available.length) % available.length;
    this.switchSlot(available[nextIdx]);
    return this.activeSlot;
  }

  getCurrentWeapon(): WeaponInstance {
    return (
      this.slots.get(this.activeSlot) ||
      this.slots.get(2) ||
      this.slots.get(3)!
    );
  }

  getWeaponInSlot(slot: WeaponSlot): WeaponInstance | undefined {
    return this.slots.get(slot);
  }

  getActiveSlot(): WeaponSlot {
    return this.activeSlot;
  }

  setAds(ads: boolean): void {
    const w = this.getCurrentWeapon();
    if (w.def.category === 'melee' || w.reloader.isReloading()) {
      this.isAds = false;
      return;
    }
    this.isAds = ads;
  }

  getAds(): boolean {
    return this.isAds;
  }

  refillAllWeapons(): void {
    for (const inst of this.slots.values()) {
      inst.refillAmmo();
    }
    this.recoil.reset();
  }

  notifyShotFired(): { pitchDeg: number; yawDeg: number } {
    const w = this.getCurrentWeapon();
    this.fireAnimKick = 1.0;
    return this.recoil.applyShot(w.def, this.isAds);
  }

  update(
    dt: number,
    mouseDeltaX = 0,
    mouseDeltaY = 0,
    bobOffsetX = 0,
    bobOffsetY = 0
  ): { reloadCompleted: boolean } {
    const w = this.getCurrentWeapon();
    const res = w.update(dt);
    if (w.reloader.isReloading()) {
      this.isAds = false;
    }
    this.recoil.update(dt, w.def.recoilRecoveryRate);

    // Procedural viewmodel animation (idle breathing, sway, ADS centering, reload dip, recoil kick)
    this.fireAnimKick = THREE.MathUtils.lerp(this.fireAnimKick, 0, Math.min(1, dt * 16));
    this.swayX = THREE.MathUtils.lerp(this.swayX, -mouseDeltaX * 0.0005, Math.min(1, dt * 10));
    this.swayY = THREE.MathUtils.lerp(this.swayY, mouseDeltaY * 0.0005, Math.min(1, dt * 10));

    const targetX = this.isAds ? 0.0 : 0.22;
    const targetY = this.isAds ? -0.15 : -0.22;
    const targetZ = this.isAds ? -0.34 : -0.44;

    const reloadDip = w.reloader.isReloading()
      ? Math.sin(w.reloader.getProgress() * Math.PI) * -0.22
      : 0;
    const drawDip = (1 - w.getDrawProgress()) * -0.25;

    this.gunMeshGroup.position.set(
      THREE.MathUtils.lerp(this.gunMeshGroup.position.x, targetX + this.swayX + bobOffsetX, Math.min(1, dt * 18)),
      THREE.MathUtils.lerp(this.gunMeshGroup.position.y, targetY + this.swayY + bobOffsetY + reloadDip + drawDip, Math.min(1, dt * 18)),
      targetZ + this.fireAnimKick * 0.065
    );

    const reloadRoll = w.reloader.isReloading()
      ? Math.sin(w.reloader.getProgress() * Math.PI) * 0.45
      : 0;
    this.gunMeshGroup.rotation.set(
      this.fireAnimKick * 0.14 + reloadDip * 0.8,
      this.swayX * 1.5,
      reloadRoll
    );

    return res;
  }

  getMuzzleWorldPosition(camera: THREE.PerspectiveCamera, target = new THREE.Vector3()): THREE.Vector3 {
    camera.updateMatrixWorld();
    return target.copy(this.muzzlePoint).applyMatrix4(camera.matrixWorld);
  }

  private rebuildViewmodelMesh(): void {
    this.viewmodelGroup.clear();
    this.gunMeshGroup = new THREE.Group();
    const def: WeaponDefinition = this.getCurrentWeapon().def;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.viewmodelColor,
      roughness: 0.42,
      metalness: 0.68
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: def.viewmodelAccentColor,
      roughness: 0.5,
      metalness: 0.45
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.85
    });

    if (def.category === 'melee') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.04), bodyMat);
      handle.rotation.x = -0.35;
      this.gunMeshGroup.add(handle);

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.22), accentMat);
      blade.position.set(0, 0.05, -0.11);
      this.gunMeshGroup.add(blade);
    } else {
      // Receiver body
      const receiverLen = def.barrelLength * 0.58;
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.095, receiverLen), bodyMat);
      this.gunMeshGroup.add(receiver);

      // Barrel
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, def.barrelLength * 0.65, 8),
        darkMetal
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.022, -def.barrelLength * 0.52);
      this.gunMeshGroup.add(barrel);

      // Handguard / rail accent
      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.056, 0.065, def.barrelLength * 0.42),
        accentMat
      );
      guard.position.set(0, 0.01, -def.barrelLength * 0.32);
      this.gunMeshGroup.add(guard);

      // Magazine (for rifles, SMGs, pistols, snipers)
      if (def.category !== 'shotgun') {
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.065), darkMetal);
        mag.position.set(0, -0.09, -0.04);
        mag.rotation.x = 0.18;
        this.gunMeshGroup.add(mag);
      }

      // Optic / Scope for Sniper & DMR
      if (def.category === 'sniper') {
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.24, 10), darkMetal);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.075, -0.05);
        this.gunMeshGroup.add(scope);
      } else {
        // Front & rear iron sights
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.024, 0.02), accentMat);
        rearSight.position.set(0, 0.058, receiverLen * 0.38);
        this.gunMeshGroup.add(rearSight);

        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.015), accentMat);
        frontSight.position.set(0, 0.058, -def.barrelLength * 0.55);
        this.gunMeshGroup.add(frontSight);
      }
    }

    this.gunMeshGroup.position.set(0.22, -0.22, -0.44);
    this.viewmodelGroup.add(this.gunMeshGroup);
  }
}
