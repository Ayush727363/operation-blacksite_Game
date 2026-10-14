import * as THREE from 'three';
import { PlayerHealth } from '../player/PlayerHealth.ts';
import { WeaponInstance } from '../weapons/WeaponBase.ts';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponDefinitions.ts';
import { BotPerception, PerceivableActor } from './BotPerception.ts';
import { BotNavigation } from './BotNavigation.ts';
import { BotCombatController } from './BotCombat.ts';
import { BotBrain, BotState } from './BotBrain.ts';
import { BotDifficultyProfile } from './BotDifficulty.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { SeededRandom } from '../core/Random.ts';

/**
 * Autonomous 3D Tactical Bot Agent with articulated procedural 3D character mesh,
 * perception, obstacle-aware waypoint navigation, cover seeking, and combat execution.
 */
export class BotAgent {
  readonly id: string;
  readonly name: string;
  team: 'alpha' | 'bravo' | 'ffa';
  readonly indexInTeam: number;

  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  crouching = false;
  isBombCarrier = false;
  plantingProgress = 0;
  defusingProgress = 0;

  readonly health = new PlayerHealth(100, 100, true);
  weapon: WeaponInstance;
  readonly perception = new BotPerception();
  readonly combat: BotCombatController;
  readonly brain = new BotBrain();
  readonly meshGroup: THREE.Group;

  private path: THREE.Vector3[] = [];
  private pathIndex = 0;
  private repathTimer = 0;
  private stuckTimer = 0;
  private lastProgressPos = new THREE.Vector3();
  private strafeDir = 1;
  private strafeTimer = 0;
  private wantsFlank = false;
  private perceptionTimer = 0;
  private cachedTargetMem: ReturnType<BotPerception['update']> = null;
  private readonly rng: SeededRandom;

