import * as THREE from 'three';

export interface WaypointNode {
  id: string;
  position: THREE.Vector3;
  neighbors: string[];
  area: 'attacker_spawn' | 'defender_spawn' | 'courtyard' | 'site_a' | 'site_b' | 'west_hangar' | 'east_depot' | 'flank_tunnel' | 'catwalk';
  isCover: boolean;
  coverNormal?: THREE.Vector3;
}

export interface BombSiteDefinition {
  id: 'A' | 'B';
  name: string;
  center: THREE.Vector3;
  radius: number;
}

export interface SpawnZoneDefinition {
  team: 'alpha' | 'bravo' | 'ffa';
  points: THREE.Vector3[];
  facingYaw: number;
}

/**
 * Authoritative level layout data for OPERATION BLACKSITE:
 * - Spawn zones (Alpha Attackers South Dock, Bravo Defenders North Security Plaza, plus FFA points)
 * - Bomb Site A (West Hangar) & Bomb Site B (East Munitions Depot)
 * - Interconnected 3D Waypoint & Cover Graph for Bot AI Navigation
 */
export const BOMB_SITES: Record<'A' | 'B', BombSiteDefinition> = {
  A: {
    id: 'A',
    name: 'Bomb Site A (West Hangar)',
    center: new THREE.Vector3(-34, 0, -12),
    radius: 5.5
  },
  B: {
    id: 'B',
    name: 'Bomb Site B (East Depot)',
    center: new THREE.Vector3(34, 0, -10),
    radius: 5.5
  }
};

export const SPAWN_ZONES: Record<'alpha' | 'bravo' | 'ffa', SpawnZoneDefinition> = {
  // Alpha (Attackers) spawn at South Harbor Dock facing North (-Z)
  alpha: {
    team: 'alpha',
    facingYaw: 0,
    points: [
      new THREE.Vector3(0, 0, 42),
      new THREE.Vector3(-4, 0, 43),
      new THREE.Vector3(4, 0, 43),
      new THREE.Vector3(-8, 0, 41),
      new THREE.Vector3(8, 0, 41),
      new THREE.Vector3(-2, 0, 46),
      new THREE.Vector3(2, 0, 46)
    ]
  },
  // Bravo (Defenders) spawn at North Security Plaza facing South (+Z)
  bravo: {
    team: 'bravo',
    facingYaw: Math.PI,
    points: [
      new THREE.Vector3(0, 0, -42),
      new THREE.Vector3(-4, 0, -43),
      new THREE.Vector3(4, 0, -43),
      new THREE.Vector3(-8, 0, -41),
      new THREE.Vector3(8, 0, -41),
      new THREE.Vector3(-2, 0, -46),
      new THREE.Vector3(2, 0, -46)
    ]
  },
  ffa: {
    team: 'ffa',
    facingYaw: 0,
    points: [
      new THREE.Vector3(0, 0, 42),
      new THREE.Vector3(0, 0, -42),
      new THREE.Vector3(-34, 0, -12),
      new THREE.Vector3(34, 0, -10),
      new THREE.Vector3(-32, 0, 18),
      new THREE.Vector3(32, 0, 18),
      new THREE.Vector3(-12, 0, 0),
      new THREE.Vector3(12, 0, 0),
      new THREE.Vector3(48, 0, 8),
      new THREE.Vector3(-24, 0, -32),
      new THREE.Vector3(24, 0, -32),
      new THREE.Vector3(0, 0, 18)
    ]
  }
};

