import * as THREE from 'three';
import { CollisionWorld } from '../core/CollisionWorld.ts';

export interface MovementInputState {
  forward: number; // -1 to 1
  right: number; // -1 to 1
  sprint: boolean;
  crouch: boolean;
  jump: boolean;
  yaw: number;
  weaponSpeedMultiplier: number;
}

/**
 * Collision-aware first-person character physics controller.
 * Implements ground acceleration, friction, air-control limits, jumping,
 * sprinting, crouching height transitions, and wall/corner sliding.
 */
export class PlayerMovement {
  readonly position = new THREE.Vector3(0, 0, 42);
  readonly velocity = new THREE.Vector3(0, 0, 0);

  private grounded = true;
  private crouching = false;
  private sprinting = false;
  private currentEyeHeight = 1.68;
  private surfaceType: 'concrete' | 'metal' | 'wood' | 'dirt' = 'concrete';
  private stepAccumulator = 0;

  readonly radius = 0.42;
  readonly standHeight = 1.82;
  readonly crouchHeight = 1.18;
  readonly standEyeHeight = 1.68;
  readonly crouchEyeHeight = 1.05;

  readonly baseWalkSpeed = 5.2;
  readonly sprintMultiplier = 1.32;
  readonly crouchMultiplier = 0.54;
  readonly groundAcceleration = 42.0;
  readonly airAcceleration = 9.5;
  readonly groundFriction = 11.5;
  readonly gravity = 21.0;
  readonly jumpVelocity = 7.4;

  update(
    dt: number,
    input: MovementInputState,
    collisionWorld: CollisionWorld
  ): { stepped: boolean; landed: boolean; jumped: boolean; surface: 'concrete' | 'metal' | 'wood' | 'dirt' } {
    const wasGrounded = this.grounded;
    let jumped = false;

    this.crouching = input.crouch;
    this.sprinting = input.sprint && !this.crouching && input.forward > 0.1;

    // Smooth stance eye-height transition
    const targetEye = this.crouching ? this.crouchEyeHeight : this.standEyeHeight;
    this.currentEyeHeight = THREE.MathUtils.lerp(
      this.currentEyeHeight,
      targetEye,
      Math.min(1, dt * 14)
    );

    // Compute wish direction in XZ plane from yaw
    const sinY = Math.sin(input.yaw);
    const cosY = Math.cos(input.yaw);
    const forwardVec = new THREE.Vector3(-sinY, 0, -cosY);
    const rightVec = new THREE.Vector3(cosY, 0, -sinY);

    const wishDir = new THREE.Vector3()
      .addScaledVector(forwardVec, input.forward)
      .addScaledVector(rightVec, input.right);
    if (wishDir.lengthSq() > 1e-5) {
      wishDir.normalize();
    }

    let targetSpeed = this.baseWalkSpeed * (input.weaponSpeedMultiplier || 1.0);
    if (this.crouching) {
      targetSpeed *= this.crouchMultiplier;
    } else if (this.sprinting) {
      targetSpeed *= this.sprintMultiplier;
    }

    if (this.grounded) {
      // Apply ground friction
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.001) {
        const drop = speed * this.groundFriction * dt;
        const newSpeed = Math.max(0, speed - drop) / speed;
        this.velocity.x *= newSpeed;
        this.velocity.z *= newSpeed;
      }

      // Ground acceleration toward wish velocity
      const wishVelX = wishDir.x * targetSpeed;
      const wishVelZ = wishDir.z * targetSpeed;
      this.velocity.x = THREE.MathUtils.lerp(
        this.velocity.x,
        wishVelX,
        Math.min(1, this.groundAcceleration * dt)
      );
      this.velocity.z = THREE.MathUtils.lerp(
        this.velocity.z,
        wishVelZ,
        Math.min(1, this.groundAcceleration * dt)
      );

      if (input.jump && !this.crouching) {
        this.velocity.y = this.jumpVelocity;
        this.grounded = false;
        jumped = true;
      } else {
        this.velocity.y = 0;
      }
    } else {
      // Air control limitation
      this.velocity.x += wishDir.x * this.airAcceleration * dt;
      this.velocity.z += wishDir.z * this.airAcceleration * dt;
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      const maxAirSpeed = this.baseWalkSpeed * this.sprintMultiplier * 1.05;
      if (horizSpeed > maxAirSpeed) {
        this.velocity.x = (this.velocity.x / horizSpeed) * maxAirSpeed;
        this.velocity.z = (this.velocity.z / horizSpeed) * maxAirSpeed;
      }
      this.velocity.y -= this.gravity * dt;
    }

    const desiredPos = new THREE.Vector3(
      this.position.x + this.velocity.x * dt,
      this.position.y + this.velocity.y * dt,
      this.position.z + this.velocity.z * dt
    );

    const charHeight = this.crouching ? this.crouchHeight : this.standHeight;
    const resolved = collisionWorld.resolveCharacterMovement(
      this.position,
      desiredPos,
      this.radius,
      charHeight
    );

    // Adjust velocity if wall blocked movement
    if (resolved.hitWall && dt > 0) {
      this.velocity.x = (resolved.position.x - this.position.x) / dt;
      this.velocity.z = (resolved.position.z - this.position.z) / dt;
    }

    this.position.copy(resolved.position);
    this.grounded = resolved.grounded;
    this.surfaceType = resolved.surface;
    if (this.grounded && this.velocity.y < 0) {
      this.velocity.y = 0;
    }

    const landed = !wasGrounded && this.grounded;
    let stepped = false;
    const horizontalSpeed = this.getHorizontalSpeed();
    if (this.grounded && horizontalSpeed > 0.6 && !this.crouching) {
      this.stepAccumulator += horizontalSpeed * dt;
      const stride = this.sprinting ? 2.45 : 2.1;
      if (this.stepAccumulator >= stride) {
        this.stepAccumulator = 0;
        stepped = true;
      }
    } else {
      this.stepAccumulator = 0;
    }

    return { stepped, landed, jumped, surface: this.surfaceType };
  }

  getHorizontalSpeed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  isGrounded(): boolean {
    return this.grounded;
  }

  isCrouching(): boolean {
    return this.crouching;
  }

  isSprinting(): boolean {
    return this.sprinting;
  }

  getEyeHeight(): number {
    return this.currentEyeHeight;
  }

  getEyePosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.set(this.position.x, this.position.y + this.currentEyeHeight, this.position.z);
  }

  reset(spawnPosition: THREE.Vector3): void {
    this.position.copy(spawnPosition);
    this.velocity.set(0, 0, 0);
    this.grounded = true;
    this.crouching = false;
    this.sprinting = false;
    this.currentEyeHeight = this.standEyeHeight;
    this.stepAccumulator = 0;
  }
}
