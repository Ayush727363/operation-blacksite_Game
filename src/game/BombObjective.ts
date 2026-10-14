import * as THREE from 'three';

export type BombStatus = 'carried' | 'planting' | 'planted' | 'defusing' | 'defused' | 'exploded';

/**
 * Tracks C4 bomb objective state: planting progress, planted site & coordinates,
 * fuse countdown, defusal progress, and explosion/defusal resolution.
 */
export class BombObjective {
  private status: BombStatus = 'carried';
  private plantedSite: 'A' | 'B' | null = null;
  private plantedPosition = new THREE.Vector3();
  private fuseRemaining = 40.0;
  private readonly fuseDuration: number;
  private readonly plantDuration: number;
  private readonly defuseDuration: number;

  private plantProgress = 0;
  private defuseProgress = 0;
  private activePlanterId: string | null = null;
  private activeDefuserId: string | null = null;

  constructor(fuseDuration = 40.0, plantDuration = 3.2, defuseDuration = 5.0) {
    this.fuseDuration = fuseDuration;
    this.plantDuration = plantDuration;
    this.defuseDuration = defuseDuration;
  }

  getStatus(): BombStatus {
    return this.status;
  }

  isPlanted(): boolean {
    return this.status === 'planted' || this.status === 'defusing';
  }

  getPlantedSite(): 'A' | 'B' | null {
    return this.plantedSite;
  }

  getPlantedPosition(): THREE.Vector3 | null {
    return this.plantedSite ? this.plantedPosition.clone() : null;
  }

  getFuseRemaining(): number {
    return this.fuseRemaining;
  }

  getFuseRatio(): number {
    return Math.max(0, Math.min(1, this.fuseRemaining / this.fuseDuration));
  }

  getPlantProgressRatio(): number {
    return Math.max(0, Math.min(1, this.plantProgress / this.plantDuration));
  }

  getDefuseProgressRatio(): number {
    return Math.max(0, Math.min(1, this.defuseProgress / this.defuseDuration));
  }

  updatePlanting(dt: number, planterId: string, site: 'A' | 'B', position: THREE.Vector3): boolean {
    if (this.status !== 'carried' && this.status !== 'planting') return false;
    this.status = 'planting';
    this.activePlanterId = planterId;
    this.plantProgress += dt;

    if (this.plantProgress >= this.plantDuration) {
      this.plantImmediately(planterId, site, position);
      return true;
    }
    return false;
  }

  cancelPlanting(planterId?: string): void {
    if (this.status === 'planting' && (!planterId || this.activePlanterId === planterId)) {
      this.status = 'carried';
      this.plantProgress = 0;
      this.activePlanterId = null;
    }
  }

  plantImmediately(_planterId: string, site: 'A' | 'B', position: THREE.Vector3): void {
    this.status = 'planted';
    this.plantedSite = site;
    this.plantedPosition.copy(position);
    this.fuseRemaining = this.fuseDuration;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.activePlanterId = null;
  }

  updateDefusing(dt: number, defuserId: string): boolean {
    if (this.status !== 'planted' && this.status !== 'defusing') return false;
    this.status = 'defusing';
    this.activeDefuserId = defuserId;
    this.defuseProgress += dt;

    if (this.defuseProgress >= this.defuseDuration) {
      this.defuseImmediately();
      return true;
    }
    return false;
  }

  cancelDefusing(defuserId?: string): void {
    if (this.status === 'defusing' && (!defuserId || this.activeDefuserId === defuserId)) {
      this.status = 'planted';
      this.defuseProgress = 0;
      this.activeDefuserId = null;
    }
  }

  defuseImmediately(): void {
    this.status = 'defused';
    this.defuseProgress = 0;
    this.activeDefuserId = null;
  }

  updateFuse(dt: number): { exploded: boolean } {
    if (this.status !== 'planted' && this.status !== 'defusing') {
      return { exploded: false };
    }
    this.fuseRemaining = Math.max(0, this.fuseRemaining - dt);
    if (this.fuseRemaining <= 0) {
      this.status = 'exploded';
      return { exploded: true };
    }
    return { exploded: false };
  }

  reset(): void {
    this.status = 'carried';
    this.plantedSite = null;
    this.fuseRemaining = this.fuseDuration;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.activePlanterId = null;
    this.activeDefuserId = null;
  }
}
