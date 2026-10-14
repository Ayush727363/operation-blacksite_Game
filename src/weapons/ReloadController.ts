/**
 * Manages weapon reload timers, cancellation on weapon switch,
 * and conservation of magazine + reserve ammunition.
 */
export class ReloadController {
  private reloading = false;
  private remainingTime = 0;
  private totalDuration = 0;

  isReloading(): boolean {
    return this.reloading;
  }

  getProgress(): number {
    if (!this.reloading || this.totalDuration <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - this.remainingTime / this.totalDuration));
  }

  startReload(duration: number, currentMag: number, magSize: number, reserveAmmo: number): boolean {
    if (this.reloading) return false;
    if (duration <= 0) return false;
    if (currentMag >= magSize || reserveAmmo <= 0) return false;

    this.reloading = true;
    this.totalDuration = duration;
    this.remainingTime = duration;
    return true;
  }

  cancel(): void {
    this.reloading = false;
    this.remainingTime = 0;
    this.totalDuration = 0;
  }

  update(
    dt: number,
    currentMag: number,
    magSize: number,
    reserveAmmo: number
  ): { completed: boolean; newMag: number; newReserve: number } {
    if (!this.reloading) {
      return { completed: false, newMag: currentMag, newReserve: reserveAmmo };
    }

    this.remainingTime -= dt;
    if (this.remainingTime > 0) {
      return { completed: false, newMag: currentMag, newReserve: reserveAmmo };
    }

    this.reloading = false;
    this.remainingTime = 0;
    const needed = Math.max(0, magSize - currentMag);
    const transferred = Math.min(needed, reserveAmmo);
    return {
      completed: true,
      newMag: currentMag + transferred,
      newReserve: reserveAmmo - transferred
    };
  }
}
