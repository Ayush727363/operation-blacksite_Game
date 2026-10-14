import * as THREE from 'three';
import { WeaponDefinition } from './WeaponDefinitions.ts';
import { SeededRandom } from '../core/Random.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { HitboxTarget, HitboxSystem } from '../combat/Hitboxes.ts';

export interface ShooterMovementContext {
  horizontalSpeed: number;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  ads: boolean;
  accumulatedSpreadDeg: number;
}

export interface PelletRayResult {
  direction: THREE.Vector3;
  endPoint: THREE.Vector3;
  distance: number;
  hitType: 'none' | 'world' | 'target';
  hitNormal: THREE.Vector3;
  targetId?: string;
  region?: 'head' | 'torso' | 'limbs';
  surfaceType?: 'concrete' | 'metal' | 'wood' | 'dirt';
}

/**
 * Computes dynamic accuracy spread and executes hitscan raycasts against both
 * world colliders and character hitboxes (checking wall occlusion strictly).
 */
export class BallisticsSystem {
  private readonly rng: SeededRandom;

  constructor(rng = new SeededRandom(101)) {
    this.rng = rng;
  }

  /**
   * Computes current spread cone half-angle in degrees based on stance,
   * movement speed, sprinting, airborne state, ADS, and sustained-fire bloom.
   */
  computeSpreadDegrees(weapon: WeaponDefinition, ctx: ShooterMovementContext): number {
    if (weapon.category === 'melee') return 0;

    let spread = ctx.ads ? weapon.adsSpreadDeg : weapon.baseSpreadDeg;
    spread += ctx.accumulatedSpreadDeg;

    const speedRatio = THREE.MathUtils.clamp(ctx.horizontalSpeed / 5.2, 0, 1.5);
    if (speedRatio > 0.05) {
      spread += weapon.moveSpreadPenaltyDeg * speedRatio;
    }
    if (ctx.sprinting) {
      spread += weapon.sprintSpreadPenaltyDeg;
    }
    if (!ctx.grounded) {
      spread += weapon.airSpreadPenaltyDeg;
    }
    if (ctx.crouching && ctx.grounded) {
      spread *= weapon.crouchSpreadMultiplier;
    }

    return Math.max(0.01, Math.min(18.0, spread));
  }

  /**
   * Perturbs the base aim direction vector by the calculated spread angle in degrees.
   */
  sampleShotDirection(
    baseDirection: THREE.Vector3,
    spreadDegrees: number,
    recoilPitchDeg = 0,
    recoilYawDeg = 0
  ): THREE.Vector3 {
    const dir = baseDirection.clone().normalize();
    const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const orthoUp = new THREE.Vector3().crossVectors(right, dir).normalize();

    const spreadRad = THREE.MathUtils.degToRad(spreadDegrees);
    const angle = this.rng.next() * Math.PI * 2;
    const radius = Math.sqrt(this.rng.next()) * Math.tan(spreadRad);

    // Apply any uncompensated recoil offset + random spread cone
    const recoilPitchRad = THREE.MathUtils.degToRad(recoilPitchDeg * 0.35);
    const recoilYawRad = THREE.MathUtils.degToRad(recoilYawDeg * 0.35);

    const offsetRight = Math.cos(angle) * radius + Math.tan(recoilYawRad);
    const offsetUp = Math.sin(angle) * radius + Math.tan(recoilPitchRad);

    return dir
      .addScaledVector(right, offsetRight)
      .addScaledVector(orthoUp, offsetUp)
      .normalize();
  }

  /**
   * Executes a full weapon discharge (1 ray for rifles/pistols/snipers/SMGs,
   * multiple pellet rays for shotguns) against world geometry and hitbox targets.
   * Ensures solid walls strictly block bullets from hitting targets behind cover.
   */
  fireWeaponRays(
    origin: THREE.Vector3,
    aimDirection: THREE.Vector3,
    weapon: WeaponDefinition,
    ctx: ShooterMovementContext,
    collisionWorld: CollisionWorld,
    targets: HitboxTarget[],
    shooterId: string
  ): { spreadDeg: number; rays: PelletRayResult[] } {
    const spreadDeg = this.computeSpreadDegrees(weapon, ctx);
    const rays: PelletRayResult[] = [];
    const pelletCount = Math.max(1, weapon.pellets);

    for (let i = 0; i < pelletCount; i++) {
      const shotDir = this.sampleShotDirection(aimDirection, spreadDeg);
      const worldHit = collisionWorld.raycastWorld(origin, shotDir, weapon.maxRange);
      const maxTargetDist = worldHit.hit ? worldHit.distance : weapon.maxRange;

      const targetHit = HitboxSystem.raycastTargets(
        origin,
        shotDir,
        maxTargetDist,
        targets,
        shooterId
      );

      if (targetHit) {
        rays.push({
          direction: shotDir,
          endPoint: targetHit.point,
          distance: targetHit.distance,
          hitType: 'target',
          hitNormal: shotDir.clone().negate(),
          targetId: targetHit.targetId,
          region: targetHit.region
        });
      } else if (worldHit.hit) {
        rays.push({
          direction: shotDir,
          endPoint: worldHit.point,
          distance: worldHit.distance,
          hitType: 'world',
          hitNormal: worldHit.normal,
          surfaceType: worldHit.collider?.surfaceType ?? 'concrete'
        });
      } else {
        rays.push({
          direction: shotDir,
          endPoint: origin.clone().addScaledVector(shotDir, weapon.maxRange),
          distance: weapon.maxRange,
          hitType: 'none',
          hitNormal: shotDir.clone().negate()
        });
      }
    }

    return { spreadDeg, rays };
  }
}
