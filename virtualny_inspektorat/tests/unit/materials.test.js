import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createMaterial } from '../../js/shared/materials.js';

describe('createMaterial', () => {
  describe('null/undefined input', () => {
    it('returns MeshStandardMaterial for null', () => {
      const mat = createMaterial(null);
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('returns MeshStandardMaterial for undefined', () => {
      const mat = createMaterial(undefined);
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('returns default grey color for null', () => {
      const mat = createMaterial(null);
      expect(mat.color.getHex()).toBe(0xcccccc);
    });
  });

  describe('color', () => {
    it('applies specified color', () => {
      const mat = createMaterial({ color: '#ff0000' });
      expect(mat.color.r).toBeCloseTo(1);
      expect(mat.color.g).toBeCloseTo(0);
      expect(mat.color.b).toBeCloseTo(0);
    });
  });

  describe('flatShading', () => {
    it('defaults to flat shading when not specified', () => {
      const mat = createMaterial({ color: '#ffffff' });
      expect(mat.flatShading).toBe(true);
    });

    it('can disable flat shading', () => {
      const mat = createMaterial({ color: '#ffffff', flatShading: false });
      expect(mat.flatShading).toBe(false);
    });
  });

  describe('metalness and roughness', () => {
    it('defaults metalness to 0.1', () => {
      const mat = createMaterial({ color: '#ffffff' });
      expect(mat.metalness).toBeCloseTo(0.1);
    });

    it('defaults roughness to 0.8', () => {
      const mat = createMaterial({ color: '#ffffff' });
      expect(mat.roughness).toBeCloseTo(0.8);
    });

    it('applies custom metalness and roughness', () => {
      const mat = createMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.3 });
      expect(mat.metalness).toBeCloseTo(0.5);
      expect(mat.roughness).toBeCloseTo(0.3);
    });
  });

  describe('emissive', () => {
    it('applies emissive color', () => {
      const mat = createMaterial({ color: '#ffffff', emissive: '#ff00ff' });
      expect(mat.emissive.r).toBeGreaterThan(0);
    });

    it('defaults emissiveIntensity to 1.0', () => {
      const mat = createMaterial({ color: '#ffffff', emissive: '#ff00ff' });
      expect(mat.emissiveIntensity).toBeCloseTo(1.0);
    });

    it('applies custom emissiveIntensity', () => {
      const mat = createMaterial({ color: '#ffffff', emissive: '#ff00ff', emissiveIntensity: 2.0 });
      expect(mat.emissiveIntensity).toBeCloseTo(2.0);
    });
  });

  describe('transparency', () => {
    it('enables transparency', () => {
      const mat = createMaterial({ color: '#ffffff', transparent: true });
      expect(mat.transparent).toBe(true);
    });

    it('defaults opacity to 0.5 when transparent', () => {
      const mat = createMaterial({ color: '#ffffff', transparent: true });
      expect(mat.opacity).toBeCloseTo(0.5);
    });

    it('applies custom opacity', () => {
      const mat = createMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
      expect(mat.opacity).toBeCloseTo(0.8);
    });
  });

  describe('wireframe', () => {
    it('enables wireframe', () => {
      const mat = createMaterial({ color: '#ffffff', wireframe: true });
      expect(mat.wireframe).toBe(true);
    });
  });

  describe('side', () => {
    it('sets double side when specified', () => {
      const mat = createMaterial({ color: '#ffffff', side: 'double' });
      expect(mat.side).toBe(THREE.DoubleSide);
    });
  });

  describe('texture', () => {
    it('applies texture from registry', () => {
      const mat = createMaterial({ color: '#ffffff', texture: 'marble' });
      expect(mat.map).not.toBeNull();
      expect(mat.map).toBeInstanceOf(THREE.Texture);
    });

    it('applies texture repeat', () => {
      const mat = createMaterial({ color: '#ffffff', texture: 'marble', textureRepeat: [4, 4] });
      expect(mat.map.repeat.x).toBe(4);
      expect(mat.map.repeat.y).toBe(4);
    });

    it('handles missing texture gracefully', () => {
      const mat = createMaterial({ color: '#ffffff', texture: 'nonexistent' });
      // Should not crash; map should be undefined or the default
      expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
    });
  });
});
