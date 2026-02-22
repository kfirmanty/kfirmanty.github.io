import * as THREE from 'three';
import { STEP_HEIGHT } from './constants.js';

export class CollisionSystem {
  constructor() {
    this.colliders = []; // { box: THREE.Box3, mesh: THREE.Mesh, walkable: bool, stepHeight: number, trigger: bool }
    this.terrains = []; // { mesh: THREE.Mesh }
    this._terrainRay = new THREE.Raycaster();
    this._terrainRayOrigin = new THREE.Vector3();
    this._terrainRayDir = new THREE.Vector3(0, -1, 0);
    this._activeTriggers = new Set(); // Currently overlapping trigger IDs
  }

  clear() {
    this.colliders = [];
    this.terrains = [];
    this._activeTriggers.clear();
  }

  addTerrain(mesh) {
    this.terrains.push({ mesh });
  }

  addBox(mesh, options = {}) {
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({
      box,
      mesh,
      walkable: options.walkable || false,
      stepHeight: options.stepHeight || 0,
      isStairs: options.isStairs || false,
      trigger: options.trigger || false,
      triggerId: options.triggerId || null
    });
  }

  removeObject(object) {
    const meshes = new Set();
    if (object.isMesh) meshes.add(object);
    object.traverse(child => { if (child.isMesh) meshes.add(child); });
    this.colliders = this.colliders.filter(c => !meshes.has(c.mesh));
  }

  // Recalculate boxes for moved objects
  update() {
    for (const c of this.colliders) {
      c.box.setFromObject(c.mesh);
    }
  }

  // Check if a sphere (player) at position would collide
  // Returns { collided, groundY, pushback, slopeNormal, triggeredIds[] }
  checkPosition(pos, radius, height, prevY) {
    let groundY = -Infinity;
    let collided = false;
    const playerBottom = pos.y - height;
    const playerTop = pos.y;
    const prevBottom = (prevY !== undefined ? prevY : pos.y) - height;
    const pushback = new THREE.Vector3();
    const triggeredIds = [];
    let slopeNormal = null;

    for (const c of this.colliders) {
      const box = c.box;

      // Is the player within the horizontal footprint of this box?
      const inX = pos.x >= box.min.x - radius && pos.x <= box.max.x + radius;
      const inZ = pos.z >= box.min.z - radius && pos.z <= box.max.z + radius;

      if (inX && inZ) {
        // Check vertical overlap for trigger zones
        if (c.trigger) {
          const overlapBottom = playerBottom < box.max.y;
          const overlapTop = playerTop > box.min.y;
          if (overlapBottom && overlapTop &&
              pos.x > box.min.x - radius && pos.x < box.max.x + radius &&
              pos.z > box.min.z - radius && pos.z < box.max.z + radius) {
            if (c.triggerId) triggeredIds.push(c.triggerId);
          }
          continue; // Triggers don't block movement
        }

        // ── GROUND DETECTION ──
        // Case 1: Player feet are near or on the surface top
        if (Math.abs(playerBottom - box.max.y) < 0.5 && box.max.y > groundY) {
          groundY = box.max.y;
        }
        // Case 2: Player feet are above the surface (normal standing)
        if (box.max.y <= playerBottom + 0.05 && box.max.y > groundY) {
          groundY = box.max.y;
        }
        // Case 3: Player fell through the surface this frame
        // (previous feet were above, current feet are below)
        if (prevBottom >= box.max.y - 0.1 && playerBottom < box.max.y && box.max.y > groundY) {
          groundY = box.max.y;
        }
        // Case 4: Player is inside the box (penetration recovery)
        if (playerBottom < box.max.y && playerBottom > box.min.y &&
          pos.x > box.min.x && pos.x < box.max.x &&
          pos.z > box.min.z && pos.z < box.max.z &&
          box.max.y > groundY) {
          groundY = box.max.y;
        }
      }

      // ── WALL COLLISION ──
      if (c.trigger) continue; // Triggers don't block

      const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      if (horizDist < radius) {
        const overlapBottom = playerBottom < box.max.y;
        const overlapTop = playerTop > box.min.y;

        if (overlapBottom && overlapTop) {
          const stepUp = box.max.y - playerBottom;
          if (stepUp > 0 && stepUp <= STEP_HEIGHT) {
            // Can step up — already handled in ground detection
            if (box.max.y > groundY) groundY = box.max.y;
          } else if (stepUp > STEP_HEIGHT) {
            // Wall — push back horizontally
            collided = true;
            if (horizDist > 0.001) {
              const pushDist = radius - horizDist;
              pushback.x += (dx / horizDist) * pushDist;
              pushback.z += (dz / horizDist) * pushDist;
            } else {
              // Player is exactly on the edge, push in +x direction as fallback
              pushback.x += radius;
            }
          }
        }
      }
    }

    // Terrain ground detection via raycast
    for (const t of this.terrains) {
      this._terrainRayOrigin.set(pos.x, pos.y + 10, pos.z);
      this._terrainRay.set(this._terrainRayOrigin, this._terrainRayDir);
      this._terrainRay.far = 50;
      const hits = this._terrainRay.intersectObject(t.mesh);
      if (hits.length > 0) {
        const terrainY = hits[0].point.y;
        if (terrainY > groundY) {
          groundY = terrainY;
          // Get slope normal for sliding
          if (hits[0].face) {
            slopeNormal = hits[0].face.normal.clone();
            // Transform normal from local to world space
            slopeNormal.transformDirection(t.mesh.matrixWorld);
          }
        }
      }
    }

    return { collided, groundY, pushback, slopeNormal, triggeredIds };
  }
}
