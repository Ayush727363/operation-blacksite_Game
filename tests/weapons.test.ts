import { describe, it, expect, createDeterministicRng } from '../src/testing/TestFixtures.ts';
import { WEAPON_DEFINITIONS, WEAPON_LIST } from '../src/weapons/WeaponDefinitions.ts';
import { WeaponInstance } from '../src/weapons/WeaponBase.ts';
import { WeaponManager } from '../src/weapons/WeaponManager.ts';

describe('Weapon Roster & Mechanics (weapons.test.ts)', () => {
  it('defines 12 distinct weapons across all 6 tactical categories', () => {
    expect(WEAPON_LIST.length).toBe(12);
    const categories = new Set(WEAPON_LIST.map((w) => w.category));
    expect(categories.has('rifle')).toBe(true);
    expect(categories.has('smg')).toBe(true);
    expect(categories.has('shotgun')).toBe(true);
    expect(categories.has('sniper')).toBe(true);
    expect(categories.has('pistol')).toBe(true);
    expect(categories.has('melee')).toBe(true);

    // Ensure distinct recoil, spread, damage, and reload characteristics across at least 5 weapons
    const ak = WEAPON_DEFINITIONS.ak_vanguard;
    const m4 = WEAPON_DEFINITIONS.m4_sentinel;
    const mp9 = WEAPON_DEFINITIONS.mp9_tempest;
    const nova = WEAPON_DEFINITIONS.nova_breacher;
    const awm = WEAPON_DEFINITIONS.awm_titan;

    expect(ak.baseDamage).toBeGreaterThan(m4.baseDamage);
    expect(ak.recoilPitchPerShotDeg).toBeGreaterThan(m4.recoilPitchPerShotDeg);
    expect(mp9.rpm).toBeGreaterThan(ak.rpm);
    expect(nova.pellets).toBe(8);
    expect(awm.baseDamage).toBeGreaterThan(100);
    expect(awm.adsSpreadDeg).toBeLessThan(ak.adsSpreadDeg);
  });

  it('enforces firing cadence (RPM) and prevents firing faster than configured rate', () => {
    const inst = new WeaponInstance(WEAPON_DEFINITIONS.ak_vanguard); // 600 RPM = 0.1s per shot
    expect(inst.canFire()).toBe(true);
    expect(inst.consumeShot()).toBe(true);
    expect(inst.magazineAmmo).toBe(29);

    // Immediate second shot must be blocked by fire cooldown
    expect(inst.canFire()).toBe(false);
    expect(inst.consumeShot()).toBe(false);

    // Advance 0.05s -> still on cooldown
    inst.update(0.05);
    expect(inst.canFire()).toBe(false);

    // Advance another 0.06s (total 0.11s >= 0.10s) -> ready to fire
    inst.update(0.06);
    expect(inst.canFire()).toBe(true);
    expect(inst.consumeShot()).toBe(true);
    expect(inst.magazineAmmo).toBe(28);
  });

  it('enforces semi-automatic trigger release between shots', () => {
    const deagle = new WeaponInstance(WEAPON_DEFINITIONS.deagle_judge);
    expect(deagle.consumeShot()).toBe(true);
    deagle.update(1.0); // Cooldown expired, but trigger not released
    expect(deagle.canFire()).toBe(false);

    deagle.setTriggerReleased(true);
    expect(deagle.canFire()).toBe(true);
    expect(deagle.consumeShot()).toBe(true);
  });

  it('depletes magazine, blocks firing when empty, and conserves total ammunition on reload', () => {
    const awm = new WeaponInstance(WEAPON_DEFINITIONS.awm_titan); // 5 mag, 20 reserve
    for (let i = 0; i < 5; i++) {
      awm.setTriggerReleased(true);
      expect(awm.consumeShot()).toBe(true);
      awm.update(2.0);
    }
    expect(awm.magazineAmmo).toBe(0);
    awm.setTriggerReleased(true);
    expect(awm.canFire()).toBe(false);

    // Start reload (duration 3.4s)
    expect(awm.startReload()).toBe(true);
    expect(awm.reloader.isReloading()).toBe(true);
    expect(awm.canFire()).toBe(false);

    // Halfway through reload: ammo must NOT be generated early
    awm.update(1.7);
    expect(awm.magazineAmmo).toBe(0);
    expect(awm.reserveAmmo).toBe(20);

    // Complete reload
    const res = awm.update(1.8);
    expect(res.reloadCompleted).toBe(true);
    expect(awm.magazineAmmo).toBe(5);
    expect(awm.reserveAmmo).toBe(15);
  });

  it('cancels active reload cleanly when switching weapons', () => {
    const mgr = new WeaponManager(createDeterministicRng(10), false);
    const primary = mgr.getCurrentWeapon();
    primary.consumeShot();
    expect(primary.magazineAmmo).toBe(29);
    expect(primary.startReload()).toBe(true);
    expect(primary.reloader.isReloading()).toBe(true);

    // Switch to sidearm slot 2 before reload finishes
    expect(mgr.switchSlot(2)).toBe(true);
    expect(mgr.getActiveSlot()).toBe(2);
    expect(primary.reloader.isReloading()).toBe(false);
    expect(primary.magazineAmmo).toBe(29);
  });
});
