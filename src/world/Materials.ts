import * as THREE from 'three';

/**
 * Shared procedural physically based materials for the BLACKSITE Mediterranean coastal facility.
 * Reuses materials across geometry to minimize state changes and GPU memory.
 */
export class MaterialLibrary {
  readonly asphalt: THREE.MeshStandardMaterial;
  readonly concreteLight: THREE.MeshStandardMaterial;
  readonly concreteDark: THREE.MeshStandardMaterial;
  readonly stuccoSand: THREE.MeshStandardMaterial;
  readonly metalContainerBlue: THREE.MeshStandardMaterial;
  readonly metalContainerRust: THREE.MeshStandardMaterial;
  readonly metalContainerOlive: THREE.MeshStandardMaterial;
  readonly metalDark: THREE.MeshStandardMaterial;
  readonly metalWalkway: THREE.MeshStandardMaterial;
  readonly woodCrate: THREE.MeshStandardMaterial;
  readonly hazardStripe: THREE.MeshStandardMaterial;
  readonly bombZoneA: THREE.MeshStandardMaterial;
  readonly bombZoneB: THREE.MeshStandardMaterial;
  readonly glassTint: THREE.MeshStandardMaterial;
  readonly beaconRed: THREE.MeshStandardMaterial;
  readonly beaconCyan: THREE.MeshStandardMaterial;
  readonly waterSea: THREE.MeshStandardMaterial;

  constructor() {
    this.asphalt = new THREE.MeshStandardMaterial({
      color: 0x363b42,
      roughness: 0.88,
      metalness: 0.08
    });
    this.concreteLight = new THREE.MeshStandardMaterial({
      color: 0x9aa1a8,
      roughness: 0.78,
      metalness: 0.1
    });
    this.concreteDark = new THREE.MeshStandardMaterial({
      color: 0x5c646d,
      roughness: 0.82,
      metalness: 0.14
    });
    this.stuccoSand = new THREE.MeshStandardMaterial({
      color: 0xc8bca6,
      roughness: 0.74,
      metalness: 0.06
    });
    this.metalContainerBlue = new THREE.MeshStandardMaterial({
      color: 0x255885,
      roughness: 0.52,
      metalness: 0.55
    });
    this.metalContainerRust = new THREE.MeshStandardMaterial({
      color: 0x8f3f29,
      roughness: 0.58,
      metalness: 0.48
    });
    this.metalContainerOlive = new THREE.MeshStandardMaterial({
      color: 0x47593e,
      roughness: 0.55,
      metalness: 0.5
    });
    this.metalDark = new THREE.MeshStandardMaterial({
      color: 0x283038,
      roughness: 0.42,
      metalness: 0.72
    });
    this.metalWalkway = new THREE.MeshStandardMaterial({
      color: 0x4c5661,
      roughness: 0.48,
      metalness: 0.65
    });
    this.woodCrate = new THREE.MeshStandardMaterial({
      color: 0x8c6843,
      roughness: 0.8,
      metalness: 0.05
    });
    this.hazardStripe = new THREE.MeshStandardMaterial({
      color: 0xd98a16,
      roughness: 0.6,
      metalness: 0.25
    });
    this.bombZoneA = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.2
    });
    this.bombZoneB = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.2
    });
    this.glassTint = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.32,
      roughness: 0.15,
      metalness: 0.8
    });
    this.beaconRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.1
    });
    this.beaconCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.1
    });
    this.waterSea = new THREE.MeshStandardMaterial({
      color: 0x164e63,
      roughness: 0.28,
      metalness: 0.45
    });
  }
}
