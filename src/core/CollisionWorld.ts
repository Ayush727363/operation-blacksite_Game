import * as THREE from 'three';

export interface ColliderBox {
  id: string;
  box: THREE.Box3;
  tag: 'wall' | 'floor' | 'cover' | 'ramp' | 'prop' | 'boundary';
  blocksMovement: boolean;
  blocksBullets: boolean;
  blocksVision: boolean;
  surfaceType: 'concrete' | 'metal' | 'wood' | 'dirt';
  slopeMinY?: number;
  slopeMaxY?: number;
  slopeAxis?: 'x' | 'z';
  slopeDir?: 1 | -1;
}

export interface RaycastHitResult {
  hit: boolean;
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  collider?: ColliderBox;
}

/**
 * Spatial collision and raycast world handling capsule/cylinder-vs-AABB sliding,
 * stair/ramp elevation, bullet occlusion, grenade bounces, and smoke volume LOS blocking.
 */
export class CollisionWorld {
  private colliders: ColliderBox[] = [];
  private smokeVolumes: Array<{ id: string; position: THREE.Vector3; radius: number; expiresAt: number }> = [];
  private worldBounds = new THREE.Box3(
    new THREE.Vector3(-58, -2, -58),
    new THREE.Vector3(58, 30, 58)
  );

  clear(): void {
    this.colliders = [];
    this.smokeVolumes = [];
  }

  setWorldBounds(min: THREE.Vector3, max: THREE.Vector3): void {
    this.worldBounds.set(min, max);
  }

  addBoxCollider(
    id: string,
    center: THREE.Vector3,
    size: THREE.Vector3,
    options: Partial<Omit<ColliderBox, 'id' | 'box'>> = {}
  ): ColliderBox {
    const box = new THREE.Box3().setFromCenterAndSize(center, size);
    const collider: ColliderBox = {
      id,
      box,
      tag: options.tag ?? 'wall',
      blocksMovement: options.blocksMovement ?? true,
      blocksBullets: options.blocksBullets ?? true,
      blocksVision: options.blocksVision ?? true,
      surfaceType: options.surfaceType ?? 'concrete',
      slopeMinY: options.slopeMinY,
      slopeMaxY: options.slopeMaxY,
      slopeAxis: options.slopeAxis,
      slopeDir: options.slopeDir
    };
    this.colliders.push(collider);
    return collider;
  }

  getColliders(): readonly ColliderBox[] {
    return this.colliders;
  }

  addSmokeVolume(id: string, position: THREE.Vector3, radius: number, expiresAt: number): void {
    this.smokeVolumes.push({ id, position: position.clone(), radius, expiresAt });
  }

  pruneExpiredSmoke(nowSeconds: number): void {
    this.smokeVolumes = this.smokeVolumes.filter((s) => s.expiresAt > nowSeconds);
  }

  getActiveSmokeVolumes(): ReadonlyArray<{ id: string; position: THREE.Vector3; radius: number; expiresAt: number }> {
    return this.smokeVolumes;
  }

