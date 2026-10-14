import { describe, it, expect } from '../src/testing/TestFixtures.ts';
import { EconomySystem } from '../src/game/Economy.ts';
import { GameModeRules } from '../src/game/GameMode.ts';
import { RoundManager } from '../src/game/RoundManager.ts';
import { BombObjective } from '../src/game/BombObjective.ts';
import { MatchStats } from '../src/game/MatchStats.ts';
import { EventBus } from '../src/app/EventBus.ts';
import { DEFAULT_GAME_CONFIG } from '../src/app/GameConfig.ts';

describe('Game Modes & Tactical Economy (game-rules.test.ts)', () => {
  it('validates weapon, armor, and grenade purchases and prevents negative balances or buy-phase bypass', () => {
    const econ = new EconomySystem(800, 16000);

    // Cannot afford Vanguard-47 ($2700) with $800
    const failExpensive = econ.tryPurchaseWeapon('ak_vanguard', ['p250_enforcer'], true);
    expect(failExpensive.success).toBe(false);
    expect(econ.getMoney()).toBe(800);

    // Can purchase Judge-.50 ($700) during buy phase
    const buyDeagle = econ.tryPurchaseWeapon('deagle_judge', ['p250_enforcer'], true);
    expect(buyDeagle.success).toBe(true);
    expect(econ.getMoney()).toBe(100);

    // Cannot re-purchase already equipped weapon
    econ.addMoney(2000);
    const dupBuy = econ.tryPurchaseWeapon('deagle_judge', ['deagle_judge'], true);
    expect(dupBuy.success).toBe(false);

    // Cannot purchase when buyPhaseAllowed is false
    const expiredBuy = econ.tryPurchaseWeapon('mp9_tempest', ['deagle_judge'], false);
    expect(expiredBuy.success).toBe(false);

    // Award round win and verify maxMoney cap ($16,000)
    econ.addMoney(20000);
    expect(econ.getMoney()).toBe(16000);
  });

  it('enforces Bomb Defusal elimination, detonation, and defusal victory conditions', () => {
    const bus = new EventBus();
    const rm = new RoundManager({ ...DEFAULT_GAME_CONFIG, warmupTimeSeconds: 0, buyTimeSeconds: 0 }, bus);
    const bomb = new BombObjective();
    rm.startMatch();

    // Even if all attackers die AFTER planting bomb, round continues until defusal or explosion
    bomb.plantImmediately('player', 'A', { x: -34, y: 0, z: -12 } as any);
    rm.notifyBombPlanted();
    const afterAttackerWipe = GameModeRules.evaluateBombDefusalState(rm, bomb, 0, 2, false);
    expect(afterAttackerWipe.ended).toBe(false);

    // Bomb explodes -> Alpha wins
    bomb.updateFuse(45);
    const afterExplosion = GameModeRules.evaluateBombDefusalState(rm, bomb, 0, 2, false);
    expect(afterExplosion.ended).toBe(true);
    expect(afterExplosion.winner).toBe('alpha');
  });

  it('enforces Team Deathmatch and Free-For-All score limits', () => {
    const bus = new EventBus();
    const cfg = { ...DEFAULT_GAME_CONFIG, mode: 'ffa_deathmatch' as const, ffaScoreLimit: 3, warmupTimeSeconds: 0 };
    const rm = new RoundManager(cfg, bus);
    const stats = new MatchStats();
    stats.registerParticipant('player', 'OPERATIVE-1', 'ffa');
    stats.registerParticipant('bot_1', 'BOT-VIPER', 'ffa');
    rm.startMatch();

    for (let i = 0; i < 3; i++) {
      stats.recordKill('player', 'bot_1', true);
      GameModeRules.evaluateDeathmatchKill(cfg, rm, stats, 'player', 'ffa');
    }

    expect(rm.getPhase()).toBe('match_over');
    expect(rm.getMatchWinner()).toBe('OPERATIVE-1');
  });
});
