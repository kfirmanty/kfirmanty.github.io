import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GeometryBuilders, COMPOUND_TYPES } from '../../js/shared/geometry.js';

describe('COMPOUND_TYPES', () => {
  it('contains expected types', () => {
    expect(COMPOUND_TYPES).toEqual(['column', 'stairs', 'pediment', 'head', 'water']);
  });

  it('all compound types have builder functions', () => {
    for (const type of COMPOUND_TYPES) {
      expect(typeof GeometryBuilders[type]).toBe('function');
    }
  });
});

describe('GeometryBuilders — primitives', () => {
  describe('box', () => {
    it('returns BoxGeometry', () => {
      const geom = GeometryBuilders.box({ width: 2, height: 3, depth: 4 });
      expect(geom).toBeInstanceOf(THREE.BoxGeometry);
    });

    it('uses defaults for empty params', () => {
      const geom = GeometryBuilders.box({});
      expect(geom).toBeInstanceOf(THREE.BoxGeometry);
    });
  });

  describe('sphere', () => {
    it('returns SphereGeometry', () => {
      const geom = GeometryBuilders.sphere({ radius: 2 });
      expect(geom).toBeInstanceOf(THREE.SphereGeometry);
    });
  });

  describe('cylinder', () => {
    it('returns CylinderGeometry', () => {
      const geom = GeometryBuilders.cylinder({ radius: 1, height: 3 });
      expect(geom).toBeInstanceOf(THREE.CylinderGeometry);
    });

    it('supports separate radiusTop and radiusBottom', () => {
      const geom = GeometryBuilders.cylinder({ radiusTop: 0.5, radiusBottom: 1.0, height: 2 });
      expect(geom).toBeInstanceOf(THREE.CylinderGeometry);
      expect(geom.parameters.radiusTop).toBeCloseTo(0.5);
      expect(geom.parameters.radiusBottom).toBeCloseTo(1.0);
    });
  });

  describe('cone', () => {
    it('returns ConeGeometry', () => {
      const geom = GeometryBuilders.cone({ radius: 1, height: 2 });
      expect(geom).toBeInstanceOf(THREE.ConeGeometry);
    });
  });

  describe('plane', () => {
    it('returns PlaneGeometry', () => {
      const geom = GeometryBuilders.plane({ width: 5, height: 5 });
      expect(geom).toBeInstanceOf(THREE.PlaneGeometry);
    });
  });

  describe('torus', () => {
    it('returns TorusGeometry', () => {
      const geom = GeometryBuilders.torus({ radius: 2, tube: 0.5 });
      expect(geom).toBeInstanceOf(THREE.TorusGeometry);
    });
  });

  describe('terrain', () => {
    it('returns BufferGeometry', () => {
      const geom = GeometryBuilders.terrain({ width: 10, depth: 10, segments: 4 });
      expect(geom).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('modifies vertex Y positions for hills', () => {
      const geom = GeometryBuilders.terrain({
        width: 10, depth: 10, segments: 4,
        hillHeight: 5, hillFrequency: 0.5
      });
      const pos = geom.attributes.position;
      let hasNonZeroY = false;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i)) > 0.01) {
          hasNonZeroY = true;
          break;
        }
      }
      expect(hasNonZeroY).toBe(true);
    });
  });
});

describe('GeometryBuilders — compound types', () => {
  const dummyMat = new THREE.MeshBasicMaterial();

  describe('column', () => {
    it('returns a Group', () => {
      const col = GeometryBuilders.column({ radius: 0.3, height: 4, _material: dummyMat });
      expect(col).toBeInstanceOf(THREE.Group);
    });

    it('has 3 children (shaft, capital, base)', () => {
      const col = GeometryBuilders.column({ radius: 0.3, height: 4, _material: dummyMat });
      expect(col.children).toHaveLength(3);
    });
  });

  describe('stairs', () => {
    it('returns a Group', () => {
      const stairs = GeometryBuilders.stairs({ steps: 4, _material: dummyMat });
      expect(stairs).toBeInstanceOf(THREE.Group);
    });

    it('has one child per step', () => {
      const stairs = GeometryBuilders.stairs({ steps: 5, _material: dummyMat });
      expect(stairs.children).toHaveLength(5);
    });

    it('uses default step count of 8', () => {
      const stairs = GeometryBuilders.stairs({ _material: dummyMat });
      expect(stairs.children).toHaveLength(8);
    });
  });

  describe('pediment', () => {
    it('returns a Group', () => {
      const ped = GeometryBuilders.pediment({ width: 8, height: 2, depth: 0.5, _material: dummyMat });
      expect(ped).toBeInstanceOf(THREE.Group);
    });

    it('has 1 child (extruded triangle)', () => {
      const ped = GeometryBuilders.pediment({ _material: dummyMat });
      expect(ped.children).toHaveLength(1);
    });
  });

  describe('head', () => {
    it('returns a Group', () => {
      const head = GeometryBuilders.head({ scale: 1, _material: dummyMat });
      expect(head).toBeInstanceOf(THREE.Group);
    });

    it('has many children (face parts)', () => {
      const head = GeometryBuilders.head({ scale: 1, _material: dummyMat });
      // cranium, brow, 2 sockets, 2 irises, bridge, tip, 2 cheeks, mouth, jaw, chin = 13
      expect(head.children.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('water', () => {
    it('returns a Mesh (not a Group)', () => {
      const water = GeometryBuilders.water({ width: 100, height: 100 });
      expect(water).toBeInstanceOf(THREE.Mesh);
    });

    it('sets userData.isWater = true', () => {
      const water = GeometryBuilders.water({ width: 50, height: 50 });
      expect(water.userData.isWater).toBe(true);
    });

    it('applies specified water level', () => {
      const water = GeometryBuilders.water({ width: 50, height: 50, level: -5 });
      expect(water.position.y).toBe(-5);
    });

    it('uses default level of -2', () => {
      const water = GeometryBuilders.water({ width: 50, height: 50 });
      expect(water.position.y).toBe(-2);
    });
  });
});
