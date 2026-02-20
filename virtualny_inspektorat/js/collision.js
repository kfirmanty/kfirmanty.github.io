import * as THREE from 'three';
import { STEP_HEIGHT } from './constants.js';

export class CollisionSystem {
  constructor() {
    this.colliders = []; // { box: THREE.Box3, mesh: THREE.Mesh, walkable: bool, stepHeight: number }
  }

  clear() {
    this.colliders = [];
  }

  addBox(mesh, options = {}) {
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({
      box,
      mesh,
      walkable: options.walkable || false,
      stepHeight: options.stepHeight || 0,
      isStairs: options.isStairs || false
    });
  }

  // Recalculate boxes for moved objects
  update() {
    for (const c of this.colliders) {
      c.box.setFromObject(c.mesh);
    }
  }

  // Check if a sphere (player) at position would collide
  // Returns { collided, groundY, pushback }
  checkPosition(pos, radius, height, prevY) {
    let groundY = -Infinity;
    let collided = false;
    const playerBottom = pos.y - height;
    const playerTop = pos.y;
    const prevBottom = (prevY !== undefined ? prevY : pos.y) - height;
    const pushback = new THREE.Vector3();

    for (const c of this.colliders) {
      const box = c.box;

      // Is the player within the horizontal footprint of this box?
      const inX = pos.x >= box.min.x - radius && pos.x <= box.max.x + radius;
      const inZ = pos.z >= box.min.z - radius && pos.z <= box.max.z + radius;

      if (inX && inZ) {
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
      // Only check wall pushback for boxes whose top is significantly above player feet
      // (i.e., we can't step onto them)
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

    return { collided, groundY, pushback };
  }
}
