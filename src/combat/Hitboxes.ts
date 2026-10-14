import * as THREE from 'three';

export type HitRegion = 'head' | 'torso' | 'limbs';

export interface HitboxTarget {
  id: string;
  team: 'alpha' | 'bravo' | 'ffa';
  feetPosition: THREE.Vector3;
  crouching: boolean;
  alive: boolean;
}

export interface TargetRaycastHit {
  targetId: string;
  region: HitRegion;
  distance: number;
  point: THREE.Vector3;
}

/**
 * Anatomical 3D hitbox system dividing each character into:
 * - Head box (top cranial zone)
 * - Torso box (upper & middle chest/abdomen)
 * - Limbs box (lower legs & outer arms)
 */
export class HitboxSystem {
  static getRegionBoxes(
    feetPos: THREE.Vector3,
    crouching: boolean
  ): Array<{ region: HitRegion; box: THREE.Box3 }> {
    const x = feetPos.x;
    const y = feetPos.y;
    const z = feetPos.z;

    if (crouching) {
      return [
        {
          region: 'head',
          box: new THREE.Box3(
            new THREE.Vector3(x - 0.19, y + 0.88, z - 0.19),
            new THREE.Vector3(x + 0.19, y + 1.24, z + 0.19)
          )
        },
        {
          region: 'torso',
          box: new THREE.Box3(
            new THREE.Vector3(x - 0.30, y + 0.42, z - 0.26),
            new THREE.Vector3(x + 0.30, y + 0.88, z + 0.26)
          )
        },
        {
          region: 'limbs',
          box: new THREE.Box3(
            new THREE.Vector3(x - 0.34, y + 0.0, z - 0.30),
            new THREE.Vector3(x + 0.34, y + 0.42, z + 0.30)
          )
        }
      ];
    }

    return [
      {
        region: 'head',
        box: new THREE.Box3(
          new THREE.Vector3(x - 0.19, y + 1.44, z - 0.19),
          new THREE.Vector3(x + 0.19, y + 1.84, z + 0.19)
        )
      },
      {
        region: 'torso',
        box: new THREE.Box3(
          new THREE.Vector3(x - 0.30, y + 0.78, z - 0.25),
          new THREE.Vector3(x + 0.30, y + 1.44, z + 0.25)
        )
      },
      {
        region: 'limbs',
        box: new THREE.Box3(
          new THREE.Vector3(x - 0.34, y + 0.0, z - 0.28),
          new THREE.Vector3(x + 0.34, y + 0.78, z + 0.28)
        )
      }
    ];
  }

  /**
   * Raycasts against all alive targets closer than maxDistance (which is pre-clamped
   * to the nearest solid wall intersection so walls strictly block bullets).
   */
  static raycastTargets(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    targets: HitboxTarget[],
    excludeShooterId: string
  ): TargetRaycastHit | null {
    const ray = new THREE.Ray(origin, direction.clone().normalize());
    let bestHit: TargetRaycastHit | null = null;
    let closestDist = maxDistance;
    const hitPt = new THREE.Vector3();

    for (const target of targets) {
      if (!target.alive || target.id === excludeShooterId) continue;

      const regions = HitboxSystem.getRegionBoxes(target.feetPosition, target.crouching);
      for (const r of regions) {
        const pt = ray.intersectBox(r.box, hitPt);
        if (pt) {
          const d = origin.distanceTo(pt);
          if (d >= 0 && d < closestDist) {
            closestDist = d;
            bestHit = {
              targetId: target.id,
              region: r.region,
              distance: d,
              point: pt.clone()
            };
          }
        }
      }
    }

    return bestHit;
  }
}
