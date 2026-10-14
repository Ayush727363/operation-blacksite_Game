import { WeaponDefinition } from './WeaponDefinitions.ts';
import { ReloadController } from './ReloadController.ts';

/**
 * Runtime instance of an equipped weapon tracking magazine ammo, reserve ammo,
 * fire cooldown, draw cooldown, sustained-fire spread bloom, and reload state.
 */
export class WeaponInstance {
  readonly def: WeaponDefinition;
  magazineAmmo: number;
  reserveAmmo: number;
  readonly reloader = new ReloadController();

  private fireCooldown = 0;
  private drawTimer = 0;
  private accumulatedSpreadDeg = 0;
  private triggerReleasedSinceLastShot = true;

  constructor(def: WeaponDefinition) {
    this.def = def;
    this.magazineAmmo = def.magazineSize;
    this.reserveAmmo = def.reserveAmmoMax;
  }

  onEquip(): void {
    this.reloader.cancel();
    this.drawTimer = this.def.drawDuration;
    this.triggerReleasedSinceLastShot = true;
  }

  setTriggerReleased(released: boolean): void {
    if (released) {
      this.triggerReleasedSinceLastShot = true;
    }
  }

  canFire(): boolean {
    if (this.reloader.isReloading()) return false;
    if (this.drawTimer > 0) return false;
    if (this.fireCooldown > 0) return false;
    if (this.def.fireMode === 'semi' && !this.triggerReleasedSinceLastShot) return false;
    if (this.def.category !== 'melee' && this.magazineAmmo <= 0) return false;
    return true;
  }

  consumeShot(): boolean {
    if (!this.canFire()) return false;
    if (this.def.category !== 'melee') {
      this.magazineAmmo = Math.max(0, this.magazineAmmo - 1);
    }
    this.fireCooldown = 60 / this.def.rpm;
    this.accumulatedSpreadDeg = Math.min(7.5, this.accumulatedSpreadDeg + this.def.spreadPerShotDeg);
    this.triggerReleasedSinceLastShot = false;
    return true;
  }

  startReload(): boolean {
    if (this.def.category === 'melee') return false;
    return this.reloader.startReload(
      this.def.reloadDuration,
      this.magazineAmmo,
      this.def.magazineSize,
      this.reserveAmmo
    );
  }

  cancelReload(): void {
    this.reloader.cancel();
  }

  update(dt: number): { reloadCompleted: boolean } {
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }
    if (this.drawTimer > 0) {
      this.drawTimer = Math.max(0, this.drawTimer - dt);
    }
    if (this.accumulatedSpreadDeg > 0 && this.fireCooldown <= 0) {
      this.accumulatedSpreadDeg = Math.max(
        0,
        this.accumulatedSpreadDeg - this.def.spreadRecoveryRate * dt
      );
    }

    const res = this.reloader.update(
      dt,
      this.magazineAmmo,
      this.def.magazineSize,
      this.reserveAmmo
    );
    if (res.completed) {
      this.magazineAmmo = res.newMag;
      this.reserveAmmo = res.newReserve;
    }
    return { reloadCompleted: res.completed };
  }

  getAccumulatedSpreadDeg(): number {
    return this.accumulatedSpreadDeg;
  }

  getDrawProgress(): number {
    if (this.def.drawDuration <= 0) return 1;
    return 1 - this.drawTimer / this.def.drawDuration;
  }

  refillAmmo(): void {
    this.reloader.cancel();
    this.magazineAmmo = this.def.magazineSize;
    this.reserveAmmo = this.def.reserveAmmoMax;
    this.fireCooldown = 0;
    this.accumulatedSpreadDeg = 0;
  }
}
