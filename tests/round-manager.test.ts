import * as THREE from 'three';
import { describe, it, expect } from '../src/testing/TestFixtures.ts';
import { EventBus } from '../src/app/EventBus.ts';
import { DEFAULT_GAME_CONFIG } from '../src/app/GameConfig.ts';
import { RoundManager } from '../src/game/RoundManager.ts';
import { BombObjective } from '../src/game/BombObjective.ts';

describe('Round State Machine & Bomb Objective (round-manager.test.ts)', () => {
  it('transitions deterministically from warmup -> buy -> active -> round_end -> round_transition -> next round', () => {
    const bus = new EventBus();
    const rm = new RoundManager(
      {
        ...DEFAULT_GAME_CONFIG,
        mode: 'bomb_defusal',
        warmupTimeSeconds: 2,
        buyTimeSeconds: 5,
        roundTimeSeconds: 60,
        roundsToWin: 3
      },
      bus
    );

    rm.startMatch();
    expect(rm.getPhase()).toBe('warmup');
    expect(rm.getRoundNumber()).toBe(1);

    // Expire warmup
    rm.update(2.1);
    expect(rm.getPhase()).toBe('buy');

    // Expire buy phase
    rm.update(5.1);
    expect(rm.getPhase()).toBe('active');

    // End round 1 in favor of Alpha
    expect(rm.endRound('alpha', 'Defenders Eliminated')).toBe(true);
    expect(rm.getAlphaScore()).toBe(1);
    expect(rm.getPhase()).toBe('round_end');

    // Duplicate endRound call during round_end must be ignored
    expect(rm.endRound('alpha', 'Duplicate Trigger')).toBe(false);
    expect(rm.getAlphaScore()).toBe(1);

    // Advance through round_end (4.0s) and round_transition (0.5s)
    rm.update(4.1);
    expect(rm.getPhase()).toBe('round_transition');
    const stepNext = rm.update(0.6);
    expect(stepNext.startNextRoundNow).toBe(true);
    expect(rm.getRoundNumber()).toBe(2);
    expect(rm.getPhase()).toBe('buy');
  });

  it('handles C4 bomb planting, fuse countdown, defusal, and detonation outcomes', () => {
    const bomb = new BombObjective(40.0, 3.0, 5.0);
    const siteAPos = new THREE.Vector3(-34, 0, -12);

    expect(bomb.getStatus()).toBe('carried');
    expect(bomb.updatePlanting(1.5, 'player', 'A', siteAPos)).toBe(false);
    expect(bomb.getStatus()).toBe('planting');
    expect(bomb.getPlantProgressRatio()).toBeCloseTo(0.5, 2);

    // Complete plant
    expect(bomb.updatePlanting(1.6, 'player', 'A', siteAPos)).toBe(true);
    expect(bomb.isPlanted()).toBe(true);
    expect(bomb.getPlantedSite()).toBe('A');

    // Advance fuse by 10s
    expect(bomb.updateFuse(10.0).exploded).toBe(false);
    expect(bomb.getFuseRemaining()).toBeCloseTo(30.0, 1);

    // Defuse partway then cancel
    expect(bomb.updateDefusing(2.5, 'bot_1')).toBe(false);
    bomb.cancelDefusing('bot_1');
    expect(bomb.getDefuseProgressRatio()).toBe(0);

    // Full 5.0s defuse
    expect(bomb.updateDefusing(5.1, 'bot_1')).toBe(true);
    expect(bomb.getStatus()).toBe('defused');

    // Reset and test full fuse detonation
    bomb.reset();
    bomb.plantImmediately('player', 'B', new THREE.Vector3(34, 0, -10));
    expect(bomb.updateFuse(40.5).exploded).toBe(true);
    expect(bomb.getStatus()).toBe('exploded');
  });
});
