import * as THREE from 'three';
import { BotDifficultyProfile } from './BotDifficulty.ts';
import { WeaponInstance } from '../weapons/WeaponBase.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Handles bot aiming interpolation, human-like aim error, burst-fire cadence,
 * recoil compensation, and engagement range decisions.
 */
export class BotCombatController {
  private currentAimDir = new THREE.Vector3(0, 0, -1);
  private burstShotsFired = 0;
  private burstCooldown = 0;
  private aimJitterOffset = new THREE.Vector3();
  private jitterTimer = 0;
  private readonly rng: SeededRandom;

  constructor(rng = new SeededRandom(303)) {
    this.rng = rng;
  }

  setLookDirection(dir: THREE.Vector3): void {
    if (dir.lengthSq() > 1e-6) {
      this.currentAimDir.copy(dir).normalize();
    }
  }

  getLookDirection(): THREE.Vector3 {
    return this.currentAimDir.clone();
  }

  /**
   * Smoothly rotates bot aim toward target point with bounded angular speed
   * and difficulty-scaled aim error.
   */
  updateAimAndTrigger(
    dt: number,
    botEyePos: THREE.Vector3,
    targetFeetPos: THREE.Vector3,
    targetVisibleAndReacted: boolean,
    weapon: WeaponInstance,
    profile: BotDifficultyProfile
  ): { shouldFire: boolean; aimDirection: THREE.Vector3 } {
    if (this.burstCooldown > 0) {
      this.burstCooldown = Math.max(0, this.burstCooldown - dt);
    }

    // Refresh aim error jitter periodically
    this.jitterTimer -= dt;
    if (this.jitterTimer <= 0) {
      this.jitterTimer = 0.18;
      const errRad = THREE.MathUtils.degToRad(profile.aimErrorDegrees);
      const maxOffset = Math.tan(errRad);
      this.aimJitterOffset.set(
        this.rng.range(-maxOffset, maxOffset),
        this.rng.range(-maxOffset * 0.7, maxOffset * 0.7),
        this.rng.range(-maxOffset, maxOffset)
      );
    }

    // Choose aim height based on difficulty headshot preference
    const aimHeight = this.rng.next() < profile.headshotPreferenceRatio ? 1.56 : 1.15;
    const desiredPoint = targetFeetPos.clone().add(new THREE.Vector3(0, aimHeight, 0));
    const desiredDir = desiredPoint.sub(botEyePos).normalize();
    desiredDir.add(this.aimJitterOffset).normalize();

    // Smooth tracking interpolation
    const trackAlpha = Math.min(1, profile.trackingSpeedRadPerSec * dt);
    this.currentAimDir.lerp(desiredDir, trackAlpha).normalize();

    if (!targetVisibleAndReacted || !weapon.canFire()) {
      return { shouldFire: false, aimDirection: this.currentAimDir.clone() };
    }

    // Check alignment angle before pulling trigger
    const alignmentDot = this.currentAimDir.dot(desiredDir);
    if (alignmentDot < 0.94 || this.burstCooldown > 0) {
      return { shouldFire: false, aimDirection: this.currentAimDir.clone() };
    }

    this.burstShotsFired++;
    if (this.burstShotsFired >= profile.burstLengthShots) {
      this.burstShotsFired = 0;
      this.burstCooldown = profile.burstPauseSeconds;
    }

    return { shouldFire: true, aimDirection: this.currentAimDir.clone() };
  }

  reset(): void {
    this.burstShotsFired = 0;
    this.burstCooldown = 0;
    this.jitterTimer = 0;
  }
}
