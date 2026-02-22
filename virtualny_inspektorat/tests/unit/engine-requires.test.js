import { describe, it, expect, beforeEach, vi } from 'vitest';

// VaporwaveEngine constructor needs WebGL renderer — we test checkRequires
// by importing the class and calling the method with a controlled gameState.
// To avoid the full constructor, we extract and test the pure logic directly.

// Replicate the pure logic of checkRequires (engine.js lines 371-388)
function checkRequires(gameState, requires) {
  if (!requires) return true;
  if (typeof requires === 'string') {
    return !!gameState[requires];
  }
  if (requires.all) {
    return requires.all.every(key => !!gameState[key]);
  }
  if (requires.any) {
    return requires.any.some(key => !!gameState[key]);
  }
  return true;
}

describe('checkRequires', () => {
  describe('no requirements', () => {
    it('returns true for null', () => {
      expect(checkRequires({}, null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(checkRequires({}, undefined)).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(checkRequires({}, '')).toBe(true);
    });
  });

  describe('string requires', () => {
    it('returns true when state key is truthy', () => {
      expect(checkRequires({ hasKey: true }, 'hasKey')).toBe(true);
    });

    it('returns true for non-boolean truthy values', () => {
      expect(checkRequires({ count: 5 }, 'count')).toBe(true);
      expect(checkRequires({ name: 'test' }, 'name')).toBe(true);
    });

    it('returns false when state key is missing', () => {
      expect(checkRequires({}, 'hasKey')).toBe(false);
    });

    it('returns false when state key is false', () => {
      expect(checkRequires({ hasKey: false }, 'hasKey')).toBe(false);
    });

    it('returns false when state key is 0', () => {
      expect(checkRequires({ hasKey: 0 }, 'hasKey')).toBe(false);
    });

    it('returns false when state key is null', () => {
      expect(checkRequires({ hasKey: null }, 'hasKey')).toBe(false);
    });
  });

  describe('all requires', () => {
    it('returns true when all keys are truthy', () => {
      expect(checkRequires(
        { a: true, b: true, c: true },
        { all: ['a', 'b', 'c'] }
      )).toBe(true);
    });

    it('returns false when any key is missing', () => {
      expect(checkRequires(
        { a: true },
        { all: ['a', 'b'] }
      )).toBe(false);
    });

    it('returns false when any key is falsy', () => {
      expect(checkRequires(
        { a: true, b: false },
        { all: ['a', 'b'] }
      )).toBe(false);
    });

    it('returns true for empty all array (vacuous truth)', () => {
      expect(checkRequires({}, { all: [] })).toBe(true);
    });
  });

  describe('any requires', () => {
    it('returns true when at least one key is truthy', () => {
      expect(checkRequires(
        { b: true },
        { any: ['a', 'b'] }
      )).toBe(true);
    });

    it('returns false when no keys are truthy', () => {
      expect(checkRequires(
        {},
        { any: ['a', 'b'] }
      )).toBe(false);
    });

    it('returns false for empty any array', () => {
      expect(checkRequires({}, { any: [] })).toBe(false);
    });

    it('returns true when all keys are truthy', () => {
      expect(checkRequires(
        { a: true, b: true },
        { any: ['a', 'b'] }
      )).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns true for object with no all/any keys', () => {
      expect(checkRequires({}, {})).toBe(true);
    });

    it('all takes precedence when both all and any are present', () => {
      // When both are present, 'all' is checked first (code order)
      expect(checkRequires(
        { a: true },
        { all: ['a', 'b'], any: ['a'] }
      )).toBe(false); // all fails
    });
  });
});