export const LEVEL_WAYPOINTS: WaypointNode[] = [
  // Attacker Spawn (South)
  { id: 'wp_att_center', position: new THREE.Vector3(0, 0, 42), neighbors: ['wp_att_west', 'wp_att_east', 'wp_south_mid'], area: 'attacker_spawn', isCover: true },
  { id: 'wp_att_west', position: new THREE.Vector3(-12, 0, 38), neighbors: ['wp_att_center', 'wp_west_entry'], area: 'attacker_spawn', isCover: true },
  { id: 'wp_att_east', position: new THREE.Vector3(12, 0, 38), neighbors: ['wp_att_center', 'wp_east_entry', 'wp_flank_south'], area: 'attacker_spawn', isCover: true },

  // Defender Spawn (North)
  { id: 'wp_def_center', position: new THREE.Vector3(0, 0, -42), neighbors: ['wp_def_west', 'wp_def_east', 'wp_north_mid'], area: 'defender_spawn', isCover: true },
  { id: 'wp_def_west', position: new THREE.Vector3(-14, 0, -36), neighbors: ['wp_def_center', 'wp_site_a_north'], area: 'defender_spawn', isCover: true },
  { id: 'wp_def_east', position: new THREE.Vector3(14, 0, -36), neighbors: ['wp_def_center', 'wp_site_b_north'], area: 'defender_spawn', isCover: true },

  // Central Courtyard & Mid Route
  { id: 'wp_south_mid', position: new THREE.Vector3(0, 0, 22), neighbors: ['wp_att_center', 'wp_court_south', 'wp_west_entry', 'wp_east_entry'], area: 'courtyard', isCover: true },
  { id: 'wp_court_south', position: new THREE.Vector3(0, 0, 10), neighbors: ['wp_south_mid', 'wp_court_west', 'wp_court_east'], area: 'courtyard', isCover: true },
  { id: 'wp_court_west', position: new THREE.Vector3(-10, 0, 0), neighbors: ['wp_court_south', 'wp_court_north', 'wp_mid_breach_a'], area: 'courtyard', isCover: true },
  { id: 'wp_court_east', position: new THREE.Vector3(10, 0, 0), neighbors: ['wp_court_south', 'wp_court_north', 'wp_mid_breach_b'], area: 'courtyard', isCover: true },
  { id: 'wp_court_north', position: new THREE.Vector3(0, 0, -12), neighbors: ['wp_court_west', 'wp_court_east', 'wp_north_mid'], area: 'courtyard', isCover: true },
  { id: 'wp_north_mid', position: new THREE.Vector3(0, 0, -26), neighbors: ['wp_court_north', 'wp_def_center', 'wp_site_a_north', 'wp_site_b_north'], area: 'courtyard', isCover: true },

  // Primary Route A (West Hangar & Bomb Site A)
  { id: 'wp_west_entry', position: new THREE.Vector3(-26, 0, 24), neighbors: ['wp_att_west', 'wp_south_mid', 'wp_hangar_south'], area: 'west_hangar', isCover: false },
  { id: 'wp_hangar_south', position: new THREE.Vector3(-32, 0, 10), neighbors: ['wp_west_entry', 'wp_hangar_mid', 'wp_catwalk_ramp_s'], area: 'west_hangar', isCover: true },
  { id: 'wp_hangar_mid', position: new THREE.Vector3(-30, 0, -2), neighbors: ['wp_hangar_south', 'wp_site_a_center', 'wp_mid_breach_a'], area: 'west_hangar', isCover: true },
  { id: 'wp_mid_breach_a', position: new THREE.Vector3(-18, 0, 0), neighbors: ['wp_court_west', 'wp_hangar_mid'], area: 'west_hangar', isCover: true },
  { id: 'wp_site_a_center', position: new THREE.Vector3(-34, 0, -12), neighbors: ['wp_hangar_mid', 'wp_site_a_cover', 'wp_site_a_north'], area: 'site_a', isCover: true },
  { id: 'wp_site_a_cover', position: new THREE.Vector3(-40, 0, -14), neighbors: ['wp_site_a_center', 'wp_site_a_north'], area: 'site_a', isCover: true },
  { id: 'wp_site_a_north', position: new THREE.Vector3(-28, 0, -26), neighbors: ['wp_site_a_center', 'wp_site_a_cover', 'wp_def_west', 'wp_north_mid'], area: 'site_a', isCover: true },

  // Elevated Catwalk in West Hangar
  { id: 'wp_catwalk_ramp_s', position: new THREE.Vector3(-43, 0, 8), neighbors: ['wp_hangar_south', 'wp_catwalk_top'], area: 'catwalk', isCover: false },
  { id: 'wp_catwalk_top', position: new THREE.Vector3(-43, 3.2, -6), neighbors: ['wp_catwalk_ramp_s', 'wp_site_a_cover'], area: 'catwalk', isCover: true },

  // Primary Route B (East Depot & Bomb Site B)
  { id: 'wp_east_entry', position: new THREE.Vector3(26, 0, 24), neighbors: ['wp_att_east', 'wp_south_mid', 'wp_depot_south'], area: 'east_depot', isCover: false },
  { id: 'wp_depot_south', position: new THREE.Vector3(32, 0, 10), neighbors: ['wp_east_entry', 'wp_depot_mid', 'wp_flank_mid'], area: 'east_depot', isCover: true },
  { id: 'wp_depot_mid', position: new THREE.Vector3(30, 0, 0), neighbors: ['wp_depot_south', 'wp_site_b_center', 'wp_mid_breach_b'], area: 'east_depot', isCover: true },
  { id: 'wp_mid_breach_b', position: new THREE.Vector3(18, 0, 0), neighbors: ['wp_court_east', 'wp_depot_mid'], area: 'east_depot', isCover: true },
  { id: 'wp_site_b_center', position: new THREE.Vector3(34, 0, -10), neighbors: ['wp_depot_mid', 'wp_site_b_cover', 'wp_site_b_north', 'wp_flank_north'], area: 'site_b', isCover: true },
  { id: 'wp_site_b_cover', position: new THREE.Vector3(40, 0, -12), neighbors: ['wp_site_b_center', 'wp_site_b_north'], area: 'site_b', isCover: true },
  { id: 'wp_site_b_north', position: new THREE.Vector3(28, 0, -26), neighbors: ['wp_site_b_center', 'wp_site_b_cover', 'wp_def_east', 'wp_north_mid'], area: 'site_b', isCover: true },

  // Alternate Coastal Flank Corridor (Far East X = 48)
  { id: 'wp_flank_south', position: new THREE.Vector3(46, 0, 26), neighbors: ['wp_att_east', 'wp_flank_mid'], area: 'flank_tunnel', isCover: true },
  { id: 'wp_flank_mid', position: new THREE.Vector3(48, 0, 8), neighbors: ['wp_flank_south', 'wp_depot_south', 'wp_flank_north'], area: 'flank_tunnel', isCover: true },
  { id: 'wp_flank_north', position: new THREE.Vector3(46, 0, -10), neighbors: ['wp_flank_mid', 'wp_site_b_center'], area: 'flank_tunnel', isCover: true }
];
