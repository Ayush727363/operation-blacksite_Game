import * as THREE from 'three';

/**
 * Controls first-person camera orientation, mouse look sensitivity,
 * recoil camera kick, headbob, weapon sway, and ADS field-of-view transitions.
 */
export class CameraController {
  private yaw = 0; // Radians around Y
  private pitch = 0; // Radians around X, clamped to [-88°, +88°]
  private recoilPitchRad = 0;
  private recoilYawRad = 0;
  private bobTimer = 0;
  private baseFov = 80;
  private currentFov = 80;
  private sensitivityX = 1.0;
  private sensitivityY = 1.0;
  private damageTiltRad = 0;

  private readonly maxPitch = THREE.MathUtils.degToRad(88);

  setSensitivity(sensX: number, sensY: number): void {
    this.sensitivityX = Math.max(0.05, sensX);
    this.sensitivityY = Math.max(0.05, sensY);
  }

  setBaseFov(fov: number): void {
    this.baseFov = THREE.MathUtils.clamp(fov, 60, 110);
  }

  setOrientation(yaw: number, pitch = 0): void {
    this.yaw = yaw;
    this.pitch = THREE.MathUtils.clamp(pitch, -this.maxPitch, this.maxPitch);
    this.recoilPitchRad = 0;
    this.recoilYawRad = 0;
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }

  applyMouseDelta(dx: number, dy: number, adsSensMultiplier = 1.0): void {
    const radPerPixel = 0.0022 * adsSensMultiplier;
    this.yaw -= dx * radPerPixel * this.sensitivityX;
    this.pitch -= dy * radPerPixel * this.sensitivityY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -this.maxPitch, this.maxPitch);
  }

  setRecoilOffsetDeg(pitchDeg: number, yawDeg: number): void {
    this.recoilPitchRad = THREE.MathUtils.degToRad(pitchDeg);
    this.recoilYawRad = THREE.MathUtils.degToRad(yawDeg);
  }

  triggerDamagePunch(amount = 0.035): void {
    this.damageTiltRad = Math.min(0.12, this.damageTiltRad + amount);
  }

  updateCamera(
    dt: number,
    camera: THREE.PerspectiveCamera,
    eyePosition: THREE.Vector3,
    horizontalSpeed: number,
    grounded: boolean,
    adsFovMultiplier = 1.0
  ): { bobOffsetX: number; bobOffsetY: number } {
    // Smooth FOV transition for ADS / sniper scopes
    const targetFov = this.baseFov * adsFovMultiplier;
    this.currentFov = THREE.MathUtils.lerp(this.currentFov, targetFov, Math.min(1, dt * 16));
    if (Math.abs(camera.fov - this.currentFov) > 0.05) {
      camera.fov = this.currentFov;
      camera.updateProjectionMatrix();
    }

    // Decay damage flinch tilt
    this.damageTiltRad = THREE.MathUtils.lerp(this.damageTiltRad, 0, Math.min(1, dt * 10));

    // Headbob while moving on ground
    let bobOffsetX = 0;
    let bobOffsetY = 0;
    if (grounded && horizontalSpeed > 0.4) {
      this.bobTimer += dt * (4.5 + horizontalSpeed * 0.95);
      bobOffsetX = Math.cos(this.bobTimer) * 0.018 * Math.min(1, horizontalSpeed / 5);
      bobOffsetY = Math.abs(Math.sin(this.bobTimer)) * 0.024 * Math.min(1, horizontalSpeed / 5);
    } else {
      this.bobTimer = 0;
    }

    camera.position.set(
      eyePosition.x,
      eyePosition.y + bobOffsetY,
      eyePosition.z
    );

    const effectivePitch = THREE.MathUtils.clamp(
      this.pitch + this.recoilPitchRad,
      -this.maxPitch,
      this.maxPitch
    );
    const effectiveYaw = this.yaw + this.recoilYawRad;

    camera.rotation.set(effectivePitch, effectiveYaw, this.damageTiltRad, 'YXZ');
    camera.updateMatrixWorld();

    return { bobOffsetX, bobOffsetY };
  }

  getAimDirection(target = new THREE.Vector3()): THREE.Vector3 {
    const effectivePitch = THREE.MathUtils.clamp(
      this.pitch + this.recoilPitchRad,
      -this.maxPitch,
      this.maxPitch
    );
    const effectiveYaw = this.yaw + this.recoilYawRad;
    const euler = new THREE.Euler(effectivePitch, effectiveYaw, 0, 'YXZ');
    return target.set(0, 0, -1).applyEuler(euler).normalize();
  }
}

// Ensure Vector3.applyEuler exists on our vendor Three.js Vector3
declare module 'three' {
  interface Vector3 {
    applyEuler(euler: THREE.Euler): this;
  }
}
if (!(THREE.Vector3.prototype as any).applyEuler) {
  (THREE.Vector3.prototype as any).applyEuler = function (euler: THREE.Euler) {
    const q = new THREE.Quaternion().setFromEuler(euler);
    return this.applyQuaternion(q);
  };
}
