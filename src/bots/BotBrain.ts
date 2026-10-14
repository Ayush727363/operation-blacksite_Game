export type BotState =
  | 'idle'
  | 'patrol'
  | 'investigate_sound'
  | 'search_last_known'
  | 'move_to_objective'
  | 'engage'
  | 'seek_cover'
  | 'reload'
  | 'retreat'
  | 'flank'
  | 'defend_objective'
  | 'plant_bomb'
  | 'defuse_bomb'
  | 'dead';

export interface BotDecisionContext {
  alive: boolean;
  health: number;
  magazineAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  hasVisibleTarget: boolean;
  hasReactedToTarget: boolean;
  hasRecentTargetMemory: boolean;
  hasSoundAlert: boolean;
  gameMode: 'bomb_defusal' | 'team_deathmatch' | 'ffa_deathmatch';
  team: 'alpha' | 'bravo' | 'ffa';
  roundPhase: string;
  isBombCarrier: boolean;
  isInsideBombSite: boolean;
  isBombPlanted: boolean;
  distanceToPlantedBomb: number;
  coverThresholdHealth: number;
  wantsFlank: boolean;
}

/**
 * Explicit Finite-State Machine (FSM) driving tactical Bot AI transitions.
 */
export class BotBrain {
  private state: BotState = 'idle';
  private stateTime = 0;

  getState(): BotState {
    return this.state;
  }

  getStateTime(): number {
    return this.stateTime;
  }

  transitionTo(nextState: BotState): void {
    if (this.state !== nextState) {
      this.state = nextState;
      this.stateTime = 0;
    }
  }

  evaluate(dt: number, ctx: BotDecisionContext): BotState {
    this.stateTime += dt;

    if (!ctx.alive) {
      this.transitionTo('dead');
      return this.state;
    }

    if (ctx.roundPhase === 'warmup' || ctx.roundPhase === 'buy' || ctx.roundPhase === 'round_end' || ctx.roundPhase === 'match_over') {
      this.transitionTo('idle');
      return this.state;
    }

    // 1. Immediate reload priority when magazine is empty
    if ((ctx.magazineAmmo <= 0 && ctx.reserveAmmo > 0) || ctx.isReloading) {
      this.transitionTo('reload');
      return this.state;
    }

    // 2. Defuse urgent priority for Defenders when bomb is planted and nearby without immediate reacted threat
    if (
      ctx.gameMode === 'bomb_defusal' &&
      ctx.team === 'bravo' &&
      ctx.isBombPlanted &&
      ctx.distanceToPlantedBomb <= 3.2 &&
      !ctx.hasReactedToTarget
    ) {
      this.transitionTo('defuse_bomb');
      return this.state;
    }

    // 3. Plant bomb priority for Attacker bomb carrier inside Bomb Site when clear
    if (
      ctx.gameMode === 'bomb_defusal' &&
      ctx.team === 'alpha' &&
      !ctx.isBombPlanted &&
      ctx.isBombCarrier &&
      ctx.isInsideBombSite &&
      !ctx.hasVisibleTarget
    ) {
      this.transitionTo('plant_bomb');
      return this.state;
    }

    // 4. Active enemy engagement or low-health cover seeking
    if (ctx.hasVisibleTarget) {
      if (ctx.health <= ctx.coverThresholdHealth && this.stateTime > 0.35) {
        this.transitionTo('seek_cover');
        return this.state;
      }
      this.transitionTo('engage');
      return this.state;
    }

    // 5. Tactical reload when out of sight and mag is below 25%
    if (ctx.magazineAmmo <= 5 && ctx.reserveAmmo > 0) {
      this.transitionTo('reload');
      return this.state;
    }

    // 6. Lost sight of enemy recently -> Flank or Search last known position
    if (ctx.hasRecentTargetMemory) {
      if (ctx.wantsFlank) {
        this.transitionTo('flank');
      } else {
        this.transitionTo('search_last_known');
      }
      return this.state;
    }

    // 7. Sound alert investigation
    if (ctx.hasSoundAlert) {
      this.transitionTo('investigate_sound');
      return this.state;
    }

    // 8. Objective-driven behavior in Bomb Defusal
    if (ctx.gameMode === 'bomb_defusal') {
      if (ctx.isBombPlanted) {
        if (ctx.team === 'bravo') {
          this.transitionTo('move_to_objective'); // Move to defuse planted bomb
        } else {
          this.transitionTo('defend_objective'); // Guard planted bomb
        }
        return this.state;
      } else {
        if (ctx.team === 'alpha') {
          this.transitionTo('move_to_objective'); // Push Site A or B
        } else {
          this.transitionTo('defend_objective'); // Hold Site A or B
        }
        return this.state;
      }
    }

    // 9. Default patrol across lanes
    this.transitionTo('patrol');
    return this.state;
  }

  reset(): void {
    this.state = 'idle';
    this.stateTime = 0;
  }
}
