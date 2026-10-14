import * as THREE from 'three';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { MaterialLibrary } from './Materials.ts';
import { BOMB_SITES } from './LevelData.ts';

/**
 * Procedurally constructs the OPERATION BLACKSITE industrial coastal military facility
 * and registers all solid walls, floors, ramps, shipping containers, crates, barriers,
 * and walkways into CollisionWorld.
 */
export class MapFactory {
  private readonly materials = new MaterialLibrary();

  buildMap(worldGroup: THREE.Group, collisionWorld: CollisionWorld): void {
    worldGroup.clear();
    collisionWorld.clear();
    collisionWorld.setWorldBounds(new THREE.Vector3(-56, -2, -56), new THREE.Vector3(56, 28, 56));

    // 1. Main Ground Floor & Coastal Water Apron
    const ground = new THREE.Mesh(new THREE.BoxGeometry(114, 1, 114), this.materials.asphalt);
    ground.position.set(0, -0.5, 0);
    ground.receiveShadow = true;
    worldGroup.add(ground);

    // Courtyard concrete paving inlays
    const courtFloor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.06, 36), this.materials.concreteLight);
    courtFloor.position.set(0, 0.03, 0);
    worldGroup.add(courtFloor);

    // Outer perimeter containment walls (56m boundary)
    this.addWall(worldGroup, collisionWorld, 'perim_north', 0, 4.5, -55.5, 112, 9, 1, this.materials.concreteLight);
    this.addWall(worldGroup, collisionWorld, 'perim_south', 0, 4.5, 55.5, 112, 9, 1, this.materials.concreteDark);
    this.addWall(worldGroup, collisionWorld, 'perim_west', -55.5, 4.5, 0, 1, 9, 112, this.materials.concreteDark);
    this.addWall(worldGroup, collisionWorld, 'perim_east', 55.5, 4.5, 0, 1, 9, 112, this.materials.concreteDark);

    // 2. Attacker Spawn (South Harbor Dock) Cover & Staging Area
    this.addCrate(worldGroup, collisionWorld, 'att_cover_c', 0, 34, 4.5, 1.15, 1.2, this.materials.hazardStripe);
    this.addContainer(worldGroup, collisionWorld, 'att_cont_w', -16, 40, 3.2, 3.2, 8.0, this.materials.metalContainerBlue);
    this.addContainer(worldGroup, collisionWorld, 'att_cont_e', 16, 40, 3.2, 3.2, 8.0, this.materials.metalContainerRust);

    // 3. Defender Spawn (North Security Plaza) Cover & Gatehouse
    this.addCrate(worldGroup, collisionWorld, 'def_cover_c', 0, -34, 4.8, 1.15, 1.2, this.materials.hazardStripe);
    this.addContainer(worldGroup, collisionWorld, 'def_cont_w', -16, -40, 3.2, 3.2, 8.0, this.materials.metalContainerOlive);
    this.addContainer(worldGroup, collisionWorld, 'def_cont_e', 16, -40, 3.2, 3.2, 8.0, this.materials.metalContainerBlue);

    // 4. Central Combat Courtyard Architecture & Tactical Cover
    // Central Radar Pylon (blocks direct spawn-to-spawn sniping, creates dual lanes around mid)
    this.addWall(worldGroup, collisionWorld, 'court_radar_base', 0, 1.8, 0, 3.8, 3.6, 3.8, this.materials.concreteDark);
    const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 6.5, 10), this.materials.metalDark);
    radarMast.position.set(0, 6.8, 0);
    worldGroup.add(radarMast);

    // Courtyard mid cover barriers & crates
    this.addCrate(worldGroup, collisionWorld, 'court_barrier_sw', -6.5, 11, 3.2, 1.35, 1.0, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'court_barrier_se', 6.5, 11, 3.2, 1.35, 1.0, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'court_barrier_nw', -6.5, -11, 3.2, 1.35, 1.0, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'court_barrier_ne', 6.5, -11, 3.2, 1.35, 1.0, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'court_crate_w', -11, 4, 2.0, 2.0, 2.0, this.materials.woodCrate, 'wood');
    this.addCrate(worldGroup, collisionWorld, 'court_crate_e', 11, -4, 2.0, 2.0, 2.0, this.materials.woodCrate, 'wood');

    // Dividing Walls between Central Courtyard and West Hangar (with Mid Breach doorway at Z = -2..+2)
    this.addWall(worldGroup, collisionWorld, 'div_west_south', -18, 3.5, 14, 1.2, 7, 22, this.materials.stuccoSand);
    this.addWall(worldGroup, collisionWorld, 'div_west_north', -18, 3.5, -15, 1.2, 7, 24, this.materials.stuccoSand);

    // Dividing Walls between Central Courtyard and East Depot (with Mid Breach doorway at Z = -2..+2)
    this.addWall(worldGroup, collisionWorld, 'div_east_south', 18, 3.5, 14, 1.2, 7, 22, this.materials.stuccoSand);
    this.addWall(worldGroup, collisionWorld, 'div_east_north', 18, 3.5, -15, 1.2, 7, 24, this.materials.stuccoSand);

    // 5. West Hangar & Bomb Site A (X = -48 to -18, Z = -28 to +20)
    // Hangar Outer West Wall
    this.addWall(worldGroup, collisionWorld, 'hangar_wall_w', -48, 4.0, -4, 1.2, 8, 52, this.materials.concreteDark);
    // Hangar Roof Canopy over Bomb Site A
    const hangarRoof = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 36), this.materials.metalDark);
    hangarRoof.position.set(-33, 7.8, -8);
    worldGroup.add(hangarRoof);

    // Bomb Site A Pad & Beacon
    this.buildBombSiteZone(worldGroup, BOMB_SITES.A.center, BOMB_SITES.A.radius, 'A');

    // Bomb Site A Tactical Cover Crates & Shipping Container
    this.addContainer(worldGroup, collisionWorld, 'site_a_cont', -26, -16, 2.8, 2.8, 6.5, this.materials.metalContainerRust);
    this.addCrate(worldGroup, collisionWorld, 'site_a_crate_1', -38, -9, 2.2, 1.8, 2.2, this.materials.woodCrate, 'wood');
    this.addCrate(worldGroup, collisionWorld, 'site_a_crate_2', -33, -18, 3.0, 1.4, 1.2, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'hangar_south_cover', -35, 6, 3.2, 1.6, 1.6, this.materials.metalContainerBlue, 'metal');

    // Elevated Catwalk Balcony along West Hangar wall (Y = 3.2m) + Stairs/Ramp
    const catwalkDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 18), this.materials.metalWalkway);
    catwalkDeck.position.set(-43.5, 3.05, -6);
    worldGroup.add(catwalkDeck);
    collisionWorld.addBoxCollider(
      'catwalk_deck_a',
      new THREE.Vector3(-43.5, 1.6, -6),
      new THREE.Vector3(4.2, 3.2, 18),
      { tag: 'floor', blocksMovement: true, blocksBullets: true, blocksVision: false, surfaceType: 'metal' }
    );

    // South Ramp up to Catwalk (Z = +12 down to Z = +3, climbing Y = 0 to 3.2m)
    this.addRamp(
      worldGroup,
      collisionWorld,
      'catwalk_ramp_s',
      new THREE.Vector3(-43.5, 1.6, 7.5),
      new THREE.Vector3(4.0, 3.2, 9.0),
      0,
      3.2,
      'z',
      -1
    );

    // 6. East Munitions Depot & Bomb Site B (X = +18 to +48, Z = -28 to +20)
    // Dividing wall between East Depot and Far-East Flank Tunnel (with breach doors at Z = +8 and Z = -10)
    this.addWall(worldGroup, collisionWorld, 'depot_wall_e1', 43, 3.5, 19, 1.2, 7, 14, this.materials.concreteDark);
    this.addWall(worldGroup, collisionWorld, 'depot_wall_e2', 43, 3.5, -1, 1.2, 7, 12, this.materials.concreteDark);
    this.addWall(worldGroup, collisionWorld, 'depot_wall_e3', 43, 3.5, -21, 1.2, 7, 14, this.materials.concreteDark);

    // Depot Roof Structure
    const depotRoof = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 32), this.materials.metalDark);
    depotRoof.position.set(30.5, 7.4, -8);
    worldGroup.add(depotRoof);

    // Bomb Site B Pad & Beacon
    this.buildBombSiteZone(worldGroup, BOMB_SITES.B.center, BOMB_SITES.B.radius, 'B');

    // Bomb Site B Cover & Interior CQB Partition
    this.addContainer(worldGroup, collisionWorld, 'site_b_cont', 26, -15, 2.8, 2.8, 6.2, this.materials.metalContainerOlive);
    this.addCrate(worldGroup, collisionWorld, 'site_b_crate_1', 38, -7, 2.2, 1.8, 2.2, this.materials.woodCrate, 'wood');
    this.addCrate(worldGroup, collisionWorld, 'site_b_crate_2', 34, -17, 3.0, 1.4, 1.2, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'depot_cqb_wall', 31, 5, 4.5, 2.4, 1.2, this.materials.stuccoSand);

    // Flank Route Cover Props (Far East Coastal Service Lane X = 48)
    this.addCrate(worldGroup, collisionWorld, 'flank_cover_1', 49, 14, 2.2, 1.5, 1.5, this.materials.concreteLight);
    this.addCrate(worldGroup, collisionWorld, 'flank_cover_2', 49, -2, 2.2, 1.5, 1.5, this.materials.woodCrate, 'wood');
  }

  private addWall(
    group: THREE.Group,
    collision: CollisionWorld,
    id: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    collision.addBoxCollider(id, new THREE.Vector3(x, y, z), new THREE.Vector3(w, h, d), {
      tag: 'wall',
      blocksMovement: true,
      blocksBullets: true,
      blocksVision: true,
      surfaceType: 'concrete'
    });
  }

  private addContainer(
    group: THREE.Group,
    collision: CollisionWorld,
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    collision.addBoxCollider(id, new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d), {
      tag: 'cover',
      blocksMovement: true,
      blocksBullets: true,
      blocksVision: true,
      surfaceType: 'metal'
    });
  }

  private addCrate(
    group: THREE.Group,
    collision: CollisionWorld,
    id: string,
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    surfaceType: 'concrete' | 'metal' | 'wood' | 'dirt' = 'concrete'
  ): void {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    collision.addBoxCollider(id, new THREE.Vector3(x, h / 2, z), new THREE.Vector3(w, h, d), {
      tag: 'cover',
      blocksMovement: true,
      blocksBullets: true,
      blocksVision: h >= 1.5,
      surfaceType
    });
  }

  private addRamp(
    group: THREE.Group,
    collision: CollisionWorld,
    id: string,
    center: THREE.Vector3,
    size: THREE.Vector3,
    slopeMinY: number,
    slopeMaxY: number,
    slopeAxis: 'x' | 'z',
    slopeDir: 1 | -1
  ): void {
    // Visual stepped ramp segments
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const stepH = slopeMinY + t * (slopeMaxY - slopeMinY);
      const stepLen = size.z / steps;
      const zOffset = slopeDir === -1
        ? center.z + size.z / 2 - (i + 0.5) * stepLen
        : center.z - size.z / 2 + (i + 0.5) * stepLen;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, stepH, stepLen),
        this.materials.metalWalkway
      );
      stepMesh.position.set(center.x, stepH / 2, zOffset);
      group.add(stepMesh);
    }

    collision.addBoxCollider(id, center, size, {
      tag: 'ramp',
      blocksMovement: true,
      blocksBullets: true,
      blocksVision: false,
      surfaceType: 'metal',
      slopeMinY,
      slopeMaxY,
      slopeAxis,
      slopeDir
    });
  }

  private buildBombSiteZone(
    group: THREE.Group,
    center: THREE.Vector3,
    radius: number,
    siteId: 'A' | 'B'
  ): void {
    const padMat = siteId === 'A' ? this.materials.bombZoneA : this.materials.bombZoneB;
    const beaconMat = siteId === 'A' ? this.materials.beaconRed : this.materials.beaconCyan;

    const pad = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.6, 0.08, radius * 1.6), padMat);
    pad.position.set(center.x, 0.04, center.z);
    group.add(pad);

    // Target telemetry crate at site center
    const coreCrate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), this.materials.hazardStripe);
    coreCrate.position.set(center.x, 0.55, center.z);
    group.add(coreCrate);

    // Overhead site beacon pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), this.materials.metalDark);
    pole.position.set(center.x, 2.4, center.z);
    group.add(pole);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), beaconMat);
    lamp.position.set(center.x, 4.35, center.z);
    group.add(lamp);
  }
}
