import * as THREE from 'three';
import { GRENADE_DEFINITIONS, GrenadeType } from './Grenades.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { EventBus } from '../app/EventBus.ts';

export interface ActiveGrenadeProjectile {
  id: string;
  throwerId: string;
  throwerTeam: 'alpha' | 'bravo' | 'ffa';
  type: GrenadeType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  remainingFuse: number;
  mesh: THREE.Mesh;
  detonated: boolean;
}

export interface ActiveSmokeCloud {
  id: string;
  position: THREE.Vector3;
  radius: number;
  elapsed: number;
  duration: number;
  group: THREE.Group;
}

export interface ActiveDecoyEmitter {
  id: string;
  throwerId: string;
  team: 'alpha' | 'bravo' | 'ffa';
  position: THREE.Vector3;
  remainingTime: number;
  pulseCooldown: number;
  mesh: THREE.Mesh;
}

/**
 * Simulates physical 3D grenade trajectories, gravity, wall/floor bounce physics,
 * fuse timers, smoke cloud deployment, and decoy acoustic emissions.
 */
export class ProjectileSystem {
  private readonly group: THREE.Group;
  private readonly eventBus: EventBus;
  private projectiles: ActiveGrenadeProjectile[] = [];
  private smokeClouds: ActiveSmokeCloud[] = [];
  private decoys: ActiveDecoyEmitter[] = [];
  private nextId = 1;

  readonly gravity = 17.5;
  readonly bounceRestitution = 0.44;
  readonly groundFriction = 0.78;

  constructor(effectsGroup: THREE.Group, eventBus: EventBus) {
    this.group = new THREE.Group();
    this.group.name = 'ProjectilesAndSmoke';
    effectsGroup.add(this.group);
    this.eventBus = eventBus;
  }

  spawnGrenade(
    throwerId: string,
    throwerTeam: 'alpha' | 'bravo' | 'ffa',
    type: GrenadeType,
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): ActiveGrenadeProjectile {
    const def = GRENADE_DEFINITIONS[type];
    const id = `grenade_${this.nextId++}`;
    const mat = new THREE.MeshStandardMaterial({
      color: def.colorHex,
      roughness: 0.45,
      metalness: 0.55
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8), mat);
    mesh.position.copy(origin);
    this.group.add(mesh);

    const vel = direction.clone().normalize().multiplyScalar(def.throwSpeed);
    vel.y += 2.6; // Upward lob arc

    const proj: ActiveGrenadeProjectile = {
      id,
      throwerId,
      throwerTeam,
      type,
      position: origin.clone(),
      velocity: vel,
      remainingFuse: def.fuseSeconds,
      mesh,
      detonated: false
    };
    this.projectiles.push(proj);

    this.eventBus.emit('grenade:thrown', {
      throwerId,
      type,
      origin: origin.clone()
    });

    return proj;
  }

  update(
    dt: number,
    nowSeconds: number,
    collisionWorld: CollisionWorld,
    onDetonate: (proj: ActiveGrenadeProjectile) => void
  ): void {
    // 1. Update flying grenades
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.remainingFuse -= dt;

      if (p.remainingFuse <= 0 && !p.detonated) {
        p.detonated = true;
        this.group.remove(p.mesh);
        this.projectiles.splice(i, 1);

        const def = GRENADE_DEFINITIONS[p.type];
        if (p.type === 'smoke') {
          this.deploySmokeCloud(p.id, p.position, def.effectRadius, def.effectDurationSeconds, nowSeconds, collisionWorld);
        } else if (p.type === 'decoy') {
          this.deployDecoy(p);
        }

        this.eventBus.emit('grenade:detonated', {
          throwerId: p.throwerId,
          type: p.type,
          position: p.position.clone(),
          radius: def.effectRadius
        });
        onDetonate(p);
        continue;
      }

      // Integrate velocity & gravity
      p.velocity.y -= this.gravity * dt;
      const stepVec = p.velocity.clone().multiplyScalar(dt);
      const stepDist = stepVec.length();

      if (stepDist > 0.0001) {
        const dir = stepVec.clone().divideScalar(stepDist);
        const hit = collisionWorld.raycastWorld(p.position, dir, stepDist + 0.12);
        if (hit.hit) {
          // Reflect velocity vector off surface normal: V' = V - 2*(V·N)*N
          const vDotN = p.velocity.dot(hit.normal);
          if (vDotN < 0) {
            p.velocity.addScaledVector(hit.normal, -2 * vDotN);
            p.velocity.multiplyScalar(this.bounceRestitution);
          }
          p.position.copy(hit.point).addScaledVector(hit.normal, 0.08);
        } else {
          p.position.add(stepVec);
        }
      }

      // Floor collision clamp
      if (p.position.y < 0.08) {
        p.position.y = 0.08;
        if (p.velocity.y < 0) {
          p.velocity.y = -p.velocity.y * 0.35;
          p.velocity.x *= this.groundFriction;
          p.velocity.z *= this.groundFriction;
        }
      }

      p.mesh.position.copy(p.position);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.z += dt * 4;
    }