  constructor(
    id: string,
    name: string,
    team: 'alpha' | 'bravo' | 'ffa',
    indexInTeam: number,
    weaponId = 'ak_vanguard',
    rng = new SeededRandom(500 + indexInTeam)
  ) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.indexInTeam = indexInTeam;
    this.rng = rng;
    this.combat = new BotCombatController(rng);
    this.weapon = new WeaponInstance(WEAPON_DEFINITIONS[weaponId] || WEAPON_DEFINITIONS.ak_vanguard);
    this.meshGroup = this.buildCharacterMesh();
  }

  private buildCharacterMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = `Bot_${this.id}`;

    const isAlpha = this.team === 'alpha';
    const uniformColor = isAlpha ? 0xd97706 : this.team === 'bravo' ? 0x0284c7 : 0xe11d48;
    const vestColor = 0x1e293b;
    const skinColor = 0xd6b49a;

    const uniformMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.72, metalness: 0.15 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.6, metalness: 0.35 });
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65, metalness: 0.05 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });

    // Legs
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.24), uniformMat);
    leftLeg.position.set(-0.14, 0.39, 0);
    g.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.24), uniformMat);
    rightLeg.position.set(0.14, 0.39, 0);
    g.add(rightLeg);

    // Torso & tactical vest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.34), vestMat);
    torso.position.set(0, 1.11, 0);
    g.add(torso);

    const shoulderBand = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.18, 0.36), uniformMat);
    shoulderBand.position.set(0, 1.32, 0);
    g.add(shoulderBand);

    // Head & tactical helmet/visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), headMat);
    head.position.set(0, 1.62, 0);
    g.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.35), vestMat);
    helmet.position.set(0, 1.74, 0);
    g.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.06), visorMat);
    visor.position.set(0, 1.64, -0.16);
    g.add(visor);

    // Weapon held in hands
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.68), visorMat);
    rifle.position.set(0.24, 1.15, -0.28);
    g.add(rifle);

    return g;
  }

  spawnAt(pos: THREE.Vector3, facingYaw: number, weaponId?: string): void {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.yaw = facingYaw;
    this.crouching = false;
    this.plantingProgress = 0;
    this.defusingProgress = 0;
    this.health.reset(true, true);
    if (weaponId && WEAPON_DEFINITIONS[weaponId]) {
      this.weapon = new WeaponInstance(WEAPON_DEFINITIONS[weaponId]);
    } else {
      this.weapon.refillAmmo();
    }
    this.perception.reset();
    this.combat.reset();
    this.brain.reset();
    this.path = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.stuckTimer = 0;
    this.lastProgressPos.copy(pos);
    this.wantsFlank = false;

    this.meshGroup.visible = true;
    this.meshGroup.position.copy(pos);
    this.meshGroup.rotation.set(0, facingYaw, 0);
    this.meshGroup.scale.set(1, 1, 1);
  }

  getEyePosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(
      this.position.x,
      this.position.y + (this.crouching ? 1.05 : 1.62),
      this.position.z
    );
  }

  onKilled(): void {
    this.health.kill();
    this.brain.transitionTo('dead');
    this.plantingProgress = 0;
    this.defusingProgress = 0;
    // Procedural death fall pose
    this.meshGroup.rotation.x = -Math.PI / 2;
    this.meshGroup.position.y = this.position.y + 0.25;
  }

  update(
    dt: number,
    nowSeconds: number,
    profile: BotDifficultyProfile,
    navigation: BotNavigation,
    collisionWorld: CollisionWorld,
    perceivableActors: PerceivableActor[],
    objectiveTargetPos: THREE.Vector3,
    gameMode: 'bomb_defusal' | 'team_deathmatch' | 'ffa_deathmatch',
    roundPhase: string,
    isInsideBombSite: boolean,
    isBombPlanted: boolean,
    plantedBombPos: THREE.Vector3 | null
  ): {
    wantsFire: boolean;
    aimDirection: THREE.Vector3;
    spottedTarget: { id: string; position: THREE.Vector3 } | null;
    completedPlant: boolean;
    completedDefuse: boolean;
  } {
    if (!this.health.isAlive()) {
      return {
        wantsFire: false,
        aimDirection: this.combat.getLookDirection(),
        spottedTarget: null,
        completedPlant: false,
        completedDefuse: false
      };
    }

    this.weapon.update(dt);
    this.repathTimer = Math.max(0, this.repathTimer - dt);
    this.strafeTimer = Math.max(0, this.strafeTimer - dt);

    const eyePos = this.getEyePosition();
    const lookDir = this.combat.getLookDirection();
    this.perceptionTimer -= dt;
    if (this.perceptionTimer <= 0 || !this.cachedTargetMem) {
      const interval = 0.06 + (this.indexInTeam % 4) * 0.015;
      const effectiveDt = Math.max(dt, interval);
      this.perceptionTimer = interval;
      this.cachedTargetMem = this.perception.update(
        effectiveDt,
        nowSeconds,
        eyePos,
        lookDir,
        this.team,
        perceivableActors,
        collisionWorld,
        profile
      );
    }
    const targetMem = this.cachedTargetMem;

    const soundAlertPos = this.perception.consumeSoundAlert(nowSeconds);
    const distToPlantedBomb = plantedBombPos ? this.position.distanceTo(plantedBombPos) : Infinity;

    if (targetMem && !targetMem.visible && this.strafeTimer <= 0) {
      this.wantsFlank = this.rng.next() < profile.flankProbability;
      this.strafeTimer = 2.0;
    }

    const state: BotState = this.brain.evaluate(dt, {
      alive: this.health.isAlive(),
      health: this.health.getHealth(),
      magazineAmmo: this.weapon.magazineAmmo,
      reserveAmmo: this.weapon.reserveAmmo,
      isReloading: this.weapon.reloader.isReloading(),
      hasVisibleTarget: Boolean(targetMem?.visible),
      hasReactedToTarget: Boolean(targetMem?.hasReacted),
      hasRecentTargetMemory: Boolean(targetMem && !targetMem.visible),
      hasSoundAlert: Boolean(soundAlertPos),
      gameMode,
      team: this.team,
      roundPhase,
      isBombCarrier: this.isBombCarrier,
      isInsideBombSite,
      isBombPlanted,
      distanceToPlantedBomb: distToPlantedBomb,
      coverThresholdHealth: profile.coverSeekThresholdHealth,
      wantsFlank: this.wantsFlank
    });

    let wantsFire = false;
    let aimDirection = this.combat.getLookDirection();
    let completedPlant = false;
    let completedDefuse = false;

    if (state === 'idle') {
      this.velocity.set(0, 0, 0);
      return { wantsFire: false, aimDirection, spottedTarget: null, completedPlant: false, completedDefuse: false };
    }

    if (state === 'reload') {
      this.weapon.startReload();
    }

    if (state === 'plant_bomb') {
      this.crouching = true;
      this.plantingProgress += dt;
      if (this.plantingProgress >= 3.2) {
        this.plantingProgress = 0;
        completedPlant = true;
      }
      return { wantsFire: false, aimDirection, spottedTarget: null, completedPlant, completedDefuse: false };
    } else {
      this.plantingProgress = 0;
    }

    if (state === 'defuse_bomb') {
      this.crouching = true;
      this.defusingProgress += dt;
      if (this.defusingProgress >= 5.0) {
        this.defusingProgress = 0;
        completedDefuse = true;
      }
      return { wantsFire: false, aimDirection, spottedTarget: null, completedPlant: false, completedDefuse };
    } else {
      this.defusingProgress = 0;
    }

    this.crouching = state === 'seek_cover' || (state === 'engage' && profile.level >= 6 && this.rng.next() < 0.25);

    // Determine navigation destination based on current FSM state
    let desiredGoal: THREE.Vector3 | null = null;
    if (state === 'seek_cover' || state === 'reload') {
      const threatPos = targetMem ? targetMem.lastKnownPosition : objectiveTargetPos;
      desiredGoal = navigation.findCoverPosition(this.position, threatPos, collisionWorld);
    } else if (state === 'search_last_known' || state === 'flank') {
      desiredGoal = targetMem ? targetMem.lastKnownPosition : objectiveTargetPos;
    } else if (state === 'investigate_sound' && soundAlertPos) {
      desiredGoal = soundAlertPos;
    } else if (state === 'move_to_objective' || state === 'defend_objective' || state === 'patrol') {
      desiredGoal = objectiveTargetPos;
    }

    // Recompute A* path if needed
    if (desiredGoal && (this.path.length === 0 || this.repathTimer <= 0)) {
      const avoid = state === 'flank' && targetMem ? targetMem.lastKnownPosition : undefined;
      this.path = navigation.findPath(this.position, desiredGoal, avoid);
      this.pathIndex = 0;
      this.repathTimer = 1.2 + this.rng.range(0, 0.5);
    }

    // Move along path or strafe during engagement
    let moveDir = new THREE.Vector3();
    if (state === 'engage' && targetMem) {
      // Tactical combat strafing perpendicular to target
      if (this.strafeTimer <= 0) {
        this.strafeDir = this.rng.next() < 0.5 ? 1 : -1;
        this.strafeTimer = 0.9 + this.rng.range(0, 0.6);
      }
      const toEnemy = new THREE.Vector3().subVectors(targetMem.lastKnownPosition, this.position).normalize();
      const perp = new THREE.Vector3(-toEnemy.z * this.strafeDir, 0, toEnemy.x * this.strafeDir);
      moveDir.copy(perp);
      if (targetMem.distance > 28) {
        moveDir.addScaledVector(toEnemy, 0.5).normalize();
      } else if (targetMem.distance < 7) {
        moveDir.addScaledVector(toEnemy, -0.5).normalize();
      }
    } else if (this.path.length > 0 && this.pathIndex < this.path.length) {
      const wp = this.path[this.pathIndex];
      const dx = wp.x - this.position.x;
      const dz = wp.z - this.position.z;
      const dist2D = Math.hypot(dx, dz);
      if (dist2D < 1.15) {
        this.pathIndex++;
        if (this.pathIndex >= this.path.length && state === 'investigate_sound') {
          this.perception.clearSoundAlert();
        }
      } else {
        moveDir.set(dx / dist2D, 0, dz / dist2D);
      }
    }

    // Stuck recovery check
    if (moveDir.lengthSq() > 0.1) {
      if (this.position.distanceTo(this.lastProgressPos) < 0.15) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.65) {
          // Sidestep and force repath
          const side = new THREE.Vector3(-moveDir.z, 0, moveDir.x);
          moveDir.add(side).normalize();
          this.repathTimer = 0;
          this.stuckTimer = 0;
        }
      } else {
        this.lastProgressPos.copy(this.position);
        this.stuckTimer = 0;
      }
    }

    const moveSpeed = (this.crouching ? 2.8 : 4.4) * this.weapon.def.movementSpeedMultiplier;
    const desiredPos = new THREE.Vector3(
      this.position.x + moveDir.x * moveSpeed * dt,
      this.position.y - 9.8 * dt,
      this.position.z + moveDir.z * moveSpeed * dt
    );

    const resolved = collisionWorld.resolveCharacterMovement(
      this.position,
      desiredPos,
      0.42,
      this.crouching ? 1.2 : 1.8
    );
    this.position.copy(resolved.position);

    // Update aiming and firing
    if (targetMem && (targetMem.visible || state === 'search_last_known')) {
      const combatRes = this.combat.updateAimAndTrigger(
        dt,
        eyePos,
        targetMem.lastKnownPosition,
        targetMem.visible && targetMem.hasReacted,
        this.weapon,
        profile
      );
      wantsFire = combatRes.shouldFire;
      aimDirection = combatRes.aimDirection;
    } else if (moveDir.lengthSq() > 0.05) {
      this.combat.setLookDirection(moveDir);
      aimDirection = this.combat.getLookDirection();
    }

    this.yaw = Math.atan2(-aimDirection.x, -aimDirection.z);
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.set(0, this.yaw, 0);
    this.meshGroup.scale.set(1, this.crouching ? 0.72 : 1.0, 1);

    return {
      wantsFire,
      aimDirection,
      spottedTarget: targetMem?.visible
        ? { id: targetMem.targetId, position: targetMem.lastKnownPosition.clone() }
        : null,
      completedPlant,
      completedDefuse
    };
  }
}
