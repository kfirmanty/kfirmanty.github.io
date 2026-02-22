import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimationSystem } from '../../js/animation.js';

describe('AnimationSystem', () => {
  let anim;

  beforeEach(() => {
    anim = new AnimationSystem();
  });

  describe('constructor', () => {
    it('starts with empty animations array', () => {
      expect(anim.animations).toEqual([]);
    });
  });

  describe('add', () => {
    it('adds an animation entry', () => {
      const obj = { name: 'test' };
      const fn = vi.fn();
      anim.add(obj, fn);
      expect(anim.animations).toHaveLength(1);
    });

    it('stores object and update function', () => {
      const obj = { id: 1 };
      const fn = vi.fn();
      anim.add(obj, fn);
      expect(anim.animations[0].object).toBe(obj);
      expect(anim.animations[0].update).toBe(fn);
    });

    it('supports multiple animations', () => {
      anim.add({}, vi.fn());
      anim.add({}, vi.fn());
      anim.add({}, vi.fn());
      expect(anim.animations).toHaveLength(3);
    });
  });

  describe('tick', () => {
    it('calls update with time, delta, and object', () => {
      const obj = { id: 'cube' };
      const fn = vi.fn();
      anim.add(obj, fn);
      anim.tick(1.5, 0.016);
      expect(fn).toHaveBeenCalledWith(1.5, 0.016, obj);
    });

    it('calls all animations each tick', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();
      anim.add({}, fn1);
      anim.add({}, fn2);
      anim.add({}, fn3);
      anim.tick(0, 0.016);
      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
      expect(fn3).toHaveBeenCalledOnce();
    });

    it('removes animation when update returns false', () => {
      const fn = vi.fn().mockReturnValue(false);
      anim.add({}, fn);
      anim.tick(0, 0.016);
      expect(anim.animations).toHaveLength(0);
    });

    it('keeps animation when update returns undefined', () => {
      const fn = vi.fn(); // returns undefined
      anim.add({}, fn);
      anim.tick(0, 0.016);
      expect(anim.animations).toHaveLength(1);
    });

    it('keeps animation when update returns true', () => {
      const fn = vi.fn().mockReturnValue(true);
      anim.add({}, fn);
      anim.tick(0, 0.016);
      expect(anim.animations).toHaveLength(1);
    });

    it('does not throw on empty animations list', () => {
      expect(() => anim.tick(0, 0.016)).not.toThrow();
    });

    it('auto-removes completed animations among active ones', () => {
      let callCount = 0;
      const staying = vi.fn().mockReturnValue(true);
      const leaving = vi.fn(() => {
        callCount++;
        return callCount >= 2 ? false : true;
      });

      anim.add({ name: 'staying' }, staying);
      anim.add({ name: 'leaving' }, leaving);

      anim.tick(0, 0.016);
      expect(anim.animations).toHaveLength(2);

      anim.tick(0.016, 0.016);
      expect(anim.animations).toHaveLength(1);
      expect(anim.animations[0].object.name).toBe('staying');
    });
  });

  describe('clear', () => {
    it('removes all animations', () => {
      anim.add({}, vi.fn());
      anim.add({}, vi.fn());
      anim.clear();
      expect(anim.animations).toHaveLength(0);
    });

    it('prevents cleared animations from ticking', () => {
      const fn = vi.fn();
      anim.add({}, fn);
      anim.clear();
      anim.tick(0, 0.016);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