    // 2. Update active smoke clouds
    collisionWorld.pruneExpiredSmoke(nowSeconds);
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const s = this.smokeClouds[i];
      s.elapsed += dt;
      if (s.elapsed >= s.duration) {
        this.group.remove(s.group);
        this.smokeClouds.splice(i, 1);
        continue;
      }
      // Gradual deployment & fade-out scaling
      const growFactor = Math.min(1, s.elapsed / 1.1);
      const fadeFactor = s.elapsed > s.duration - 2.0 ? (s.duration - s.elapsed) / 2.0 : 1.0;
      s.group.scale.setScalar(Math.max(0.1, growFactor));
      s.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          child.material.opacity = 0.72 * fadeFactor;
        }
      });
    }

    // 3. Update active decoys
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      d.remainingTime -= dt;
      d.pulseCooldown -= dt;
      if (d.remainingTime <= 0) {
        this.group.remove(d.mesh);
        this.decoys.splice(i, 1);
        continue;
      }
      if (d.pulseCooldown <= 0) {
        d.pulseCooldown = 1.15;
        this.eventBus.emit('sound:emitted', {
          sourceId: d.throwerId,
          team: d.team,
          position: d.position.clone(),
          radius: 32,
          category: 'gunshot'
        });
      }
    }
  }

  private deploySmokeCloud(
    id: string,
    position: THREE.Vector3,
    radius: number,
    duration: number,
    nowSeconds: number,
    collisionWorld: CollisionWorld
  ): void {
    collisionWorld.addSmokeVolume(id, position, radius, nowSeconds + duration);

    const cloudGroup = new THREE.Group();
    cloudGroup.position.copy(position);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    });

    // Multi-lobe volumetric smoke cluster constrained against walls
    const offsets = [
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(1.6, 1.2, 1.1),
      new THREE.Vector3(-1.6, 1.2, -1.1),
      new THREE.Vector3(1.3, 1.1, -1.4),
      new THREE.Vector3(-1.3, 1.1, 1.4),
      new THREE.Vector3(0, 2.5, 0)
    ];

    for (const off of offsets) {
      const targetPos = position.clone().add(off);
      if (collisionWorld.hasLineOfSight(position.clone().add(new THREE.Vector3(0, 0.5, 0)), targetPos, false)) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.52, 10, 8), smokeMat.clone());
        puff.position.copy(off);
        cloudGroup.add(puff);
      }
    }

    this.group.add(cloudGroup);
    this.smokeClouds.push({
      id,
      position: position.clone(),
      radius,
      elapsed: 0,
      duration,
      group: cloudGroup
    });
  }

  private deployDecoy(proj: ActiveGrenadeProjectile): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), mat);
    mesh.position.copy(proj.position);
    this.group.add(mesh);

    this.decoys.push({
      id: proj.id,
      throwerId: proj.throwerId,
      team: proj.throwerTeam,
      position: proj.position.clone(),
      remainingTime: GRENADE_DEFINITIONS.decoy.effectDurationSeconds,
      pulseCooldown: 0.2,
      mesh
    });
  }

  getActiveProjectiles(): ReadonlyArray<ActiveGrenadeProjectile> {
    return this.projectiles;
  }

  getActiveSmokeClouds(): ReadonlyArray<ActiveSmokeCloud> {
    return this.smokeClouds;
  }

  clearAll(): void {
    for (const p of this.projectiles) this.group.remove(p.mesh);
    for (const s of this.smokeClouds) this.group.remove(s.group);
    for (const d of this.decoys) this.group.remove(d.mesh);
    this.projectiles = [];
    this.smokeClouds = [];
    this.decoys = [];
  }
}
