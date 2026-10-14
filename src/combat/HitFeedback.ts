/**
 * Tracks hit-marker state, headshot confirmation state, incoming damage directional
 * vignette, and flashbang visual impairment duration for the HUD.
 */
export class HitFeedbackState {
  private hitMarkerTimer = 0;
  private headshotMarker = false;
  private killMarker = false;
  private damageFlashAlpha = 0;
  private flashbangAlpha = 0;

  triggerHitMarker(headshot: boolean, fatal: boolean): void {
    this.hitMarkerTimer = fatal ? 0.34 : 0.2;
    this.headshotMarker = headshot;
    this.killMarker = fatal;
  }

  triggerIncomingDamage(damageAmount: number): void {
    const add = Math.min(0.65, Math.max(0.18, damageAmount / 80));
    this.damageFlashAlpha = Math.min(0.85, this.damageFlashAlpha + add);
  }

  triggerFlashbang(intensity: number): void {
    // Bounded flashbang impairment so screen is never permanently obstructed
    const clamped = Math.max(0, Math.min(0.95, intensity));
    this.flashbangAlpha = Math.max(this.flashbangAlpha, clamped);
  }

  update(dt: number): void {
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    }
    if (this.damageFlashAlpha > 0) {
      this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - dt * 1.45);
    }
    if (this.flashbangAlpha > 0) {
      this.flashbangAlpha = Math.max(0, this.flashbangAlpha - dt * 0.42);
    }
  }

  getHitMarkerState(): { active: boolean; headshot: boolean; fatal: boolean; alpha: number } {
    return {
      active: this.hitMarkerTimer > 0,
      headshot: this.headshotMarker,
      fatal: this.killMarker,
      alpha: Math.min(1, this.hitMarkerTimer * 6)
    };
  }

  getDamageFlashAlpha(): number {
    return this.damageFlashAlpha;
  }

  getFlashbangAlpha(): number {
    return this.flashbangAlpha;
  }

  reset(): void {
    this.hitMarkerTimer = 0;
    this.headshotMarker = false;
    this.killMarker = false;
    this.damageFlashAlpha = 0;
    this.flashbangAlpha = 0;
  }
}
