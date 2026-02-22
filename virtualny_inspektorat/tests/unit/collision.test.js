import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CollisionSystem } from '../../js/collision.js';

// Helper: create a mesh box at a known position
function makeBox(x, y, z, w, h, d) {
  const geom = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshBasicMaterial();
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(x, y, z);
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('CollisionSystem', () => {
  let cs;

  beforeEach(() => {
    cs = new CollisionSystem();
  });

  describe('constructor', () => {
    it('starts with empty colliders and terrains', () => {
      expect(cs.colliders).toHaveLength(0);
      expect(cs.terrains).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('removes all colliders and terrains', () => {
      cs.addBox(makeBox(0, 0, 0, 10, 0.1, 10));
      cs.addTerrain(makeBox(0, 0, 0, 10, 0.1, 10));
      cs.clear();
      expect(cs.colliders).toHaveLength(0);
      expect(cs.terrains).toHaveLength(0);
    });
  });

  describe('addBox', () => {
    it('adds a collider with computed bounding box', () => {
      const mesh = makeBox(0, 0, 0, 4, 2, 4);
      cs.addBox(mesh);
      expect(cs.colliders).toHaveLength(1);
      expect(cs.colliders[0].box).toBeInstanceOf(THREE.Box3);
    });

    it('stores options correctly', () => {
      const mesh = makeBox(0, 0, 0, 4, 2, 4);
      cs.addBox(mesh, { walkable: true, trigger: true, triggerId: 'zone1' });
      expect(cs.colliders[0].walkable).toBe(true);
      expect(cs.colliders[0].trigger).toBe(true);
      expect(cs.colliders[0].triggerId).toBe('zone1');
    });

    it('defaults options to false/null', () => {
      cs.addBox(makeBox(0, 0, 0, 1, 1, 1));
      expect(cs.colliders[0].walkable).toBe(false);
      expect(cs.colliders[0].trigger).toBe(false);
      expect(cs.colliders[0].triggerId).toBe(null);
    });
  });

  describe('addTerrain', () => {
    it('adds a terrain entry', () => {
      cs.addTerrain(makeBox(0, 0, 0, 10, 0.1, 10));
      expect(cs.terrains).toHaveLength(1);
    });
  });

  describe('removeObject', () => {
    it('removes colliders belonging to the given mesh', () => {
      const mesh1 = makeBox(0, 0, 0, 1, 1, 1);
      const mesh2 = makeBox(5, 0, 0, 1, 1, 1);
      cs.addBox(mesh1);
      cs.addBox(mesh2);
      expect(cs.colliders).toHaveLength(2);
      cs.removeObject(mesh1);
      expect(cs.colliders).toHaveLength(1);
      expect(cs.colliders[0].mesh).toBe(mesh2);
    });

    it('removes colliders for all children in a group', () => {
      const group = new THREE.Group();
      const mesh1 = makeBox(0, 0, 0, 1, 1, 1);
      const mesh2 = makeBox(1, 0, 0, 1, 1, 1);
      group.add(mesh1);
      group.add(mesh2);
      cs.addBox(mesh1);
      cs.addBox(mesh2);
      cs.removeObject(group);
      expect(cs.colliders).toHaveLength(0);
    });
  });

  describe('checkPosition — empty colliders', () => {
    it('returns no collision with empty colliders', () => {
      const pos = new THREE.Vector3(0, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.collided).toBe(false);
      expect(result.groundY).toBe(-Infinity);
      expect(result.pushback.x).toBe(0);
      expect(result.pushback.z).toBe(0);
      expect(result.slopeNormal).toBe(null);
      expect(result.triggeredIds).toEqual([]);
    });
  });

  describe('checkPosition — ground detection', () => {
    it('detects ground when player stands on a floor', () => {
      // Floor: box at y=0, height=0.2 → top at y=0.1
      const floor = makeBox(0, 0, 0, 20, 0.2, 20);
      cs.addBox(floor);

      // Player at eye height 1.6, feet at y=0 (playerBottom = 1.6 - 1.6 = 0)
      const pos = new THREE.Vector3(0, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.groundY).toBeCloseTo(0.1, 1);
    });

    it('does not detect ground when player is outside floor bounds', () => {
      const floor = makeBox(0, 0, 0, 4, 0.2, 4);
      cs.addBox(floor);

      // Player far from the floor
      const pos = new THREE.Vector3(50, 1.6, 50);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.groundY).toBe(-Infinity);
    });

    it('detects higher ground among multiple platforms', () => {
      const lowFloor = makeBox(0, 0, 0, 20, 0.2, 20);
      const highPlatform = makeBox(0, 1, 0, 20, 0.2, 20);
      cs.addBox(lowFloor);
      cs.addBox(highPlatform);

      // Player at height above high platform
      const pos = new THREE.Vector3(0, 2.7, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.groundY).toBeCloseTo(1.1, 1);
    });

    it('recovers from fall-through (Case 3)', () => {
      // Floor top at y=0.1
      const floor = makeBox(0, 0, 0, 20, 0.2, 20);
      cs.addBox(floor);

      // Player's previous Y was above floor, current Y is below (fell through)
      const prevY = 1.8; // prevBottom = 1.8 - 1.6 = 0.2 (above 0.1)
      const pos = new THREE.Vector3(0, 1.5, 0); // playerBottom = 1.5 - 1.6 = -0.1 (below 0.1)
      const result = cs.checkPosition(pos, 0.4, 1.6, prevY);
      expect(result.groundY).toBeCloseTo(0.1, 1);
    });

    it('recovers from penetration (Case 4)', () => {
      // Floor: y=0, h=2 → min.y=-1, max.y=1
      const floor = makeBox(0, 0, 0, 20, 2, 20);
      cs.addBox(floor);

      // Player inside the box
      const pos = new THREE.Vector3(0, 1.6, 0); // playerBottom = 0, inside box (min.y=-1 to max.y=1)
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.groundY).toBeCloseTo(1.0, 1);
    });
  });

  describe('checkPosition — wall collision', () => {
    it('pushes back when hitting a wall (stepUp > STEP_HEIGHT)', () => {
      // Tall wall: center at x=2, h=5 → x: [1.75, 2.25], y: [0, 5]
      const wall = makeBox(2, 2.5, 0, 0.5, 5, 10);
      cs.addBox(wall);

      // Player approaching from -x side, outside box but within radius
      // closestX = 1.75, dx = 1.5 - 1.75 = -0.25, horizDist = 0.25 < 0.4
      const pos = new THREE.Vector3(1.5, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.collided).toBe(true);
      expect(result.pushback.x).toBeLessThan(0); // pushed away from wall in -x direction
    });

    it('allows step-up for low obstacles (stepUp <= STEP_HEIGHT)', () => {
      // Low step: y=0.15, h=0.3 → top at 0.3
      const step = makeBox(2, 0.15, 0, 2, 0.3, 10);
      cs.addBox(step);

      // Player walking near the step, feet at y=0
      const pos = new THREE.Vector3(1.5, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      // Step height is 0.3, which is <= STEP_HEIGHT (0.5), so it should allow stepping up
      expect(result.collided).toBe(false);
      expect(result.groundY).toBeCloseTo(0.3, 1);
    });
  });

  describe('checkPosition — trigger zones', () => {
    it('does not block movement in trigger zones', () => {
      const trigger = makeBox(0, 1, 0, 4, 2, 4);
      cs.addBox(trigger, { trigger: true, triggerId: 'zone_a' });

      const pos = new THREE.Vector3(0, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.collided).toBe(false);
    });

    it('reports triggered IDs when player overlaps', () => {
      const trigger = makeBox(0, 1, 0, 4, 4, 4);
      cs.addBox(trigger, { trigger: true, triggerId: 'zone_a' });

      const pos = new THREE.Vector3(0, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.triggeredIds).toContain('zone_a');
    });

    it('does not report triggers when player is outside', () => {
      const trigger = makeBox(0, 1, 0, 2, 2, 2);
      cs.addBox(trigger, { trigger: true, triggerId: 'zone_b' });

      const pos = new THREE.Vector3(50, 1.6, 50);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.triggeredIds).toEqual([]);
    });

    it('does not set groundY from trigger zones', () => {
      const trigger = makeBox(0, 0, 0, 10, 0.2, 10);
      cs.addBox(trigger, { trigger: true, triggerId: 'floor_trigger' });

      const pos = new THREE.Vector3(0, 1.6, 0);
      const result = cs.checkPosition(pos, 0.4, 1.6);
      expect(result.groundY).toBe(-Infinity);
    });
  });

  describe('update', () => {
    it('recalculates bounding boxes after mesh moves', () => {
      const mesh = makeBox(0, 0, 0, 2, 2, 2);
      cs.addBox(mesh);

      const boxBefore = cs.colliders[0].box.clone();

      // Move the mesh
      mesh.position.set(10, 10, 10);
      mesh.updateMatrixWorld(true);
      cs.update();

      const boxAfter = cs.colliders[0].box;
      expect(boxAfter.min.x).not.toBe(boxBefore.min.x);
      expect(boxAfter.min.y).not.toBe(boxBefore.min.y);
    });
  });
});
