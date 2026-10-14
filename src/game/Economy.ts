import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions.ts';
import { GRENADE_DEFINITIONS, GrenadeType } from '../weapons/Grenades.ts';

export interface PurchaseResult {
  success: boolean;
  reason?: string;
  cost: number;
  remainingMoney: number;
}

export const ARMOR_PRICES = {
  kevlar: 650,
  kevlarAndHelmet: 1000
};

/**
 * Manages player tactical economy: money balance, max cap ($16,000),
 * kill/round rewards, consecutive loss bonuses, and purchase validation.
 */
export class EconomySystem {
  private money: number;
  private readonly maxMoney: number;
  private consecutiveLosses = 0;

  constructor(startingMoney = 800, maxMoney = 16000) {
    this.maxMoney = maxMoney;
    this.money = Math.min(maxMoney, Math.max(0, startingMoney));
  }

  getMoney(): number {
    return this.money;
  }

  setMoney(amount: number): void {
    this.money = Math.min(this.maxMoney, Math.max(0, Math.round(amount)));
  }

  addMoney(amount: number): number {
    if (amount <= 0) return this.money;
    this.money = Math.min(this.maxMoney, this.money + Math.round(amount));
    return this.money;
  }

  awardKill(weaponId: string): number {
    const wep = WEAPON_DEFINITIONS[weaponId];
    const reward = wep ? wep.killReward : 300;
    return this.addMoney(reward);
  }

  awardRoundOutcome(won: boolean, byObjective = false): number {
    if (won) {
      this.consecutiveLosses = 0;
      const winBonus = byObjective ? 3500 : 3250;
      return this.addMoney(winBonus);
    } else {
      this.consecutiveLosses = Math.min(4, this.consecutiveLosses + 1);
      const lossBonus = 1400 + this.consecutiveLosses * 500;
      return this.addMoney(lossBonus);
    }
  }

  tryPurchaseWeapon(
    weaponId: string,
    currentlyEquippedIds: string[],
    buyPhaseAllowed: boolean
  ): PurchaseResult {
    if (!buyPhaseAllowed) {
      return { success: false, reason: 'Buy phase has expired', cost: 0, remainingMoney: this.money };
    }
    const def = WEAPON_DEFINITIONS[weaponId];
    if (!def) {
      return { success: false, reason: 'Unknown weapon', cost: 0, remainingMoney: this.money };
    }
    if (currentlyEquippedIds.includes(weaponId)) {
      return { success: false, reason: 'Weapon already equipped', cost: 0, remainingMoney: this.money };
    }
    if (this.money < def.price) {
      return { success: false, reason: 'Insufficient funds', cost: def.price, remainingMoney: this.money };
    }

    this.money -= def.price;
    return { success: true, cost: def.price, remainingMoney: this.money };
  }

  tryPurchaseGrenade(
    type: GrenadeType,
    canCarryMore: boolean,
    buyPhaseAllowed: boolean
  ): PurchaseResult {
    if (!buyPhaseAllowed) {
      return { success: false, reason: 'Buy phase has expired', cost: 0, remainingMoney: this.money };
    }
    const def = GRENADE_DEFINITIONS[type];
    if (!def) {
      return { success: false, reason: 'Unknown grenade', cost: 0, remainingMoney: this.money };
    }
    if (!canCarryMore) {
      return { success: false, reason: 'Max carry capacity reached', cost: 0, remainingMoney: this.money };
    }
    if (this.money < def.price) {
      return { success: false, reason: 'Insufficient funds', cost: def.price, remainingMoney: this.money };
    }

    this.money -= def.price;
    return { success: true, cost: def.price, remainingMoney: this.money };
  }

  tryPurchaseArmor(
    withHelmet: boolean,
    currentArmor: number,
    currentlyHasHelmet: boolean,
    buyPhaseAllowed: boolean
  ): PurchaseResult {
    if (!buyPhaseAllowed) {
      return { success: false, reason: 'Buy phase has expired', cost: 0, remainingMoney: this.money };
    }
    if (currentArmor >= 100 && (!withHelmet || currentlyHasHelmet)) {
      return { success: false, reason: 'Armor already full', cost: 0, remainingMoney: this.money };
    }

    const cost = withHelmet
      ? currentArmor >= 100 && !currentlyHasHelmet
        ? 350
        : ARMOR_PRICES.kevlarAndHelmet
      : ARMOR_PRICES.kevlar;

    if (this.money < cost) {
      return { success: false, reason: 'Insufficient funds', cost, remainingMoney: this.money };
    }

    this.money -= cost;
    return { success: true, cost, remainingMoney: this.money };
  }

  reset(startingMoney = 800): void {
    this.money = Math.min(this.maxMoney, Math.max(0, startingMoney));
    this.consecutiveLosses = 0;
  }
}
