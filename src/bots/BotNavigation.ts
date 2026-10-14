import * as THREE from 'three';
import { LEVEL_WAYPOINTS, WaypointNode } from '../world/LevelData.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';

/**
 * Waypoint graph A* pathfinder and tactical cover/flank node selector.
 */
export class BotNavigation {
  private readonly nodes = new Map<string, WaypointNode>();

  constructor(waypoints: readonly WaypointNode[] = LEVEL_WAYPOINTS) {
    for (const wp of waypoints) {
      this.nodes.set(wp.id, wp);
    }
  }

  getAllNodes(): WaypointNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): WaypointNode | undefined {
    return this.nodes.get(id);
  }

  findNearestNode(pos: THREE.Vector3): WaypointNode {
    let best: WaypointNode | null = null;
    let bestDistSq = Infinity;
    for (const wp of this.nodes.values()) {
      const dSq = wp.position.distanceToSquared(pos);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = wp;
      }
    }
    return best!;
  }

  /**
   * Computes an obstacle-aware A* path of 3D positions from startPos to goalPos.
   * Optional avoidPosition penalizes nodes exposed to a known threat (for flanking).
   */
  findPath(
    startPos: THREE.Vector3,
    goalPos: THREE.Vector3,
    avoidPosition?: THREE.Vector3
  ): THREE.Vector3[] {
    const startNode = this.findNearestNode(startPos);
    const goalNode = this.findNearestNode(goalPos);

    if (!startNode || !goalNode) {
      return [goalPos.clone()];
    }
    if (startNode.id === goalNode.id) {
      return [goalPos.clone()];
    }

    const openSet = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    for (const id of this.nodes.keys()) {
      gScore.set(id, Infinity);
      fScore.set(id, Infinity);
    }
    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, startNode.position.distanceTo(goalNode.position));

    while (openSet.size > 0) {
      let currentId = '';
      let lowestF = Infinity;
      for (const id of openSet) {
        const f = fScore.get(id) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          currentId = id;
        }
      }

      if (currentId === goalNode.id) {
        const path: THREE.Vector3[] = [];
        let curr: string | undefined = currentId;
        while (curr) {
          const n = this.nodes.get(curr);
          if (n) path.unshift(n.position.clone());
          curr = cameFrom.get(curr);
        }
        path.push(goalPos.clone());
        return path;
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId);
      if (!currentNode) continue;

      for (const neighborId of currentNode.neighbors) {
        const neighbor = this.nodes.get(neighborId);
        if (!neighbor) continue;

        let edgeCost = currentNode.position.distanceTo(neighbor.position);
        if (avoidPosition) {
          const distToThreat = neighbor.position.distanceTo(avoidPosition);
          if (distToThreat < 18) {
            edgeCost += (18 - distToThreat) * 2.5;
          }
        }

        const tentativeG = (gScore.get(currentId) ?? Infinity) + edgeCost;
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(
            neighborId,
            tentativeG + neighbor.position.distanceTo(goalNode.position)
          );
          openSet.add(neighborId);
        }
      }
    }

    return [goalNode.position.clone(), goalPos.clone()];
  }

  /**
   * Finds a nearby tactical cover waypoint that shields the bot from threatPos
   * or increases separation while staying reachable.
   */
  findCoverPosition(
    botPos: THREE.Vector3,
    threatPos: THREE.Vector3,
    collisionWorld: CollisionWorld
  ): THREE.Vector3 {
    let bestCover: THREE.Vector3 | null = null;
    let bestScore = -Infinity;

    for (const wp of this.nodes.values()) {
      if (!wp.isCover) continue;
      const distFromBot = wp.position.distanceTo(botPos);
      if (distFromBot > 28) continue;

      const eyeAtWp = wp.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const threatEye = threatPos.clone().add(new THREE.Vector3(0, 1.4, 0));
      const blockedFromThreat = !collisionWorld.hasLineOfSight(eyeAtWp, threatEye, true);
      const distFromThreat = wp.position.distanceTo(threatPos);

      let score = -distFromBot * 0.8 + Math.min(25, distFromThreat) * 0.5;
      if (blockedFromThreat) {
        score += 35; // Strongly prefer cover that breaks line-of-sight
      }

      if (score > bestScore) {
        bestScore = score;
        bestCover = wp.position.clone();
      }
    }

    return bestCover ?? this.findNearestNode(botPos).position.clone();
  }
}
