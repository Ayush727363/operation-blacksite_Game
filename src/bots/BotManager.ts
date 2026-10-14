import * as THREE from 'three';
import { BotAgent } from './BotAgent.ts';
import { BotNavigation } from './BotNavigation.ts';
import { getBotDifficultyProfile, BotDifficultyProfile } from './BotDifficulty.ts';
import { SquadCoordinator } from './SquadCoordinator.ts';
import { SPAWN_ZONES } from '../world/LevelData.ts';
import { SeededRandom } from '../core/Random.ts';

const BOT_CALLSIGNS = [
  'VIPER', 'SPECTRE', 'FALCON', 'RAZOR', 'NOMAD', 'TITAN',
  'KESTREL', 'COBALT', 'APEX', 'VANGUARD', 'ONYX', 'DRAKE'
];

const BOT_WEAPON_POOL = [
  'ak_vanguard',
  'm4_sentinel',
  'mp9_tempest',
  'ump_striker',
  'nova_breacher',
  'xm_cyclone',
  'mk14_specter',
  'awm_titan'
];

/**
 * Manages bot spawning, team assignment, difficulty updates, squad callouts,
 * and staggered AI perception/navigation updates.
 */
export class BotManager {
  private bots: BotAgent[] = [];
  private difficultyProfile: BotDifficultyProfile = getBotDifficultyProfile(5);
  readonly navigation = new BotNavigation();
  readonly squadCoordinator = new SquadCoordinator();
  private readonly actorsGroup: THREE.Group;
  private readonly rng: SeededRandom;

  constructor(actorsGroup: THREE.Group, rng = new SeededRandom(900)) {
    this.actorsGroup = actorsGroup;
    this.rng = rng;
  }

  setDifficulty(level: number): BotDifficultyProfile {
    this.difficultyProfile = getBotDifficultyProfile(level);
    return this.difficultyProfile;
  }

  getDifficultyProfile(): BotDifficultyProfile {
    return this.difficultyProfile;
  }

  getBots(): readonly BotAgent[] {
    return this.bots;
  }

  getBotById(id: string): BotAgent | undefined {
    return this.bots.find((b) => b.id === id);
  }

  clearBots(): void {
    for (const bot of this.bots) {
      this.actorsGroup.remove(bot.meshGroup);
    }
    this.bots = [];
  }

  /**
   * Configures and spawns bots for the selected game mode and botCount.
   * In Team Deathmatch & Bomb Defusal, balances Alpha (with player) and Bravo teams.
   */
  spawnBotsForMatch(
    botCount: number,
    mode: 'bomb_defusal' | 'team_deathmatch' | 'ffa_deathmatch',
    roundNumber = 1
  ): void {
    this.clearBots();
    this.squadCoordinator.chooseRoundStrategy(roundNumber);

    const clampedCount = Math.max(1, Math.min(12, Math.round(botCount)));
    let alphaIdx = 1; // Player is Alpha index 0
    let bravoIdx = 0;

    for (let i = 0; i < clampedCount; i++) {
      let team: 'alpha' | 'bravo' | 'ffa';
      let indexInTeam: number;

      if (mode === 'ffa_deathmatch') {
        team = 'ffa';
        indexInTeam = i;
      } else {
        // Put slightly more bots on Bravo so total Alpha (Player + bots) === Bravo
        if (bravoIdx <= alphaIdx) {
          team = 'bravo';
          indexInTeam = bravoIdx++;
        } else {
          team = 'alpha';
          indexInTeam = alphaIdx++;
        }
      }

      const id = `bot_${i + 1}`;
      const callsign = BOT_CALLSIGNS[i % BOT_CALLSIGNS.length];
      const weaponId = BOT_WEAPON_POOL[i % BOT_WEAPON_POOL.length];
      const bot = new BotAgent(
        id,
        `BOT-${callsign}`,
        team,
        indexInTeam,
        weaponId,
        new SeededRandom(1000 + i * 37)
      );

      this.actorsGroup.add(bot.meshGroup);
      this.bots.push(bot);
    }

    this.resetBotsForNewRound(mode, roundNumber);
  }

  resetBotsForNewRound(
    mode: 'bomb_defusal' | 'team_deathmatch' | 'ffa_deathmatch',
    roundNumber = 1
  ): void {
    this.squadCoordinator.chooseRoundStrategy(roundNumber);
    let bombCarrierAssigned = false;

    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      const spawnZone = SPAWN_ZONES[bot.team];
      const spawnPt = spawnZone.points[(bot.indexInTeam + 1) % spawnZone.points.length];
      const weaponId = BOT_WEAPON_POOL[(i + roundNumber) % BOT_WEAPON_POOL.length];
      bot.spawnAt(spawnPt, spawnZone.facingYaw, weaponId);

      if (mode === 'bomb_defusal' && bot.team === 'alpha' && !bombCarrierAssigned) {
        bot.isBombCarrier = true;
        bombCarrierAssigned = true;
      } else {
        bot.isBombCarrier = false;
      }
    }
  }

  respawnBot(bot: BotAgent): void {
    const spawnZone = SPAWN_ZONES[bot.team];
    const pt = spawnZone.points[this.rng.intRange(0, spawnZone.points.length - 1)];
    const weaponId = BOT_WEAPON_POOL[this.rng.intRange(0, BOT_WEAPON_POOL.length - 1)];
    bot.spawnAt(pt, spawnZone.facingYaw, weaponId);
  }

  broadcastSoundToBots(
    sourceId: string,
    sourceTeam: 'alpha' | 'bravo' | 'ffa',
    position: THREE.Vector3,
    radius: number,
    nowSeconds: number
  ): void {
    for (const bot of this.bots) {
      if (!bot.health.isAlive() || bot.id === sourceId) continue;
      bot.perception.receiveSoundEvent(
        bot.position,
        bot.team,
        sourceTeam,
        position,
        radius,
        nowSeconds
      );
    }
  }

  relaySquadTargetCallout(
    spotterBot: BotAgent,
    targetId: string,
    targetPos: THREE.Vector3,
    nowSeconds: number
  ): void {
    if (spotterBot.team === 'ffa') return;
    const shareRadius = this.difficultyProfile.squadShareRadius;
    for (const teammate of this.bots) {
      if (
        teammate.id !== spotterBot.id &&
        teammate.team === spotterBot.team &&
        teammate.health.isAlive() &&
        teammate.position.distanceTo(spotterBot.position) <= shareRadius
      ) {
        teammate.perception.receiveSquadCallout(targetId, targetPos, nowSeconds);
      }
    }
  }
}
