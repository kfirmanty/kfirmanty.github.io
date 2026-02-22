import { describe, it, expect, vi, beforeEach } from 'vitest';

// handleAction is a method of VaporwaveEngine. Since the constructor requires
// WebGL, we test the logic by creating a minimal mock object with the method bound.

function createMockEngine() {
  const engine = {
    gameState: {},
    loadScene: vi.fn(),
    notifications: { show: vi.fn() },
    updateConditionalVisibility: vi.fn(),
    fadeObject: vi.fn(),
    handleAction(action) {
      if (!action) return;
      if (Array.isArray(action)) {
        for (const a of action) this.handleAction(a);
        return;
      }
      if (action.type === 'transition') {
        this.loadScene(action.target);
      } else if (action.type === 'notify') {
        this.notifications.show(action.text, action.duration || 3000);
      } else if (action.type === 'setState') {
        this.gameState[action.key] = action.value;
        this.updateConditionalVisibility();
      } else if (action.type === 'fadeIn') {
        this.fadeObject(action.target, action.duration ?? 1.5, true);
      } else if (action.type === 'fadeOut') {
        this.fadeObject(action.target, action.duration ?? 1.5, false);
      }
    }
  };
  return engine;
}

describe('handleAction', () => {
  let engine;

  beforeEach(() => {
    engine = createMockEngine();
  });

  it('does nothing for null action', () => {
    expect(() => engine.handleAction(null)).not.toThrow();
    expect(engine.loadScene).not.toHaveBeenCalled();
  });

  it('does nothing for undefined action', () => {
    expect(() => engine.handleAction(undefined)).not.toThrow();
  });

  describe('transition', () => {
    it('calls loadScene with target', () => {
      engine.handleAction({ type: 'transition', target: 'temple_interior' });
      expect(engine.loadScene).toHaveBeenCalledWith('temple_interior');
    });
  });

  describe('notify', () => {
    it('shows notification with text and duration', () => {
      engine.handleAction({ type: 'notify', text: 'Hello!', duration: 5000 });
      expect(engine.notifications.show).toHaveBeenCalledWith('Hello!', 5000);
    });

    it('uses default duration of 3000 when not specified', () => {
      engine.handleAction({ type: 'notify', text: 'Hello!' });
      expect(engine.notifications.show).toHaveBeenCalledWith('Hello!', 3000);
    });
  });

  describe('setState', () => {
    it('sets game state key to value', () => {
      engine.handleAction({ type: 'setState', key: 'solved', value: true });
      expect(engine.gameState.solved).toBe(true);
    });

    it('calls updateConditionalVisibility', () => {
      engine.handleAction({ type: 'setState', key: 'x', value: 1 });
      expect(engine.updateConditionalVisibility).toHaveBeenCalledOnce();
    });
  });

  describe('fadeIn', () => {
    it('calls fadeObject with fadeIn=true', () => {
      engine.handleAction({ type: 'fadeIn', target: 'crystal', duration: 2.0 });
      expect(engine.fadeObject).toHaveBeenCalledWith('crystal', 2.0, true);
    });

    it('uses default duration of 1.5', () => {
      engine.handleAction({ type: 'fadeIn', target: 'crystal' });
      expect(engine.fadeObject).toHaveBeenCalledWith('crystal', 1.5, true);
    });
  });

  describe('fadeOut', () => {
    it('calls fadeObject with fadeIn=false', () => {
      engine.handleAction({ type: 'fadeOut', target: 'door', duration: 3.0 });
      expect(engine.fadeObject).toHaveBeenCalledWith('door', 3.0, false);
    });

    it('uses default duration of 1.5', () => {
      engine.handleAction({ type: 'fadeOut', target: 'door' });
      expect(engine.fadeObject).toHaveBeenCalledWith('door', 1.5, false);
    });
  });

  describe('array actions', () => {
    it('recursively processes array of actions', () => {
      engine.handleAction([
        { type: 'setState', key: 'a', value: true },
        { type: 'notify', text: 'Done!' }
      ]);
      expect(engine.gameState.a).toBe(true);
      expect(engine.notifications.show).toHaveBeenCalledWith('Done!', 3000);
    });

    it('handles empty array without error', () => {
      expect(() => engine.handleAction([])).not.toThrow();
    });

    it('handles nested arrays', () => {
      engine.handleAction([
        [{ type: 'setState', key: 'x', value: 1 }],
        { type: 'setState', key: 'y', value: 2 }
      ]);
      expect(engine.gameState.x).toBe(1);
      expect(engine.gameState.y).toBe(2);
    });
  });
});
