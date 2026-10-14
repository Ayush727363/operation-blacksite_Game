export type GrenadeType = 'frag' | 'smoke' | 'flash' | 'decoy';

export interface GrenadeDefinition {
  type: GrenadeType;
  name: string;
  price: number;
  maxCarry: number;
  throwSpeed: number;
  fuseSeconds: number;
  effectRadius: number;
  maxDamage: number;
  effectDurationSeconds: number;
  colorHex: number;
}

export const GRENADE_DEFINITIONS: Record<GrenadeType, GrenadeDefinition> = {
  frag: {
    type: 'frag',
    name: 'M67 Frag Grenade',
    price: 300,
    maxCarry: 1,
    throwSpeed: 19.5,
    fuseSeconds: 2.1,
    effectRadius: 9.5,
    maxDamage: 98,
    effectDurationSeconds: 0.5,
    colorHex: 0x3f6212
  },
  smoke: {
    type: 'smoke',
    name: 'AN-M18 Smoke Grenade',
    price: 300,
    maxCarry: 1,
    throwSpeed: 18.5,
    fuseSeconds: 1.5,
    effectRadius: 4.8,
    maxDamage: 0,
    effectDurationSeconds: 14.0,
    colorHex: 0x64748b
  },
  flash: {
    type: 'flash',
    name: 'M84 Flashbang',
    price: 200,
    maxCarry: 2,
    throwSpeed: 19.0,
    fuseSeconds: 1.35,
    effectRadius: 18.0,
    maxDamage: 0,
    effectDurationSeconds: 3.2,
    colorHex: 0x0284c7
  },
  decoy: {
    type: 'decoy',
    name: 'Acoustic Decoy',
    price: 50,
    maxCarry: 1,
    throwSpeed: 19.0,
    fuseSeconds: 1.2,
    effectRadius: 28.0,
    maxDamage: 0,
    effectDurationSeconds: 9.0,
    colorHex: 0xd97706
  }
};

/**
 * Tracks a player's or bot's grenade inventory, selected grenade type, and throw cooldown.
 */
export class GrenadeInventory {
  private counts: Record<GrenadeType, number> = {
    frag: 1,
    smoke: 1,
    flash: 1,
    decoy: 0
  };
  private selectedType: GrenadeType = 'frag';
  private cooldown = 0;

  getCount(type: GrenadeType): number {
    return this.counts[type] || 0;
  }

  getTotalCount(): number {
    return this.counts.frag + this.counts.smoke + this.counts.flash + this.counts.decoy;
  }

  getSelectedType(): GrenadeType {
    if (this.counts[this.selectedType] <= 0) {
      const types: GrenadeType[] = ['frag', 'smoke', 'flash', 'decoy'];
      for (const t of types) {
        if (this.counts[t] > 0) {
          this.selectedType = t;
          break;
        }
      }
    }
    return this.selectedType;
  }

  cycleSelected(): GrenadeType {
    const order: GrenadeType[] = ['frag', 'smoke', 'flash', 'decoy'];
    const startIdx = order.indexOf(this.selectedType);
    for (let i = 1; i <= order.length; i++) {
      const next = order[(startIdx + i) % order.length];
      if (this.counts[next] > 0) {
        this.selectedType = next;
        return next;
      }
    }
    return this.selectedType;
  }

  canAdd(type: GrenadeType): boolean {
    return this.counts[type] < GRENADE_DEFINITIONS[type].maxCarry;
  }

  addGrenade(type: GrenadeType): boolean {
    if (!this.canAdd(type)) return false;
    this.counts[type]++;
    this.selectedType = type;
    return true;
  }

  consumeThrow(): GrenadeType | null {
    if (this.cooldown > 0) return null;
    const type = this.getSelectedType();
    if (this.counts[type] <= 0) return null;
    this.counts[type]--;
    this.cooldown = 0.85;
    return type;
  }

  update(dt: number): void {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
    }
  }

  resetDefault(): void {
    this.counts = { frag: 1, smoke: 1, flash: 1, decoy: 0 };
    this.selectedType = 'frag';
    this.cooldown = 0;
  }
}
