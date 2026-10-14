import * as THREE from 'three';

export interface SpatialAudioParameters {
  pan: number; // -1 (full left) to +1 (full right)
  gainMultiplier: number; // 0.0 to 1.0 distance attenuation
  distance: number;
}

/**
 * Calculates 3D positional stereo panning and distance attenuation relative
 * to the listener's world position and camera orientation.
 */
export class SpatialAudioCalculator {
  static compute(
    listenerPos: THREE.Vector3,
    listenerForward: THREE.Vector3,
    sourcePos: THREE.Vector3,
    maxDistance = 65
  ): SpatialAudioParameters {
    const toSource = new THREE.Vector3().subVectors(sourcePos, listenerPos);
    const distance = toSource.length();

    if (distance < 0.1) {
      return { pan: 0, gainMultiplier: 1.0, distance: 0 };
    }
    if (distance >= maxDistance) {
      return { pan: 0, gainMultiplier: 0.0, distance };
    }

    const forwardFlat = new THREE.Vector3(listenerForward.x, 0, listenerForward.z).normalize();
    const rightFlat = new THREE.Vector3(-forwardFlat.z, 0, forwardFlat.x).normalize();
    const dirToSourceFlat = new THREE.Vector3(toSource.x, 0, toSource.z).normalize();

    const pan = THREE.MathUtils.clamp(rightFlat.dot(dirToSourceFlat), -1, 1);
    const normDist = distance / maxDistance;
    const gainMultiplier = Math.pow(1 - normDist, 1.65);

    return { pan, gainMultiplier, distance };
  }
}
