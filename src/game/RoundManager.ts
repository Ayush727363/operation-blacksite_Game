import { EventBus } from '../app/EventBus.ts';
import { GameConfig } from '../app/GameConfig.ts';

export type RoundPhase =
  | 'warmup'
  | 'buy'
  | 'active'
  | 'bomb_planted'
  | 'round_end'
  | 'round_transition'
  | 'match_over';

/**
 * Authoritative Round State Machine managing phases, timers, team scores,
 * duplicate round-end prevention, and match victory evaluation.
 */
export class RoundManager {
  private phase: RoundPhase = 'warmup';
  private roundNumber = 1;
  private phaseTimer = 0;
  private alphaScore = 0;
  private bravoScore = 0;
  private roundEndLocked = false;
  private matchWinner: string | null = null;
  private config: GameConfig;
  private readonly eventBus: EventBus;

  constructor(config: GameConfig, eventBus: EventBus) {
    this.config = { ...config };
    this.eventBus = eventBus;
  }

  configure(config: GameConfig): void {
    this.config = { ...config };
  }

  startMatch(): void {
    this.roundNumber = 1;
    this.alphaScore = 0;
    this.bravoScore = 0;
    this.roundEndLocked = false;
    this.matchWinner = null;

    if (this.config.warmupTimeSeconds > 0) {
      this.setPhase('warmup', this.config.warmupTimeSeconds);
    } else {
      this.startNewRound();
    }
  }

  startNewRound(): void {
    if (this.phase === 'match_over') return;
    this.roundEndLocked = false;

    if (this.config.mode === 'bomb_defusal' && this.config.buyTimeSeconds > 0) {
      this.setPhase('buy', this.config.buyTimeSeconds);
    } else {
      this.setPhase('active', this.config.roundTimeSeconds);
    }
  }

  notifyBombPlanted(): void {
    if (this.phase !== 'active' && this.phase !== 'buy') return;
    this.setPhase('bomb_planted', this.config.bombFuseSeconds);
  }

  /**
   * Ends the current round once, awards score to the winning team,
   * and prevents duplicate score or round-end triggers.
   */
  endRound(
    winner: 'alpha' | 'bravo' | 'draw' | 'ffa',
    reason: string,
    overrideWinnerName?: string
  ): boolean {
    if (this.roundEndLocked || this.phase === 'round_end' || this.phase === 'match_over') {
      return false;
    }
    this.roundEndLocked = true;

    if (winner === 'alpha') {
      this.alphaScore++;
    } else if (winner === 'bravo') {
      this.bravoScore++;
    }

    this.eventBus.emit('round:ended', {
      roundNumber: this.roundNumber,
      winner,
      reason
    });

    // Check match victory condition
    if (this.config.mode === 'bomb_defusal') {
      if (this.alphaScore >= this.config.roundsToWin) {
        this.finishMatch('ALPHA SQUAD (ATTACKERS)');
        return true;
      }
      if (this.bravoScore >= this.config.roundsToWin) {
        this.finishMatch('BRAVO SQUAD (DEFENDERS)');
        return true;
      }
    } else if (this.config.mode === 'team_deathmatch') {
      if (this.alphaScore >= this.config.tdmScoreLimit || winner === 'alpha') {
        this.finishMatch('ALPHA SQUAD');
        return true;
      }
      if (this.bravoScore >= this.config.tdmScoreLimit || winner === 'bravo') {
        this.finishMatch('BRAVO SQUAD');
        return true;
      }
    } else if (this.config.mode === 'ffa_deathmatch') {
      this.finishMatch(overrideWinnerName || 'OPERATIVE-1');
      return true;
    }

    this.setPhase('round_end', 4.0);
    return true;
  }

  finishMatch(winnerName: string): void {
    this.matchWinner = winnerName;
    this.setPhase('match_over', 0);
    this.eventBus.emit('match:ended', {
      winner: winnerName,
      alphaScore: this.alphaScore,
      bravoScore: this.bravoScore
    });
  }

  update(dt: number): { startNextRoundNow: boolean; timeExpiredInActive: boolean } {
    if (this.phase === 'match_over') {
      return { startNextRoundNow: false, timeExpiredInActive: false };
    }

    this.phaseTimer = Math.max(0, this.phaseTimer - dt);
    if (this.phaseTimer > 0) {
      return { startNextRoundNow: false, timeExpiredInActive: false };
    }

    if (this.phase === 'warmup') {
      this.startNewRound();
      return { startNextRoundNow: true, timeExpiredInActive: false };
    }

    if (this.phase === 'buy') {
      this.setPhase('active', this.config.roundTimeSeconds);
      return { startNextRoundNow: false, timeExpiredInActive: false };
    }

    if (this.phase === 'active') {
      return { startNextRoundNow: false, timeExpiredInActive: true };
    }

    if (this.phase === 'round_end') {
      this.setPhase('round_transition', 0.5);
      return { startNextRoundNow: false, timeExpiredInActive: false };
    }

    if (this.phase === 'round_transition') {
      this.roundNumber++;
      this.startNewRound();
      return { startNextRoundNow: true, timeExpiredInActive: false };
    }

    return { startNextRoundNow: false, timeExpiredInActive: false };
  }

  isCombatAllowed(): boolean {
    return (
      this.phase === 'active' ||
      this.phase === 'bomb_planted' ||
      this.phase === 'buy' ||
      this.phase === 'warmup'
    );
  }

  isMovementAllowed(): boolean {
    return this.phase !== 'match_over' && this.phase !== 'round_transition';
  }

  isBuyAllowed(): boolean {
    if (this.config.mode !== 'bomb_defusal') {
      return this.phase === 'active' || this.phase === 'buy' || this.phase === 'warmup';
    }
    return (
      this.phase === 'warmup' ||
      this.phase === 'buy' ||
      (this.phase === 'active' && this.config.roundTimeSeconds - this.phaseTimer <= 18)
    );
  }

  canRespawnMidRound(): boolean {
    return this.config.mode === 'team_deathmatch' || this.config.mode === 'ffa_deathmatch';
  }

  getPhase(): RoundPhase {
    return this.phase;
  }

  getPhaseTimer(): number {
    return this.phaseTimer;
  }

  getRoundNumber(): number {
    return this.roundNumber;
  }

  getAlphaScore(): number {
    return this.alphaScore;
  }

  getBravoScore(): number {
    return this.bravoScore;
  }

  addTeamKillScore(team: 'alpha' | 'bravo'): void {
    if (this.phase === 'match_over') return;
    if (team === 'alpha') {
      this.alphaScore++;
      if (this.config.mode === 'team_deathmatch' && this.alphaScore >= this.config.tdmScoreLimit) {
        this.endRound('alpha', 'Score Limit Reached');
      }
    } else if (team === 'bravo') {
      this.bravoScore++;
      if (this.config.mode === 'team_deathmatch' && this.bravoScore >= this.config.tdmScoreLimit) {
        this.endRound('bravo', 'Score Limit Reached');
      }
    }
  }

  getMatchWinner(): string | null {
    return this.matchWinner;
  }

  private setPhase(phase: RoundPhase, duration: number): void {
    this.phase = phase;
    this.phaseTimer = duration;
    this.eventBus.emit('round:phase_changed', {
      phase,
      roundNumber: this.roundNumber,
      duration
    });
  }
}
