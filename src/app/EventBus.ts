import { Vector3 } from 'three';

export interface GameEvents {
  'weapon:fired': {
    shooterId: string;
    weaponId: string;
    origin: Vector3;
    direction: Vector3;
    isPlayer: boolean;
  };
  'weapon:reload_start': { shooterId: string; weaponId: string; duration: number };
  'weapon:reload_complete': { shooterId: string; weaponId: string };
  'weapon:switched': { shooterId: string; weaponId: string };
  'weapon:empty': { shooterId: string; weaponId: string };
  'combat:hit': {
    attackerId: string;
    victimId: string;
    weaponId: string;
    damage: number;
    region: 'head' | 'torso' | 'limbs';
    headshot: boolean;
    point: Vector3;
    fatal: boolean;
  };
  'combat:kill': {
    killerId: string;
    killerName: string;
    killerTeam: 'alpha' | 'bravo' | 'ffa';
    victimId: string;
    victimName: string;
    victimTeam: 'alpha' | 'bravo' | 'ffa';
    weaponName: string;
    headshot: boolean;
  };
  'grenade:thrown': {
    throwerId: string;
    type: 'frag' | 'smoke' | 'flash' | 'decoy';
    origin: Vector3;
  };
  'grenade:detonated': {
    throwerId: string;
    type: 'frag' | 'smoke' | 'flash' | 'decoy';
    position: Vector3;
    radius: number;
  };
  'sound:emitted': {
    sourceId: string;
    team: 'alpha' | 'bravo' | 'ffa';
    position: Vector3;
    radius: number;
    category: 'gunshot' | 'footstep' | 'explosion' | 'bomb' | 'reload';
  };
  'round:phase_changed': {
    phase: string;
    roundNumber: number;
    duration: number;
  };
  'round:ended': {
    roundNumber: number;
    winner: 'alpha' | 'bravo' | 'draw' | 'ffa';
    reason: string;
  };
  'match:ended': {
    winner: string;
    alphaScore: number;
    bravoScore: number;
  };
  'bomb:planted': { planterId: string; site: 'A' | 'B'; position: Vector3 };
  'bomb:defused': { defuserId: string; site: 'A' | 'B' };
  'bomb:exploded': { site: 'A' | 'B'; position: Vector3 };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof GameEvents, Set<Handler<any>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
