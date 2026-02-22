import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  UndoStack, TransformCommand, PropertyCommand,
  AddObjectCommand, DeleteObjectCommand
} from '../../js/editor-commands.js';

describe('UndoStack', () => {
  let stack;
  let editor;

  beforeEach(() => {
    editor = { refreshInspector: vi.fn() };
    stack = new UndoStack(editor);
  });

  it('starts with empty stacks', () => {
    expect(stack.undoStack).toHaveLength(0);
    expect(stack.redoStack).toHaveLength(0);
  });

  describe('push', () => {
    it('adds command to undo stack', () => {
      const cmd = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd);
      expect(stack.undoStack).toHaveLength(1);
    });

    it('clears redo stack on push', () => {
      const cmd1 = { execute: vi.fn(), undo: vi.fn() };
      const cmd2 = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd1);
      stack.undo();
      expect(stack.redoStack).toHaveLength(1);
      stack.push(cmd2);
      expect(stack.redoStack).toHaveLength(0);
    });

    it('enforces max size by removing oldest', () => {
      for (let i = 0; i < 55; i++) {
        stack.push({ execute: vi.fn(), undo: vi.fn(), id: i });
      }
      expect(stack.undoStack).toHaveLength(50);
      expect(stack.undoStack[0].id).toBe(5); // oldest 5 were removed
    });
  });

  describe('undo', () => {
    it('calls undo on the command', () => {
      const cmd = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd);
      stack.undo();
      expect(cmd.undo).toHaveBeenCalledOnce();
    });

    it('moves command to redo stack', () => {
      const cmd = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd);
      stack.undo();
      expect(stack.undoStack).toHaveLength(0);
      expect(stack.redoStack).toHaveLength(1);
    });

    it('does nothing on empty stack', () => {
      expect(() => stack.undo()).not.toThrow();
    });
  });

  describe('redo', () => {
    it('calls execute on the command', () => {
      const cmd = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd);
      stack.undo();
      stack.redo();
      expect(cmd.execute).toHaveBeenCalledOnce();
    });

    it('moves command back to undo stack', () => {
      const cmd = { execute: vi.fn(), undo: vi.fn() };
      stack.push(cmd);
      stack.undo();
      stack.redo();
      expect(stack.undoStack).toHaveLength(1);
      expect(stack.redoStack).toHaveLength(0);
    });

    it('does nothing on empty redo stack', () => {
      expect(() => stack.redo()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('empties both stacks', () => {
      stack.push({ execute: vi.fn(), undo: vi.fn() });
      stack.push({ execute: vi.fn(), undo: vi.fn() });
      stack.undo();
      stack.clear();
      expect(stack.undoStack).toHaveLength(0);
      expect(stack.redoStack).toHaveLength(0);
    });
  });

  describe('undo/redo cycle', () => {
    it('correctly undoes and redoes multiple commands', () => {
      const results = [];
      const cmd1 = {
        execute: () => results.push('exec1'),
        undo: () => results.push('undo1')
      };
      const cmd2 = {
        execute: () => results.push('exec2'),
        undo: () => results.push('undo2')
      };
      stack.push(cmd1);
      stack.push(cmd2);
      stack.undo(); // undo cmd2
      stack.undo(); // undo cmd1
      stack.redo(); // redo cmd1
      expect(results).toEqual(['undo2', 'undo1', 'exec1']);
    });
  });
});

describe('TransformCommand', () => {
  let editor, def, obj;

  beforeEach(() => {
    editor = { refreshInspector: vi.fn() };
    def = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    obj = new THREE.Object3D();
  });

  it('execute applies new state to def and obj', () => {
    const oldState = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    const newState = { position: [5, 10, 15], rotation: [90, 0, 0], scale: [2, 2, 2] };
    const cmd = new TransformCommand(editor, def, obj, oldState, newState);

    cmd.execute();
    expect(def.position).toEqual([5, 10, 15]);
    expect(obj.position.x).toBe(5);
    expect(obj.position.y).toBe(10);
    expect(obj.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(editor.refreshInspector).toHaveBeenCalled();
  });

  it('undo restores old state', () => {
    const oldState = { position: [1, 2, 3], rotation: [0, 45, 0], scale: [1, 1, 1] };
    const newState = { position: [5, 10, 15], rotation: [90, 0, 0], scale: 2 };
    const cmd = new TransformCommand(editor, def, obj, oldState, newState);

    cmd.execute();
    cmd.undo();
    expect(def.position).toEqual([1, 2, 3]);
    expect(obj.position.x).toBe(1);
    expect(def.rotation).toEqual([0, 45, 0]);
  });

  it('handles scalar scale', () => {
    const cmd = new TransformCommand(editor, def, obj,
      { position: [0, 0, 0], scale: 1 },
      { position: [0, 0, 0], scale: 3 }
    );
    cmd.execute();
    expect(def.scale).toBe(3);
    expect(obj.scale.x).toBe(3);
    expect(obj.scale.y).toBe(3);
    expect(obj.scale.z).toBe(3);
  });

  it('handles null obj gracefully', () => {
    const cmd = new TransformCommand(editor, def, null,
      { position: [0, 0, 0] },
      { position: [1, 2, 3] }
    );
    expect(() => cmd.execute()).not.toThrow();
    expect(def.position).toEqual([1, 2, 3]);
  });
});

describe('PropertyCommand', () => {
  let editor;

  beforeEach(() => {
    editor = { refreshInspector: vi.fn() };
  });

  it('sets a simple property', () => {
    const def = { color: 'red' };
    const cmd = new PropertyCommand(editor, def, 'color', 'red', 'blue');
    cmd.execute();
    expect(def.color).toBe('blue');
    expect(editor.refreshInspector).toHaveBeenCalled();
  });

  it('undoes a simple property change', () => {
    const def = { color: 'red' };
    const cmd = new PropertyCommand(editor, def, 'color', 'red', 'blue');
    cmd.execute();
    cmd.undo();
    expect(def.color).toBe('red');
  });

  it('handles nested paths', () => {
    const def = { material: { color: '#fff' } };
    const cmd = new PropertyCommand(editor, def, 'material.color', '#fff', '#ff0000');
    cmd.execute();
    expect(def.material.color).toBe('#ff0000');
  });

  it('creates intermediate objects for nested paths', () => {
    const def = {};
    const cmd = new PropertyCommand(editor, def, 'material.color', null, '#ff0000');
    cmd.execute();
    expect(def.material.color).toBe('#ff0000');
  });

  it('deletes property when value is null', () => {
    const def = { name: 'test' };
    const cmd = new PropertyCommand(editor, def, 'name', 'test', null);
    cmd.execute();
    expect(def).not.toHaveProperty('name');
  });

  it('deep-copies values to prevent mutation', () => {
    const def = { items: [1, 2, 3] };
    const original = [1, 2, 3];
    const newVal = [4, 5, 6];
    const cmd = new PropertyCommand(editor, def, 'items', original, newVal);

    // Mutate the original array after creating command
    original.push(99);
    newVal.push(99);

    cmd.execute();
    expect(def.items).toEqual([4, 5, 6]); // Not [4, 5, 6, 99]
    cmd.undo();
    expect(def.items).toEqual([1, 2, 3]); // Not [1, 2, 3, 99]
  });

  it('calls rebuildFn when provided', () => {
    const rebuild = vi.fn();
    const def = { x: 1 };
    const cmd = new PropertyCommand(editor, def, 'x', 1, 2, rebuild);
    cmd.execute();
    expect(rebuild).toHaveBeenCalledOnce();
    cmd.undo();
    expect(rebuild).toHaveBeenCalledTimes(2);
  });
});
