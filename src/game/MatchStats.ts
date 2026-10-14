export interface ParticipantStats {
  id: string;
  name: string;
  team: 'alpha' | 'bravo' | 'ffa';
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  plants: number;
  defuses: number;
  score: number;
  alive: boolean;
}

/**
 * Tracks per-player and per-bot match scoreboard statistics and round history.
 */
export class MatchStats {
  private stats = new Map<string, ParticipantStats>();
  private roundHistory: Array<{ round: number; winner: string; reason: string }> = [];

  registerParticipant(id: string, name: string, team: 'alpha' | 'bravo' | 'ffa'): void {
    if (!this.stats.has(id)) {
      this.stats.set(id, {
        id,
        name,
        team,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        plants: 0,
        defuses: 0,
        score: 0,
        alive: true
      });
    } else {
      const s = this.stats.get(id)!;
      s.name = name;
      s.team = team;
    }
  }

  setAliveStatus(id: string, alive: boolean): void {
    const s = this.stats.get(id);
    if (s) s.alive = alive;
  }

  recordKill(killerId: string, victimId: string, headshot: boolean): void {
    const killer = this.stats.get(killerId);
    if (killer && killerId !== victimId) {
      killer.kills++;
      if (headshot) killer.headshots++;
      killer.score += headshot ? 125 : 100;
    }
    const victim = this.stats.get(victimId);
    if (victim) {
      victim.deaths++;
      victim.alive = false;
    }
  }

  recordBombPlant(planterId: string): void {
    const p = this.stats.get(planterId);
    if (p) {
      p.plants++;
      p.score += 200;
    }
  }

  recordBombDefuse(defuserId: string): void {
    const d = this.stats.get(defuserId);
    if (d) {
      d.defuses++;
      d.score += 250;
    }
  }

  recordRoundOutcome(round: number, winner: string, reason: string): void {
    this.roundHistory.push({ round, winner, reason });
  }

  getParticipant(id: string): ParticipantStats | undefined {
    return this.stats.get(id);
  }

  getAllSorted(): ParticipantStats[] {
    return Array.from(this.stats.values()).sort((a, b) => b.score - a.score || b.kills - a.kills);
  }

  getHighestKillsParticipant(): ParticipantStats | null {
    let best: ParticipantStats | null = null;
    for (const s of this.stats.values()) {
      if (!best || s.kills > best.kills) {
        best = s;
      }
    }
    return best;
  }

  getRoundHistory(): ReadonlyArray<{ round: number; winner: string; reason: string }> {
    return this.roundHistory;
  }

  reset(): void {
    this.stats.clear();
    this.roundHistory = [];
  }
}
