import * as THREE from 'three';
import { PlayerMovement } from './PlayerMovement.ts';
import { PlayerHealth } from './PlayerHealth.ts';
import { CameraController } from './CameraController.ts';
import { WeaponManager } from '../weapons/WeaponManager.ts';
import { GrenadeInventory } from '../weapons/Grenades.ts';
import { InputManager } from '../app/InputManager.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { ShooterMovementContext } from '../weapons/Ballistics.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Integrates first-person player movement, health/armor, camera aiming,
 * weapon handling, and grenade inventory into a cohesive player entity.
 */
export class PlayerController {
  readonly id = 'player';
  name = 'OPERATIVE-1';
  team: 'alpha' | 'bravo' | 'ffa' = 'alpha';

  readonly movement = new PlayerMovement();
  readonly health = new PlayerHealth(100, 100, true);
  readonly cameraCtrl = new CameraController();
  readonly weapons: WeaponManager;
  readonly grenades = new GrenadeInventory();

  constructor(camera: THREE.PerspectiveCamera, rng = new SeededRandom(77)) {
    this.weapons = new WeaponManager(rng, true);
    camera.add(this.weapons.viewmodelGroup);
  }

  spawnAt(position: THREE.Vector3, facingYaw: number, resetWeapons = false): void {
    this.movement.reset(position);
    this.health.reset(true, true);
    this.cameraCtrl.setOrientation(facingYaw, 0);
    if (resetWeapons) {
      this.weapons.resetDefaultLoadout('m4_sentinel', 'p250_enforcer');
      this.grenades.resetDefault();
    } else {
      this.weapons.refillAllWeapons();
      this.grenades.resetDefault();
    }
  }

  getShooterMovementContext(): ShooterMovementContext {
    const currentWeapon = this.weapons.getCurrentWeapon();
    return {
      horizontalSpeed: this.movement.getHorizontalSpeed(),
      grounded: this.movement.isGrounded(),
      crouching: this.movement.isCrouching(),
      sprinting: this.movement.isSprinting(),
      ads: this.weapons.getAds(),
      accumulatedSpreadDeg: currentWeapon.getAccumulatedSpreadDeg()
    };
  }

  update(
    dt: number,
    input: InputManager,
    camera: THREE.PerspectiveCamera,
    collisionWorld: CollisionWorld,
    allowMovementAndCombat: boolean
  ): {
    stepped: boolean;
    landed: boolean;
    jumped: boolean;
    surface: 'concrete' | 'metal' | 'wood' | 'dirt';
    wantsFire: boolean;
    wantsThrowGrenade: boolean;
    wantsInteract: boolean;
    reloadStarted: boolean;
    reloadCompleted: boolean;
    weaponSwitched: boolean;
  } {
    this.grenades.update(dt);

    if (!this.health.isAlive() || !allowMovementAndCombat) {
      const eyePos = this.movement.getEyePosition();
      if (!this.health.isAlive()) {
        eyePos.y = this.movement.position.y + 0.35; // Fallen camera height
      }
      this.cameraCtrl.updateCamera(dt, camera, eyePos, 0, true, 1.0);
      return {
        stepped: false,
        landed: false,
        jumped: false,
        surface: 'concrete',
        wantsFire: false,
        wantsThrowGrenade: false,
        wantsInteract: false,
        reloadStarted: false,
        reloadCompleted: false,
        weaponSwitched: false
      };
    }

    const activeWeapon = this.weapons.getCurrentWeapon();
    const isAds = input.isMouseButtonDown(2);
    this.weapons.setAds(isAds);

    const adsSensMult = this.weapons.getAds() ? activeWeapon.def.adsFovMultiplier : 1.0;
    const { dx, dy } = input.consumeMouseDelta();
    this.cameraCtrl.applyMouseDelta(dx, dy, adsSensMult);

    // Weapon slot switching (1, 2, 3, or mouse wheel)
    let weaponSwitched = false;
    if (input.wasActionJustPressed('slot1')) {
      weaponSwitched = this.weapons.switchSlot(1);
    } else if (input.wasActionJustPressed('slot2')) {
      weaponSwitched = this.weapons.switchSlot(2);
    } else if (input.wasActionJustPressed('slot3')) {
      weaponSwitched = this.weapons.switchSlot(3);
    } else {
      const wheel = input.consumeWheelDelta();
      if (wheel !== 0) {
        this.weapons.cycleSlot(wheel > 0 ? 1 : -1);
        weaponSwitched = true;
      }
    }

    if (input.wasActionJustPressed('cycleGrenade') || input.wasActionJustPressed('slot4')) {
      this.grenades.cycleSelected();
    }

    // Reload handling
    let reloadStarted = false;
    if (input.wasActionJustPressed('reload')) {
      reloadStarted = this.weapons.getCurrentWeapon().startReload();
    }

    // Movement vector
    const forward = (input.isActionActive('moveForward') ? 1 : 0) - (input.isActionActive('moveBackward') ? 1 : 0);
    const right = (input.isActionActive('moveRight') ? 1 : 0) - (input.isActionActive('moveLeft') ? 1 : 0);
    const crouch = input.isActionActive('crouch') || input.isActionActive('crouchAlt');
    const sprint = input.isActionActive('sprint') && !this.weapons.getAds();
    const jump = input.wasActionJustPressed('jump');

    const moveRes = this.movement.update(
      dt,
      {
        forward,
        right,
        sprint,
        crouch,
        jump,
        yaw: this.cameraCtrl.getYaw(),
        weaponSpeedMultiplier: this.weapons.getCurrentWeapon().def.movementSpeedMultiplier
      },
      collisionWorld
    );

    // Update weapon timers & recoil
    const triggerDown = input.isMouseButtonDown(0);
    this.weapons.getCurrentWeapon().setTriggerReleased(!triggerDown);

    // Auto-reload if magazine is empty and reserve ammo exists
    const curWep = this.weapons.getCurrentWeapon();
    if (curWep.def.category !== 'melee' && curWep.magazineAmmo === 0 && curWep.reserveAmmo > 0 && !curWep.reloader.isReloading()) {
      reloadStarted = curWep.startReload() || reloadStarted;
    }

    const wepUpdate = this.weapons.update(dt, dx, dy, 0, 0);
    this.cameraCtrl.setRecoilOffsetDeg(
      this.weapons.recoil.getPitchDeg(),
      this.weapons.recoil.getYawDeg()
    );

    const adsFovMult = this.weapons.getAds() ? curWep.def.adsFovMultiplier : 1.0;
    this.cameraCtrl.updateCamera(
      dt,
      camera,
      this.movement.getEyePosition(),
      this.movement.getHorizontalSpeed(),
      this.movement.isGrounded(),
      adsFovMult
    );

    const wantsFire = triggerDown && !this.movement.isSprinting();
    const wantsThrowGrenade = input.wasActionJustPressed('throwGrenade');
    const wantsInteract = input.isActionActive('interact');

    return {
      ...moveRes,
      wantsFire,
      wantsThrowGrenade,
      wantsInteract,
      reloadStarted,
      reloadCompleted: wepUpdate.reloadCompleted,
      weaponSwitched
    };
  }
}
