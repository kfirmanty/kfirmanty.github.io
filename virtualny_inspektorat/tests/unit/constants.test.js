import { describe, it, expect } from 'vitest';
import * as C from '../../js/constants.js';

describe('constants', () => {
  it('exports all expected constants', () => {
    const expectedKeys = [
      'RENDER_WIDTH', 'RENDER_HEIGHT',
      'PLAYER_HEIGHT', 'PLAYER_RADIUS', 'MOVE_SPEED', 'MOUSE_SENSITIVITY',
      'GRAVITY', 'JUMP_FORCE', 'INTERACT_DISTANCE', 'STEP_HEIGHT',
      'BOB_AMPLITUDE', 'BOB_FREQUENCY',
      'ACCEL', 'DECEL', 'FRICTION',
      'MAX_SLOPE_ANGLE', 'SLOPE_SLIDE_FORCE'
    ];
    for (const key of expectedKeys) {
      expect(C).toHaveProperty(key);
    }
  });

  it('all exports are numbers', () => {
    for (const [key, value] of Object.entries(C)) {
      expect(typeof value, `${key} should be a number`).toBe('number');
    }
  });

  // Value guards — prevent accidental physics changes
  describe('rendering', () => {
    it('has 640x480 resolution', () => {
      expect(C.RENDER_WIDTH).toBe(640);
      expect(C.RENDER_HEIGHT).toBe(480);
    });
  });

  describe('player dimensions', () => {
    it('has correct player height and radius', () => {
      expect(C.PLAYER_HEIGHT).toBe(1.6);
      expect(C.PLAYER_RADIUS).toBe(0.4);
    });
  });

  describe('physics', () => {
    it('gravity is negative (downward)', () => {
      expect(C.GRAVITY).toBeLessThan(0);
    });

    it('jump force is positive (upward)', () => {
      expect(C.JUMP_FORCE).toBeGreaterThan(0);
    });

    it('step height is less than player height', () => {
      expect(C.STEP_HEIGHT).toBeLessThan(C.PLAYER_HEIGHT);
    });

    it('has expected gravity and jump values', () => {
      expect(C.GRAVITY).toBe(-15);
      expect(C.JUMP_FORCE).toBe(6);
      expect(C.STEP_HEIGHT).toBe(0.5);
    });
  });

  describe('movement', () => {
    it('move speed is positive', () => {
      expect(C.MOVE_SPEED).toBeGreaterThan(0);
    });

    it('acceleration exceeds deceleration for responsive feel', () => {
      expect(C.ACCEL).toBeGreaterThan(C.DECEL);
    });

    it('has expected movement values', () => {
      expect(C.MOVE_SPEED).toBe(4.0);
      expect(C.ACCEL).toBe(18.0);
      expect(C.DECEL).toBe(12.0);
      expect(C.FRICTION).toBe(8.0);
    });
  });

  describe('slopes', () => {
    it('max slope angle is between 0 and 90 degrees', () => {
      expect(C.MAX_SLOPE_ANGLE).toBeGreaterThan(0);
      expect(C.MAX_SLOPE_ANGLE).toBeLessThan(90);
    });

    it('has expected slope values', () => {
      expect(C.MAX_SLOPE_ANGLE).toBe(45);
      expect(C.SLOPE_SLIDE_FORCE).toBe(8.0);
    });
  });
});