  /**
   * Resolves horizontal & vertical movement of a character capsule (represented by feet position,
   * radius, and height) against all world colliders and ramps.
   */
  resolveCharacterMovement(
    currentFeetPos: THREE.Vector3,
    desiredFeetPos: THREE.Vector3,
    radius: number,
    height: number
  ): { position: THREE.Vector3; grounded: boolean; groundY: number; hitWall: boolean; surface: 'concrete' | 'metal' | 'wood' | 'dirt' } {
    const resultPos = desiredFeetPos.clone();
    let hitWall = false;
    let groundY = 0;
    let surface: 'concrete' | 'metal' | 'wood' | 'dirt' = 'concrete';

    // Clamp to playable world boundary
    const minX = this.worldBounds.min.x + radius;
    const maxX = this.worldBounds.max.x - radius;
    const minZ = this.worldBounds.min.z + radius;
    const maxZ = this.worldBounds.max.z - radius;
    if (resultPos.x < minX) { resultPos.x = minX; hitWall = true; }
    if (resultPos.x > maxX) { resultPos.x = maxX; hitWall = true; }
    if (resultPos.z < minZ) { resultPos.z = minZ; hitWall = true; }
    if (resultPos.z > maxZ) { resultPos.z = maxZ; hitWall = true; }

    const stepHeight = 0.55;

    // Evaluate ramps and floor platforms first
    for (const col of this.colliders) {
      if (!col.blocksMovement) continue;
      const b = col.box;
      if (col.tag === 'ramp' && col.slopeAxis && col.slopeMinY !== undefined && col.slopeMaxY !== undefined) {
        if (
          resultPos.x >= b.min.x - radius * 0.3 &&
          resultPos.x <= b.max.x + radius * 0.3 &&
          resultPos.z >= b.min.z - radius * 0.3 &&
          resultPos.z <= b.max.z + radius * 0.3
        ) {
          let t = 0;
          if (col.slopeAxis === 'z') {
            t = (resultPos.z - b.min.z) / Math.max(0.01, b.max.z - b.min.z);
          } else {
            t = (resultPos.x - b.min.x) / Math.max(0.01, b.max.x - b.min.x);
          }
          t = THREE.MathUtils.clamp(col.slopeDir === -1 ? 1 - t : t, 0, 1);
          const rampY = col.slopeMinY + t * (col.slopeMaxY - col.slopeMinY);
          if (currentFeetPos.y + stepHeight >= rampY - 0.25 && rampY > groundY) {
            groundY = rampY;
            surface = col.surfaceType;
          }
        }
        continue;
      }

      // Check if player is horizontally above a platform/crate/walkway
      if (
        resultPos.x + radius * 0.7 > b.min.x &&
        resultPos.x - radius * 0.7 < b.max.x &&
        resultPos.z + radius * 0.7 > b.min.z &&
        resultPos.z - radius * 0.7 < b.max.z
      ) {
        if (currentFeetPos.y + stepHeight >= b.max.y && b.max.y > groundY) {
          groundY = b.max.y;
          surface = col.surfaceType;
        }
      }
    }

    // Horizontal circle-vs-AABB resolution for walls & solid props
    for (let iter = 0; iter < 2; iter++) {
      for (const col of this.colliders) {
        if (!col.blocksMovement || col.tag === 'ramp' || col.tag === 'floor') continue;
        const b = col.box;

        // Vertical overlap check (ignore if character feet are cleanly on top of this collider or head is below it)
        const charBottom = Math.max(resultPos.y, groundY) + stepHeight;
        const charTop = Math.max(resultPos.y, groundY) + height;
        if (charBottom >= b.max.y - 0.02 || charTop <= b.min.y + 0.02) {
          continue;
        }

        const closestX = THREE.MathUtils.clamp(resultPos.x, b.min.x, b.max.x);
        const closestZ = THREE.MathUtils.clamp(resultPos.z, b.min.z, b.max.z);
        const dx = resultPos.x - closestX;
        const dz = resultPos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          hitWall = true;
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            resultPos.x += (dx / dist) * overlap;
            resultPos.z += (dz / dist) * overlap;
          } else {
            // Inside box center fallback: push out along smallest penetration axis
            const penLeft = Math.abs(resultPos.x - b.min.x);
            const penRight = Math.abs(b.max.x - resultPos.x);
            const penBack = Math.abs(resultPos.z - b.min.z);
            const penFront = Math.abs(b.max.z - resultPos.z);
            const minPen = Math.min(penLeft, penRight, penBack, penFront);
            if (minPen === penLeft) resultPos.x = b.min.x - radius;
            else if (minPen === penRight) resultPos.x = b.max.x + radius;
            else if (minPen === penBack) resultPos.z = b.min.z - radius;
            else resultPos.z = b.max.z + radius;
          }
        }
      }
    }

    let grounded = false;
    if (resultPos.y <= groundY + 0.08) {
      resultPos.y = groundY;
      grounded = true;
    }

    return { position: resultPos, grounded, groundY, hitWall, surface };
  }

  /**
   * Raycasts against all bullet-blocking world geometry.
   */
  raycastWorld(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance = 300): RaycastHitResult {
    const ray = new THREE.Ray(origin, direction.clone().normalize());
    let closestDist = maxDistance;
    let hitPoint = new THREE.Vector3();
    let hitNormal = new THREE.Vector3(0, 1, 0);
    let hitCollider: ColliderBox | undefined;
    const tempPt = new THREE.Vector3();

    for (const col of this.colliders) {
      if (!col.blocksBullets) continue;
      const pt = ray.intersectBox(col.box, tempPt);
      if (pt) {
        const dist = origin.distanceTo(pt);
        if (dist <= closestDist && dist >= 0) {
          closestDist = dist;
          hitPoint.copy(pt);
          hitCollider = col;
          hitNormal.copy(this.computeBoxHitNormal(pt, col.box));
        }
      }
    }

    // Check ground plane Y=0
    if (ray.direction.y < -1e-5 && origin.y > 0) {
      const t = -origin.y / ray.direction.y;
      if (t >= 0 && t < closestDist) {
        closestDist = t;
        ray.at(t, hitPoint);
        hitNormal.set(0, 1, 0);
        hitCollider = undefined;
      }
    }

    return {
      hit: closestDist < maxDistance,
      distance: closestDist,
      point: hitPoint,
      normal: hitNormal,
      collider: hitCollider
    };
  }

  /**
   * Checks whether clear line-of-sight exists between two 3D points.
   * Checks both solid walls/cover and optionally active smoke volumes.
   */
  hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3, checkSmoke = true): boolean {
    const diff = new THREE.Vector3().subVectors(to, from);
    const totalDist = diff.length();
    if (totalDist < 0.05) return true;
    const dir = diff.divideScalar(totalDist);
    const ray = new THREE.Ray(from, dir);
    const tempPt = new THREE.Vector3();

    for (const col of this.colliders) {
      if (!col.blocksVision) continue;
      if (col.box.containsPoint(from) || col.box.containsPoint(to)) continue;
      const pt = ray.intersectBox(col.box, tempPt);
      if (pt) {
        const d = from.distanceTo(pt);
        if (d < totalDist - 0.08) {
          return false;
        }
      }
    }

    if (checkSmoke && this.smokeVolumes.length > 0) {
      for (const smoke of this.smokeVolumes) {
        if (this.segmentIntersectsSphere(from, to, smoke.position, smoke.radius)) {
          return false;
        }
      }
    }

    return true;
  }

  private segmentIntersectsSphere(a: THREE.Vector3, b: THREE.Vector3, center: THREE.Vector3, radius: number): boolean {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(center, a);
    const abLenSq = ab.lengthSq();
    if (abLenSq < 1e-6) return ac.lengthSq() <= radius * radius;
    const t = THREE.MathUtils.clamp(ac.dot(ab) / abLenSq, 0, 1);
    const closest = new THREE.Vector3().copy(a).addScaledVector(ab, t);
    return closest.distanceToSquared(center) <= radius * radius;
  }

  private computeBoxHitNormal(pt: THREE.Vector3, box: THREE.Box3): THREE.Vector3 {
    const eps = 0.02;
    if (Math.abs(pt.x - box.min.x) < eps) return new THREE.Vector3(-1, 0, 0);
    if (Math.abs(pt.x - box.max.x) < eps) return new THREE.Vector3(1, 0, 0);
    if (Math.abs(pt.y - box.min.y) < eps) return new THREE.Vector3(0, -1, 0);
    if (Math.abs(pt.y - box.max.y) < eps) return new THREE.Vector3(0, 1, 0);
    if (Math.abs(pt.z - box.min.z) < eps) return new THREE.Vector3(0, 0, -1);
    return new THREE.Vector3(0, 0, 1);
  }
}
