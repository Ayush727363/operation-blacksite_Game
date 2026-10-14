import { describe, it, expect } from '../src/testing/TestFixtures.ts';
import { WEAPON_DEFINITIONS } from '../src/weapons/WeaponDefinitions.ts';
import { DamageSystem } from '../src/combat/DamageSystem.ts';
import { PlayerHealth } from '../src/player/PlayerHealth.ts';

describe('Damage, Hit Regions, Armor & Grenades (damage.test.ts)', () => {
  it('applies higher damage on headshots than torso hits and lower damage on limb hits', () => {
    const m4 = WEAPON_DEFINITIONS.m4_sentinel;
    const headDmg = DamageSystem.computeRawDamage(m4, 15, 'head');
    const torsoDmg = DamageSystem.computeRawDamage(m4, 15, 'torso');
    const limbDmg = DamageSystem.computeRawDamage(m4, 15, 'limbs');

    expect(headDmg).toBeGreaterThan(torsoDmg * 3);
    expect(torsoDmg).toBeGreaterThan(limbDmg);
  });

  it('reduces weapon damage with increasing distance falloff', () => {
    const smg = WEAPON_DEFINITIONS.mp9_tempest;
    const closeDmg = DamageSystem.computeRawDamage(smg, 5, 'torso');
    const midDmg = DamageSystem.computeRawDamage(smg, 35, 'torso');
    const farDmg = DamageSystem.computeRawDamage(smg, 80, 'torso');

    expect(closeDmg).toBeGreaterThan(midDmg);
    expect(midDmg).toBeGreaterThan(farDmg);
  });

  it('mitigates health damage when target has Kevlar and helmet armor', () => {
    const ak = WEAPON_DEFINITIONS.ak_vanguard;
    const unarmored = new PlayerHealth(100, 0, false);
    const armored = new PlayerHealth(100, 100, true);

    const resUnarmored = DamageSystem.applyWeaponHit(ak, 10, 'torso', unarmored);
    const resArmored = DamageSystem.applyWeaponHit(ak, 10, 'torso', armored);

    expect(resUnarmored.healthDamage).toBeGreaterThan(resArmored.healthDamage);
    expect(resArmored.armorDamage).toBeGreaterThan(0);
    expect(armored.getArmor()).toBeLessThan(100);
  });

  it('computes fragmentation grenade blast falloff and blocks blast damage behind solid cover', () => {
    const directClose = DamageSystem.computeExplosionDamage(1.5, 9.5, 98, true);
    const directEdge = DamageSystem.computeExplosionDamage(8.0, 9.5, 98, true);
    const blockedByCover = DamageSystem.computeExplosionDamage(2.0, 9.5, 98, false);
    const outOfRange = DamageSystem.computeExplosionDamage(12.0, 9.5, 98, true);

    expect(directClose).toBeGreaterThan(70);
    expect(directClose).toBeGreaterThan(directEdge);
    expect(blockedByCover).toBe(0);
    expect(outOfRange).toBe(0);
  });
});
