export interface KillFeedItem {
  id: number;
  killerName: string;
  killerTeam: 'alpha' | 'bravo' | 'ffa';
  victimName: string;
  victimTeam: 'alpha' | 'bravo' | 'ffa';
  weaponName: string;
  headshot: boolean;
  expiresAt: number;
}

/**
 * Maintains the chronological combat kill feed and deduplicates kill awards per victim life.
 */
export class CombatEventLog {
  private feed: KillFeedItem[] = [];
  private nextId = 1;
  private processedVictimDeathsThisLife = new Set<string>();

  clearRoundDeaths(): void {
    this.processedVictimDeathsThisLife.clear();
  }

  clearVictimLock(victimId: string): void {
    this.processedVictimDeathsThisLife.delete(victimId);
  }

  recordKill(
    killerName: string,
    killerTeam: 'alpha' | 'bravo' | 'ffa',
    victimId: string,
    victimName: string,
    victimTeam: 'alpha' | 'bravo' | 'ffa',
    weaponName: string,
    headshot: boolean,
    nowSeconds: number
  ): boolean {
    if (this.processedVictimDeathsThisLife.has(victimId)) {
      return false; // Prevent duplicate kill event from multi-pellet shotgun or simultaneous hits
    }
    this.processedVictimDeathsThisLife.add(victimId);
    this.feed.unshift({
      id: this.nextId++,
      killerName,
      killerTeam,
      victimName,
      victimTeam,
      weaponName,
      headshot,
      expiresAt: nowSeconds + 6.0
    });
    if (this.feed.length > 6) {
      this.feed.pop();
    }
    return true;
  }

  getActiveFeed(nowSeconds: number): ReadonlyArray<KillFeedItem> {
    this.feed = this.feed.filter((item) => item.expiresAt > nowSeconds);
    return this.feed;
  }

  reset(): void {
    this.feed = [];
    this.processedVictimDeathsThisLife.clear();
  }
}
