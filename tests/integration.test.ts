import * as THREE from 'three';
import { describe, it, expect } from '../src/testing/TestFixtures.ts';
import { Game } from '../src/app/Game.ts';
import { SpatialAudioCalculator } from '../src/audio/SpatialAudio.ts';

describe('End-to-End Gameplay & System Integration (integration.test.ts)', () => {
  it('initializes Game, builds BLACKSITE map colliders, spawns bots, and steps simulation cleanly', () => {
    const game = new Game();
    expect(game.collisionWorld.getColliders().length).toBeGreaterThan(20);

    game.startMatch('bomb_defusal', 6, 5);
    expect(game.isMatchActive()).toBe(true);
    expect(game.botManager.getBots().length).toBe(5);
    expect(game.botManager.getDifficultyProfile().level).toBe(6);

    // Step through warmup & buy phase into active round
    game.step(3.5);
    game.step(12.5);
    expect(game.roundManager.getPhase()).toBe('active');

    // Player firing updates magazine ammo
    const initialMag = game.player.weapons.getCurrentWeapon().magazineAmmo;
    expect(game.firePlayerWeapon()).toBe(true);
    expect(game.player.weapons.getCurrentWeapon().magazineAmmo).toBe(initialMag - 1);

    game.dispose();
  });

  it('prevents player movement from passing through solid perimeter or interior walls', () => {
    const game = new Game();
    game.startMatch('team_deathmatch', 5, 2);

    // Place player near outer south perimeter wall (Z = 54.5) and simulate walking south (+Z)
    game.player.movement.reset(new THREE.Vector3(0, 0, 53.5));
    for (let i = 0; i < 60; i++) {
      game.player.movement.update(
        0.05,
        {
          forward: -1, // Walk backward (+Z toward wall at 55)
          right: 0,
          sprint: true,
          crouch: false,
          jump: false,
          yaw: 0,
          weaponSpeedMultiplier: 1.0
        },
        game.collisionWorld
      );
    }

    // Player must remain strictly inside the 55.0m wall boundary
    expect(game.player.movement.position.z).toBeLessThan(55.0);
    expect(game.player.movement.position.y).toBeGreaterThanOrEqual(0);
    game.dispose();
  });

  it('computes A* navigation paths between Attacker Spawn, Courtyard, Bomb Site A, and Bomb Site B', () => {
    const game = new Game();
    const nav = game.botManager.navigation;

    const pathToA = nav.findPath(new THREE.Vector3(0, 0, 42), new THREE.Vector3(-34, 0, -12));
    const pathToB = nav.findPath(new THREE.Vector3(0, 0, 42), new THREE.Vector3(34, 0, -10));

    expect(pathToA.length).toBeGreaterThan(2);
    expect(pathToB.length).toBeGreaterThan(2);
    game.dispose();
  });

  it('ensures dead bots stop fighting and round reset restores valid state', () => {
    const game = new Game();
    game.startMatch('bomb_defusal', 7, 4);
    game.step(16.0); // Enter active phase

    const bot = game.botManager.getBots()[0];
    bot.onKilled();
    expect(bot.health.isAlive()).toBe(false);

    // Step simulation -> dead bot must not fire
    game.step(0.5);
    expect(bot.brain.getState()).toBe('dead');

    // Reset round -> bot is alive again
    game.resetRoundEntities(false);
    expect(bot.health.isAlive()).toBe(true);
    game.dispose();
  });

  it('computes directional stereo panning and distance attenuation in SpatialAudioCalculator', () => {
    const listenerPos = new THREE.Vector3(0, 1.6, 0);
    const listenerForward = new THREE.Vector3(0, 0, -1); // Looking North (-Z)

    const rightSource = new THREE.Vector3(10, 1.6, 0); // East (+X = right ear)
    const leftSource = new THREE.Vector3(-10, 1.6, 0); // West (-X = left ear)
    const farSource = new THREE.Vector3(0, 1.6, -45);

    const rightSpatial = SpatialAudioCalculator.compute(listenerPos, listenerForward, rightSource, 60);
    const leftSpatial = SpatialAudioCalculator.compute(listenerPos, listenerForward, leftSource, 60);
    const farSpatial = SpatialAudioCalculator.compute(listenerPos, listenerForward, farSource, 60);

    expect(rightSpatial.pan).toBeGreaterThan(0.8);
    expect(leftSpatial.pan).toBeLessThan(-0.8);
    expect(rightSpatial.gainMultiplier).toBeGreaterThan(farSpatial.gainMultiplier);
  });

  it('supports pause, resume, and match restart without errors', () => {
    const game = new Game();
    game.startMatch('team_deathmatch', 5, 4);
    expect(game.isPaused()).toBe(false);

    game.pauseMatch();
    expect(game.isPaused()).toBe(true);

    game.resumeMatch();
    expect(game.isPaused()).toBe(false);

    game.startMatch('ffa_deathmatch', 8, 6);
    expect(game.config.mode).toBe('ffa_deathmatch');
    expect(game.botManager.getBots().length).toBe(6);
    game.dispose();
  });
});
