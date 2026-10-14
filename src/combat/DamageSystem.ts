import { WeaponDefinition } from '../weapons/WeaponDefinitions.ts';
import { HitRegion } from './Hitboxes.ts';
import { PlayerHealth } from '../player/PlayerHealth.ts';

export interface DamageCalculationResult {
  rawDamage: number;
  healthDamage: number;
  armorDamage: number;
  headshot: boolean;
  fatal: boolean;
}

/**
 * Computes weapon hit damage incorporating base damage, distance falloff,
 * anatomical region multipliers (head, torso, limbs), and target armor mitigation.
 */
export class DamageSystem {
  static computeRawDamage(
    weapon: WeaponDefinition,
    distanceMeters: number,
    region: HitRegion
  ): number {
    if (distanceMeters > weapon.maxRange) {
      return 0;
    }

    let regionMultiplier = weapon.torsoMultiplier;
    if (region === 'head') {
      regionMultiplier = weapon.headMultiplier;
    } else if (region === 'limbs') {
      regionMultiplier = weapon.limbMultiplier;
    }

    // Distance falloff per 10 meters + steeper drop beyond effectiveRange
    const tensOfMeters = Math.max(0, distanceMeters / 10);
    let falloff = Math.pow(weapon.damageFalloffPer10m, tensOfMeters);
    if (distanceMeters > weapon.effectiveRange) {
      const excessTenMeters = (distanceMeters - weapon.effectiveRange) / 10;
      falloff *= Math.pow(weapon.damageFalloffPer10m * 0.9, excessTenMeters);
    }

    return Math.max(1, weapon.baseDamage * regionMultiplier * falloff);
  }

  static applyWeaponHit(
    weapon: WeaponDefinition,
    distanceMeters: number,
    region: HitRegion,
    targetHealth: PlayerHealth
  ): DamageCalculationResult {
    if (!targetHealth.isAlive()) {
      return {
        rawDamage: 0,
        healthDamage: 0,
        armorDamage: 0,
        headshot: region === 'head',
        fatal: false
      };
    }

    const rawDamage = DamageSystem.computeRawDamage(weapon, distanceMeters, region);
    const headshot = region === 'head';
    const applied = targetHealth.applyDamage(rawDamage, weapon.armorPenetration, headshot);

    return {
      rawDamage,
      healthDamage: applied.healthDamage,
      armorDamage: applied.armorDamage,
      headshot,
      fatal: applied.fatal
    };
  }

  /**
   * Computes fragmentation grenade blast damage with distance falloff and line-of-sight occlusion.
   */
  static computeExplosionDamage(
    distanceMeters: number,
    maxRadius: number,
    maxDamage: number,
    hasClearLineOfSight: boolean
  ): number {
    if (distanceMeters > maxRadius || !hasClearLineOfSight) {
      return 0;
    }
    const ratio = 1 - distanceMeters / maxRadius;
    return Math.max(1, Math.round(maxDamage * Math.pow(ratio, 1.35)));
  }
}
