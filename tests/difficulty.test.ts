import * as THREE from 'three';
import { describe, it, expect, createTestCollisionCorridor } from '../src/testing/TestFixtures.ts';
import { getBotDifficultyProfile } from '../src/bots/BotDifficulty.ts';
import { BotPerception, PerceivableActor } from '../src/bots/BotPerception.ts';

describe('Bot Difficulty Slider Levels 1–10 & Perception (difficulty.test.ts)', () => {
  it('produces distinct, monotonic human-bounded parameters across levels 1 through 10', () => {
    const lvl1 = getBotDifficultyProfile(1);
    const lvl5 = getBotDifficultyProfile(5);
    const lvl10 = getBotDifficultyProfile(10);

    // Easiest profile has slower reactions and wider aim error than hardest profile
    expect(lvl1.reactionTimeSeconds).toBeGreaterThan(lvl5.reactionTimeSeconds);
    expect(lvl5.reactionTimeSeconds).toBeGreaterThan(lvl10.reactionTimeSeconds);
    expect(lvl10.reactionTimeSeconds).toBeGreaterThan(0.1); // Never zero reaction delay

    expect(lvl1.aimErrorDegrees).toBeGreaterThan(lvl5.aimErrorDegrees);
    expect(lvl5.aimErrorDegrees).toBeGreaterThan(lvl10.aimErrorDegrees);

    // Tactical behavior parameters scale with difficulty
    expect(lvl10.fovDegrees).toBeGreaterThan(lvl1.fovDegrees);
    expect(lvl10.trackingSpeedRadPerSec).toBeGreaterThan(lvl1.trackingSpeedRadPerSec);
    expect(lvl10.recoilCompensationFactor).toBeGreaterThan(lvl1.recoilCompensationFactor);
    expect(lvl10.coverUsageProbability).toBeGreaterThan(lvl1.coverUsageProbability);
    expect(lvl10.flankProbability).toBeGreaterThan(lvl1.flankProbability);
    expect(lvl10.squadShareRadius).toBeGreaterThan(lvl1.squadShareRadius);
  });

  it('clamps out-of-range difficulty inputs safely without producing NaN or zero reaction delays', () => {
    const low = getBotDifficultyProfile(-5);
    const high = getBotDifficultyProfile(99);
    expect(low.level).toBe(1);
    expect(high.level).toBe(10);
    expect(low.reactionTimeSeconds).toBeGreaterThan(0);
    expect(high.reactionTimeSeconds).toBeGreaterThan(0);
  });

  it('prevents bots at all difficulty levels (including Level 10) from seeing through solid walls or smoke', () => {
    const world = createTestCollisionCorridor(); // Wall at Z = 0, X in [-3..3]
    const perception = new BotPerception();
    const eliteProfile = getBotDifficultyProfile(10);

    const botEye = new THREE.Vector3(0, 1.6, 8);
    const botForward = new THREE.Vector3(0, 0, -1);

    const hiddenPlayer: PerceivableActor = {
      id: 'player',
      team: 'alpha',
      feetPosition: new THREE.Vector3(0, 0, -8),
      eyePosition: new THREE.Vector3(0, 1.6, -8),
      alive: true
    };

    const memBehindWall = perception.update(
      0.5,
      1.0,
      botEye,
      botForward,
      'bravo',
      [hiddenPlayer],
      world,
      eliteProfile
    );
    expect(memBehindWall).toBe(null);

    // Move to open lane at X = 12, but deploy a smoke cloud between bot and player
    const openBotEye = new THREE.Vector3(12, 1.6, 8);
    const openPlayer: PerceivableActor = {
      id: 'player',
      team: 'alpha',
      feetPosition: new THREE.Vector3(12, 0, -8),
      eyePosition: new THREE.Vector3(12, 1.6, -8),
      alive: true
    };
    world.addSmokeVolume('smoke_test', new THREE.Vector3(12, 1.0, 0), 4.5, 20.0);

    const memBehindSmoke = perception.update(
      0.5,
      2.0,
      openBotEye,
      botForward,
      'bravo',
      [openPlayer],
      world,
      eliteProfile
    );
    expect(memBehindSmoke).toBe(null);

    // Expire smoke -> bot now sees player after reaction delay
    world.pruneExpiredSmoke(25.0);
    const memFirstSight = perception.update(
      0.05,
      25.0,
      openBotEye,
      botForward,
      'bravo',
      [openPlayer],
      world,
      eliteProfile
    );
    expect(memFirstSight?.visible).toBe(true);
    expect(memFirstSight?.hasReacted).toBe(false); // 0.05s < 0.15s reaction time

    const memAfterReaction = perception.update(
      0.2,
      25.2,
      openBotEye,
      botForward,
      'bravo',
      [openPlayer],
      world,
      eliteProfile
    );
    expect(memAfterReaction?.hasReacted).toBe(true);
  });
});
