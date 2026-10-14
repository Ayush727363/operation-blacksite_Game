import { RoundManager } from './RoundManager.ts';
import { BombObjective } from './BombObjective.ts';
import { MatchStats } from './MatchStats.ts';
import { GameConfig } from '../app/GameConfig.ts';

/**
 * Evaluates mode-specific rules and win conditions across:
 * 1. Bomb Defusal (Elimination, Bomb Detonation, Bomb Defusal, Round Time Expiry)
 * 2. Team Deathmatch (Team Kill Score Limit or Timer Expiry)
 * 3. Free-For-All Deathmatch (Individual Kill Limit or Timer Expiry)
 */
export class GameModeRules {
  static evaluateBombDefusalState(
    roundManager: RoundManager,
    bomb: BombObjective,
    alphaAliveCount: number,
    bravoAliveCount: number,
    timeExpiredInActive: boolean
  ): { ended: boolean; winner?: 'alpha' | 'bravo'; reason?: string } {
    const phase = roundManager.getPhase();
    if (phase !== 'active' && phase !== 'bomb_planted') {
      return { ended: false };
    }

    if (bomb.getStatus() === 'exploded') {
      roundManager.endRound('alpha', 'Target Destroyed — Bomb Detonated');
      return { ended: true, winner: 'alpha', reason: 'Target Destroyed — Bomb Detonated' };
    }

    if (bomb.getStatus() === 'defused') {
      roundManager.endRound('bravo', 'Bomb Defused by Defenders');
      return { ended: true, winner: 'bravo', reason: 'Bomb Defused by Defenders' };
    }

    // All defenders eliminated
    if (bravoAliveCount <= 0 && alphaAliveCount > 0) {
      roundManager.endRound('alpha', 'Defenders Eliminated');
      return { ended: true, winner: 'alpha', reason: 'Defenders Eliminated' };
    }

    // All attackers eliminated (only wins for Defenders if bomb is NOT planted)
    if (alphaAliveCount <= 0 && !bomb.isPlanted()) {
      roundManager.endRound('bravo', 'Attackers Eliminated');
      return { ended: true, winner: 'bravo', reason: 'Attackers Eliminated' };
    }

    // Round timer expired before bomb plant
    if (timeExpiredInActive && !bomb.isPlanted()) {
      roundManager.endRound('bravo', 'Time Expired — Target Saved');
      return { ended: true, winner: 'bravo', reason: 'Time Expired — Target Saved' };
    }

    return { ended: false };
  }

  static evaluateDeathmatchKill(
    config: GameConfig,
    roundManager: RoundManager,
    stats: MatchStats,
    killerId: string,
    killerTeam: 'alpha' | 'bravo' | 'ffa'
  ): void {
    if (config.mode === 'team_deathmatch') {
      if (killerTeam === 'alpha' || killerTeam === 'bravo') {
        roundManager.addTeamKillScore(killerTeam);
      }
    } else if (config.mode === 'ffa_deathmatch') {
      const p = stats.getParticipant(killerId);
      if (p && p.kills >= config.ffaScoreLimit) {
        roundManager.endRound('ffa', `${p.name} reached ${config.ffaScoreLimit} kills`, p.name);
      }
    }
  }

  static evaluateDeathmatchTimerExpiry(
    config: GameConfig,
    roundManager: RoundManager,
    stats: MatchStats
  ): void {
    if (config.mode === 'team_deathmatch') {
      const a = roundManager.getAlphaScore();
      const b = roundManager.getBravoScore();
      if (a >= b) {
        roundManager.endRound('alpha', 'Time Expired — Alpha Leads');
      } else {
        roundManager.endRound('bravo', 'Time Expired — Bravo Leads');
      }
    } else if (config.mode === 'ffa_deathmatch') {
      const leader = stats.getHighestKillsParticipant();
      const winnerName = leader ? leader.name : 'OPERATIVE-1';
      roundManager.endRound('ffa', `Time Expired — ${winnerName} Wins`, winnerName);
    }
  }
}
