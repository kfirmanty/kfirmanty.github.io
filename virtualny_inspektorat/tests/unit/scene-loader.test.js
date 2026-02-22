import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SceneLoader } from '../../js/scene-loader.js';

function makeLoader(gameState = {}) {
  const game = {
    gameState,
    animations: { add: vi.fn() }
  };
  return { loader: new SceneLoader(game), game };
}

describe('SceneLoader', () => {
  describe('_checkVisibility', () => {
    let loader;

    beforeEach(() => {
      ({ loader } = makeLoader());
    });

    it('returns true when no visibility conditions set', () => {
      expect(loader._checkVisibility({}, {})).toBe(true);
    });

    it('returns true when visibleWhen key is truthy in game state', () => {
      expect(loader._checkVisibility(
        { visibleWhen: 'hasKey' },
        { hasKey: true }
      )).toBe(true);
    });

    it('returns false when visibleWhen key is missing from game state', () => {
      expect(loader._checkVisibility(
        { visibleWhen: 'hasKey' },
        {}
      )).toBe(false);
    });

    it('returns false when visibleWhen key is falsy', () => {
      expect(loader._checkVisibility(
        { visibleWhen: 'hasKey' },
        { hasKey: false }
      )).toBe(false);

      expect(loader._checkVisibility(
        { visibleWhen: 'hasKey' },
        { hasKey: 0 }
      )).toBe(false);
    });

    it('returns false when hiddenWhen key is truthy', () => {
      expect(loader._checkVisibility(
        { hiddenWhen: 'isDead' },
        { isDead: true }
      )).toBe(false);
    });

    it('returns true when hiddenWhen key is missing', () => {
      expect(loader._checkVisibility(
        { hiddenWhen: 'isDead' },
        {}
      )).toBe(true);
    });

    it('returns true when hiddenWhen key is falsy', () => {
      expect(loader._checkVisibility(
        { hiddenWhen: 'isDead' },
        { isDead: false }
      )).toBe(true);
    });

    it('visibleWhen takes precedence over hiddenWhen', () => {
      // visibleWhen is checked first in the code
      expect(loader._checkVisibility(
        { visibleWhen: 'a', hiddenWhen: 'b' },
        { a: true, b: true }
      )).toBe(true); // visibleWhen wins
    });
  });

  describe('applyAnimation', () => {
    it('registers a float animation with animations system', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();
      obj.position.set(0, 5, 0);

      loader.applyAnimation(obj, { type: 'float', speed: 2, amplitude: 0.5 });
      expect(game.animations.add).toHaveBeenCalledOnce();

      // Extract the callback and test it
      const [, updateFn] = game.animations.add.mock.calls[0];
      updateFn(Math.PI / 4, 0.016, obj);
      // Position should be modified by sine wave
      expect(obj.position.y).not.toBe(5);
    });

    it('registers a rotate animation', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();

      loader.applyAnimation(obj, { type: 'rotate', speed: 1 });
      expect(game.animations.add).toHaveBeenCalledOnce();

      const [, updateFn] = game.animations.add.mock.calls[0];
      updateFn(2.0, 0.016, obj);
      expect(obj.rotation.y).toBeCloseTo(2.0);
    });

    it('rotate animation respects axis parameter', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();

      loader.applyAnimation(obj, { type: 'rotate', speed: 1, axis: 'x' });

      const [, updateFn] = game.animations.add.mock.calls[0];
      updateFn(1.5, 0.016, obj);
      expect(obj.rotation.x).toBeCloseTo(1.5);
    });

    it('registers a bob animation', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();
      obj.position.set(0, 3, 0);

      loader.applyAnimation(obj, { type: 'bob', speed: 1, amplitude: 1 });
      expect(game.animations.add).toHaveBeenCalledOnce();

      const [, updateFn] = game.animations.add.mock.calls[0];
      updateFn(1.0, 0.016, obj);
      // Both position.y and rotation.y should be modified
      expect(obj.position.y).not.toBe(3);
      expect(obj.rotation.y).not.toBe(0);
    });

    it('registers a pulse animation', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();

      loader.applyAnimation(obj, { type: 'pulse', speed: 2, amplitude: 1 });
      expect(game.animations.add).toHaveBeenCalledOnce();

      const [, updateFn] = game.animations.add.mock.calls[0];
      updateFn(1.0, 0.016, obj);
      // Scale should be modified from default 1
      expect(obj.scale.x).not.toBe(1);
    });

    it('uses default values for missing params', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();
      obj.position.set(0, 2, 0);

      loader.applyAnimation(obj, { type: 'float' });
      expect(game.animations.add).toHaveBeenCalledOnce();

      // Should work without error using defaults (speed=1, amplitude=1, offset=0)
      const [, updateFn] = game.animations.add.mock.calls[0];
      expect(() => updateFn(0, 0.016, obj)).not.toThrow();
    });

    it('does not register animation for unknown type', () => {
      const { loader, game } = makeLoader();
      const obj = new THREE.Object3D();

      loader.applyAnimation(obj, { type: 'unknown_type' });
      expect(game.animations.add).not.toHaveBeenCalled();
    });
  });
});
