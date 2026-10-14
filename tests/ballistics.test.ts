import * as THREE from 'three';
import { describe, it, expect, createDeterministicRng, createTestCollisionCorridor } from '../src/testing/TestFixtures.ts';
import { WEAPON_DEFINITIONS } from '../src/weapons/WeaponDefinitions.ts';
import { RecoilController } from '../src/weapons/RecoilController.ts';
import { BallisticsSystem } from '../src/weapons/Ballistics.ts';
import { HitboxTarget } from '../src/combat/Hitboxes.ts';

describe('Ballistics, Recoil & Spread (ballistics.test.ts)', () => {
  it('accumulates vertical and horizontal recoil during sustained fire and recovers when firing stops', () => {
    const recoil = new RecoilController(createDeterministicRng(55));
    const ak = WEAPON_DEFINITIONS.ak_vanguard;

    expect(recoil.getPitchDeg()).toBe(0);
    recoil.applyShot(ak, false);
    const firstPitch = recoil.getPitchDeg();
    expect(firstPitch).toBeGreaterThan(1.0);

    recoil.applyShot(ak, false);
    recoil.applyShot(ak, false);
    const sustainedPitch = recoil.getPitchDeg();
    expect(sustainedPitch).toBeGreaterThan(firstPitch);

    // Wait 1.5s without firing -> recoil recovers back to 0
    recoil.update(1.5, ak.recoilRecoveryRate);
    expect(recoil.getPitchDeg()).toBe(0);
    expect(recoil.getYawDeg()).toBe(0);
    expect(recoil.getShotIndex()).toBe(0);
  });

  it('computes dynamic spread accurately across ADS, hipfire, moving, sprinting, crouching, and airborne states', () => {
    const ballistics = new BallisticsSystem(createDeterministicRng(99));
    const m4 = WEAPON_DEFINITIONS.m4_sentinel;

    const stationaryAds = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 0,
      grounded: true,
      crouching: false,
      sprinting: false,
      ads: true,
      accumulatedSpreadDeg: 0
    });

    const stationaryHip = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 0,
      grounded: true,
      crouching: false,
      sprinting: false,
      ads: false,
      accumulatedSpreadDeg: 0
    });

    const crouchHip = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 0,
      grounded: true,
      crouching: true,
      sprinting: false,
      ads: false,
      accumulatedSpreadDeg: 0
    });

    const movingHip = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 5.0,
      grounded: true,
      crouching: false,
      sprinting: false,
      ads: false,
      accumulatedSpreadDeg: 0
    });

    const sprintingHip = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 6.5,
      grounded: true,
      crouching: false,
      sprinting: true,
      ads: false,
      accumulatedSpreadDeg: 0
    });

    const airborneHip = ballistics.computeSpreadDegrees(m4, {
      horizontalSpeed: 4.0,
      grounded: false,
      crouching: false,
      sprinting: false,
      ads: false,
      accumulatedSpreadDeg: 0
    });

    expect(stationaryAds).toBeLessThan(stationaryHip);
    expect(crouchHip).toBeLessThan(stationaryHip);
    expect(stationaryHip).toBeLessThan(movingHip);
    expect(movingHip).toBeLessThan(sprintingHip);
    expect(movingHip).toBeLessThan(airborneHip);
  });

  it('strictly blocks bullets with solid walls and registers hits when line of sight is clear', () => {
    const ballistics = new BallisticsSystem(createDeterministicRng(123));
    const world = createTestCollisionCorridor(); // Has wall at Z = 0, X in [-3..3]
    const sniper = WEAPON_DEFINITIONS.awm_titan;

    const targetBehindWall: HitboxTarget = {
      id: 'enemy_1',
      team: 'bravo',
      feetPosition: new THREE.Vector3(0, 0, -8),
      crouching: false,
      alive: true
    };

    const originBlocked = new THREE.Vector3(0, 1.5, 8);
    const aimNorth = new THREE.Vector3(0, 0, -1);

    const blockedResult = ballistics.fireWeaponRays(
      originBlocked,
      aimNorth,
      sniper,
      { horizontalSpeed: 0, grounded: true, crouching: true, sprinting: false, ads: true, accumulatedSpreadDeg: 0 },
      world,
      [targetBehindWall],
      'player'
    );

    expect(blockedResult.rays.length).toBe(1);
    expect(blockedResult.rays[0].hitType).toBe('world');

    // Now move shooter and target to X = 12 where there is no wall
    const targetOpen: HitboxTarget = {
      id: 'enemy_2',
      team: 'bravo',
      feetPosition: new THREE.Vector3(12, 0, -8),
      crouching: false,
      alive: true
    };
    const originOpen = new THREE.Vector3(12, 1.5, 8);

    const openResult = ballistics.fireWeaponRays(
      originOpen,
      aimNorth,
      sniper,
      { horizontalSpeed: 0, grounded: true, crouching: true, sprinting: false, ads: true, accumulatedSpreadDeg: 0 },
      world,
      [targetOpen],
      'player'
    );

    expect(openResult.rays[0].hitType).toBe('target');
    expect(openResult.rays[0].targetId).toBe('enemy_2');
  });

  it('fires 8 independent pellet rays for the pump-action shotgun', () => {
    const ballistics = new BallisticsSystem(createDeterministicRng(7));
    const world = createTestCollisionCorridor();
    const shotgun = WEAPON_DEFINITIONS.nova_breacher;

    const res = ballistics.fireWeaponRays(
      new THREE.Vector3(10, 1.5, 5),
      new THREE.Vector3(0, 0, -1),
      shotgun,
      { horizontalSpeed: 0, grounded: true, crouching: false, sprinting: false, ads: false, accumulatedSpreadDeg: 0 },
      world,
      [],
      'player'
    );
    expect(res.rays.length).toBe(8);
  });
});
