import * as THREE from 'three';
import { BOMB_SITES } from '../world/LevelData.ts';

export type SquadRole = 'site_a' | 'site_b' | 'mid_flank';

/**
 * Coordinates bot squad role assignments so teammates distribute intelligently
 * across Bomb Site A, Bomb Site B, and Mid/Flank lanes, and relays spotted enemy callouts.
 */
export class SquadCoordinator {
  private assignments = new Map<string, SquadRole>();
  private primaryAttackSite: 'A' | 'B' = 'A';

  chooseRoundStrategy(roundNumber: number): void {
    this.primaryAttackSite = roundNumber % 2 === 1 ? 'A' : 'B';
    this.assignments.clear();
  }

  assignRole(botId: string, team: 'alpha' | 'bravo' | 'ffa', indexInTeam: number): SquadRole {
    const existing = this.assignments.get(botId);
    if (existing) return existing;

    let role: SquadRole;
    if (team === 'alpha') {
      // Attackers concentrate on primary site with a flanker
      if (indexInTeam % 3 === 2) {
        role = 'mid_flank';
      } else {
        role = this.primaryAttackSite === 'A' ? 'site_a' : 'site_b';
      }
    } else if (team === 'bravo') {
      // Defenders split evenly across Site A, Site B, and Mid
      const mod = indexInTeam % 3;
      role = mod === 0 ? 'site_a' : mod === 1 ? 'site_b' : 'mid_flank';
    } else {
      const mod = indexInTeam % 3;
      role = mod === 0 ? 'site_a' : mod === 1 ? 'site_b' : 'mid_flank';
    }

    this.assignments.set(botId, role);
    return role;
  }

  getObjectiveTargetPosition(
    botId: string,
    team: 'alpha' | 'bravo' | 'ffa',
    indexInTeam: number,
    bombPlanted: boolean,
    plantedBombPosition: THREE.Vector3 | null
  ): THREE.Vector3 {
    if (bombPlanted && plantedBombPosition) {
      return plantedBombPosition.clone();
    }

    const role = this.assignRole(botId, team, indexInTeam);
    if (role === 'site_a') {
      return BOMB_SITES.A.center.clone();
    }
    if (role === 'site_b') {
      return BOMB_SITES.B.center.clone();
    }
    return new THREE.Vector3(0, 0, 0); // Central Courtyard / Mid control
  }
}
