import * as THREE from 'three';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { BotDifficultyProfile } from './BotDifficulty.ts';

export interface PerceivableActor {
  id: string;
  team: 'alpha' | 'bravo' | 'ffa';
  feetPosition: THREE.Vector3;
  eyePosition: THREE.Vector3;
  alive: boolean;
}

export interface PerceivedTargetMemory {
  targetId: string;
  visible: boolean;
  continuousVisibleSeconds: number;
  hasReacted: boolean;
  lastKnownPosition: THREE.Vector3;
  lastSeenTimestamp: number;
  distance: number;
}

/**
 * Handles bot sensory perception:
 * - Field-of-view cone checks
 * - Maximum detection range
 * - Strict raycast line-of-sight checks (blocked by walls, cover, and active smoke)
 * - Reaction time delay before a newly spotted enemy can be engaged
 * - Last-known position memory and sound-event investigation
 */
export class BotPerception {
  private memories = new Map<string, PerceivedTargetMemory>();
  private latestSoundAlert: { position: THREE.Vector3; timestamp: number; priority: number } | null = null;
  private blindedTimer = 0;

  applyFlashBlindness(durationSeconds: number): void {
    this.blindedTimer = Math.max(this.blindedTimer, Math.min(3.5, durationSeconds));
  }

  isBlinded(): boolean {
    return this.blindedTimer > 0;
  }

  receiveSoundEvent(
    botPos: THREE.Vector3,
    botTeam: 'alpha' | 'bravo' | 'ffa',
    sourceTeam: 'alpha' | 'bravo' | 'ffa',
    soundPos: THREE.Vector3,
    soundRadius: number,
    nowSeconds: number
  ): void {
    if (botTeam !== 'ffa' && botTeam === sourceTeam) return;
    const dist = botPos.distanceTo(soundPos);
    if (dist > soundRadius) return;

    const priority = 1 - dist / Math.max(1, soundRadius);
    if (!this.latestSoundAlert || nowSeconds - this.latestSoundAlert.timestamp > 3.0 || priority > this.latestSoundAlert.priority) {
      this.latestSoundAlert = {
        position: soundPos.clone(),
        timestamp: nowSeconds,
        priority
      };
    }
  }

  receiveSquadCallout(targetId: string, position: THREE.Vector3, nowSeconds: number): void {
    const existing = this.memories.get(targetId);
    if (!existing) {
      this.memories.set(targetId, {
        targetId,
        visible: false,
        continuousVisibleSeconds: 0,
        hasReacted: false,
        lastKnownPosition: position.clone(),
        lastSeenTimestamp: nowSeconds,
        distance: 30
      });
    } else if (!existing.visible) {
      existing.lastKnownPosition.copy(position);
      existing.lastSeenTimestamp = nowSeconds;
    }
  }

  update(
    dt: number,
    nowSeconds: number,
    botEyePos: THREE.Vector3,
    botLookDir: THREE.Vector3,
    botTeam: 'alpha' | 'bravo' | 'ffa',
    candidates: PerceivableActor[],
    collisionWorld: CollisionWorld,
    profile: BotDifficultyProfile
  ): PerceivedTargetMemory | null {
    if (this.blindedTimer > 0) {
      this.blindedTimer = Math.max(0, this.blindedTimer - dt);
      for (const m of this.memories.values()) {
        m.visible = false;
        m.continuousVisibleSeconds = 0;
        m.hasReacted = false;
      }
      return null;
    }

    const halfFovCos = Math.cos(THREE.MathUtils.degToRad(profile.fovDegrees * 0.5));
    const forward = botLookDir.clone().normalize();
    let bestTarget: PerceivedTargetMemory | null = null;
    let bestScore = -Infinity;

    for (const actor of candidates) {
      if (!actor.alive) {
        this.memories.delete(actor.id);
        continue;
      }
      if (botTeam !== 'ffa' && actor.team === botTeam) continue;

      const toTarget = new THREE.Vector3().subVectors(actor.eyePosition, botEyePos);
      const dist = toTarget.length();
      let canSee = false;

      if (dist <= profile.maxDetectionRange && dist > 0.05) {
        const dirToTarget = toTarget.clone().divideScalar(dist);
        const dot = forward.dot(dirToTarget);
        if (dot >= halfFovCos) {
          // Check both eye-to-eye and eye-to-torso LOS against walls and smoke
          const torsoPos = actor.feetPosition.clone().add(new THREE.Vector3(0, 1.15, 0));
          canSee =
            collisionWorld.hasLineOfSight(botEyePos, actor.eyePosition, true) ||
            collisionWorld.hasLineOfSight(botEyePos, torsoPos, true);
        }
      }

      let mem = this.memories.get(actor.id);
      if (canSee) {
        if (!mem) {
          mem = {
            targetId: actor.id,
            visible: true,
            continuousVisibleSeconds: dt,
            hasReacted: dt >= profile.reactionTimeSeconds,
            lastKnownPosition: actor.feetPosition.clone(),
            lastSeenTimestamp: nowSeconds,
            distance: dist
          };
          this.memories.set(actor.id, mem);
        } else {
          mem.visible = true;
          mem.continuousVisibleSeconds += dt;
          if (mem.continuousVisibleSeconds >= profile.reactionTimeSeconds) {
            mem.hasReacted = true;
          }
          mem.lastKnownPosition.copy(actor.feetPosition);
          mem.lastSeenTimestamp = nowSeconds;
          mem.distance = dist;
        }
      } else if (mem) {
        mem.visible = false;
        mem.continuousVisibleSeconds = 0;
        mem.hasReacted = false;
        mem.distance = dist;
      }

      if (mem) {
        const age = nowSeconds - mem.lastSeenTimestamp;
        if (mem.visible) {
          const score = 100 - dist + (mem.hasReacted ? 40 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestTarget = mem;
          }
        } else if (age <= profile.searchDurationSeconds) {
          const score = 20 - age * 2 - dist * 0.2;
          if (score > bestScore) {
            bestScore = score;
            bestTarget = mem;
          }
        }
      }
    }

    return bestTarget;
  }

  consumeSoundAlert(nowSeconds: number, maxAgeSeconds = 5.0): THREE.Vector3 | null {
    if (!this.latestSoundAlert) return null;
    if (nowSeconds - this.latestSoundAlert.timestamp > maxAgeSeconds) {
      this.latestSoundAlert = null;
      return null;
    }
    return this.latestSoundAlert.position.clone();
  }

  clearSoundAlert(): void {
    this.latestSoundAlert = null;
  }

  reset(): void {
    this.memories.clear();
    this.latestSoundAlert = null;
    this.blindedTimer = 0;
  }
}
