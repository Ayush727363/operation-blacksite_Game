import { WeaponDefinition } from './WeaponDefinitions.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Tracks per-weapon recoil accumulation, spray pattern progression,
 * and smooth recovery when firing stops.
 */
export class RecoilController {
  private pitchDeg = 0;
  private yawDeg = 0;
  private shotIndex = 0;
  private timeSinceLastShot = 999;
  private readonly rng: SeededRandom;

  constructor(rng = new SeededRandom(42)) {
    this.rng = rng;
  }

  applyShot(weapon: WeaponDefinition, isAds = false): { pitchDeg: number; yawDeg: number } {
    const pattern = weapon.recoilPattern;
    const step = pattern.length > 0
      ? pattern[Math.min(this.shotIndex, pattern.length - 1)]
      : { pitch: weapon.recoilPitchPerShotDeg, yaw: 0 };

    const adsMult = isAds ? 0.78 : 1.0;
    const randomYaw = this.rng.range(-weapon.recoilYawVarianceDeg, weapon.recoilYawVarianceDeg);

    this.pitchDeg = Math.min(18.0, this.pitchDeg + step.pitch * adsMult);
    this.yawDeg = Math.max(-10.0, Math.min(10.0, this.yawDeg + (step.yaw + randomYaw) * adsMult));

    this.shotIndex++;
    this.timeSinceLastShot = 0;

    return { pitchDeg: this.pitchDeg, yawDeg: this.yawDeg };
  }

  update(dt: number, recoveryRateDegPerSec: number): void {
    this.timeSinceLastShot += dt;
    if (this.timeSinceLastShot > 0.08) {
      const recover = recoveryRateDegPerSec * dt;
      if (Math.abs(this.pitchDeg) <= recover) {
        this.pitchDeg = 0;
      } else {
        this.pitchDeg -= Math.sign(this.pitchDeg) * recover;
      }

      if (Math.abs(this.yawDeg) <= recover) {
        this.yawDeg = 0;
      } else {
        this.yawDeg -= Math.sign(this.yawDeg) * recover;
      }

      if (this.pitchDeg === 0 && this.yawDeg === 0) {
        this.shotIndex = 0;
      }
    }
  }

  getPitchDeg(): number {
    return this.pitchDeg;
  }

  getYawDeg(): number {
    return this.yawDeg;
  }

  getShotIndex(): number {
    return this.shotIndex;
  }

  reset(): void {
    this.pitchDeg = 0;
    this.yawDeg = 0;
    this.shotIndex = 0;
    this.timeSinceLastShot = 999;
  }
}
