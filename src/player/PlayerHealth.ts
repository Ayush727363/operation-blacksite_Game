/**
 * Manages health, Kevlar/helmet armor absorption, damage history, and alive state
 * for the player or an agent.
 */
export class PlayerHealth {
  private maxHealth: number;
  private health: number;
  private armor: number;
  private hasHelmet: boolean;
  private alive = true;

  constructor(maxHealth = 100, startingArmor = 0, hasHelmet = false) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.armor = startingArmor;
    this.hasHelmet = hasHelmet;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getArmor(): number {
    return this.armor;
  }

  hasHelmetProtection(): boolean {
    return this.hasHelmet;
  }

  isAlive(): boolean {
    return this.alive && this.health > 0;
  }

  grantArmor(amount: number, withHelmet = false): void {
    this.armor = Math.min(100, Math.max(this.armor, amount));
    if (withHelmet) {
      this.hasHelmet = true;
    }
  }

  /**
   * Applies damage after accounting for armor penetration rules.
   * Returns actual health damage dealt and whether this hit was fatal.
   */
  applyDamage(
    rawDamage: number,
    armorPenetration = 0.7,
    isHeadshot = false
  ): { healthDamage: number; armorDamage: number; fatal: boolean } {
    if (!this.alive || rawDamage <= 0) {
      return { healthDamage: 0, armorDamage: 0, fatal: false };
    }

    let effectiveDamage = rawDamage;
    let armorDamage = 0;

    const protectedByArmor = this.armor > 0 && (!isHeadshot || this.hasHelmet);
    if (protectedByArmor) {
      const mitigated = rawDamage * (1 - armorPenetration);
      armorDamage = Math.min(this.armor, Math.ceil(mitigated * 0.65));
      this.armor = Math.max(0, this.armor - armorDamage);
      effectiveDamage = rawDamage * armorPenetration;
    }

    const healthDamage = Math.max(1, Math.round(effectiveDamage));
    this.health = Math.max(0, this.health - healthDamage);
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      return { healthDamage, armorDamage, fatal: true };
    }

    return { healthDamage, armorDamage, fatal: false };
  }

  kill(): void {
    this.health = 0;
    this.alive = false;
  }

  reset(fullArmor = false, withHelmet = false): void {
    this.health = this.maxHealth;
    this.alive = true;
    if (fullArmor) {
      this.armor = 100;
      this.hasHelmet = withHelmet;
    }
  }
}
