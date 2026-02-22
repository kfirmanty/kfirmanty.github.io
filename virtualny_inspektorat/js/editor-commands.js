// ─────────────────────────────────────────────
//  UNDO/REDO COMMAND SYSTEM
//  Extracted from editor.js for testability
// ─────────────────────────────────────────────

export class UndoStack {
  constructor(editor) {
    this.editor = editor;
    this.undoStack = [];
    this.redoStack = [];
    this.maxSize = 50;
  }

  push(command) {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) this.undoStack.shift();
    this.redoStack = []; // Clear redo on new action
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Command: Transform change (position/rotation/scale)
export class TransformCommand {
  constructor(editor, def, obj, oldState, newState) {
    this.editor = editor;
    this.def = def;
    this.obj = obj;
    this.oldState = oldState;
    this.newState = newState;
  }
  execute() {
    this._applyState(this.newState);
  }
  undo() {
    this._applyState(this.oldState);
  }
  _applyState(state) {
    this.def.position = state.position.slice();
    this.def.rotation = state.rotation?.slice();
    this.def.scale = Array.isArray(state.scale) ? state.scale.slice() : state.scale;
    if (this.obj) {
      this.obj.position.set(...this.def.position);
      if (this.def.rotation) {
        this.obj.rotation.set(
          this.def.rotation[0] * Math.PI / 180,
          this.def.rotation[1] * Math.PI / 180,
          this.def.rotation[2] * Math.PI / 180
        );
      }
      if (this.def.scale != null) {
        if (typeof this.def.scale === 'number') this.obj.scale.setScalar(this.def.scale);
        else this.obj.scale.set(...this.def.scale);
      }
    }
    this.editor.refreshInspector();
  }
}

// Command: Add object
export class AddObjectCommand {
  constructor(editor, def) {
    this.editor = editor;
    this.def = def;
  }
  execute() {
    this.editor.objectDefs.push(this.def);
    this.editor.sceneData.objects = this.editor.objectDefs;
    this.editor.buildAndAddObject(this.def);
    this.editor.refreshHierarchy();
    this.editor.updateStatusBar();
  }
  undo() {
    const obj = this.editor.threeObjects.get(this.def);
    if (obj) {
      this.editor.sceneRoot.remove(obj);
      this.editor.disposeObject(obj);
      this.editor.defsByObject.delete(obj);
    }
    this.editor.threeObjects.delete(this.def);
    const idx = this.editor.objectDefs.indexOf(this.def);
    if (idx !== -1) this.editor.objectDefs.splice(idx, 1);
    this.editor.sceneData.objects = this.editor.objectDefs;
    if (this.editor.selected === this.def) this.editor.deselect();
    this.editor.refreshHierarchy();
    this.editor.updateStatusBar();
  }
}

// Command: Delete object
export class DeleteObjectCommand {
  constructor(editor, def, index) {
    this.editor = editor;
    this.def = def;
    this.index = index;
  }
  execute() {
    const obj = this.editor.threeObjects.get(this.def);
    if (this.editor.selected === this.def || this.editor.selectionSet.has(this.def)) {
      this.editor.deselect();
    }
    if (obj) {
      this.editor.sceneRoot.remove(obj);
      this.editor.disposeObject(obj);
      this.editor.defsByObject.delete(obj);
    }
    this.editor.threeObjects.delete(this.def);
    const idx = this.editor.objectDefs.indexOf(this.def);
    if (idx !== -1) this.editor.objectDefs.splice(idx, 1);
    this.editor.sceneData.objects = this.editor.objectDefs;
    this.editor.refreshHierarchy();
    this.editor.updateStatusBar();
  }
  undo() {
    this.editor.objectDefs.splice(this.index, 0, this.def);
    this.editor.sceneData.objects = this.editor.objectDefs;
    this.editor.buildAndAddObject(this.def);
    this.editor.refreshHierarchy();
    this.editor.updateStatusBar();
  }
}

// Command: Property change
export class PropertyCommand {
  constructor(editor, def, path, oldValue, newValue, rebuildFn) {
    this.editor = editor;
    this.def = def;
    this.path = path;
    this.oldValue = JSON.parse(JSON.stringify(oldValue ?? null));
    this.newValue = JSON.parse(JSON.stringify(newValue ?? null));
    this.rebuildFn = rebuildFn;
  }
  execute() {
    this._setValue(this.newValue);
    if (this.rebuildFn) this.rebuildFn();
    this.editor.refreshInspector();
  }
  undo() {
    this._setValue(this.oldValue);
    if (this.rebuildFn) this.rebuildFn();
    this.editor.refreshInspector();
  }
  _setValue(val) {
    const parts = this.path.split('.');
    let target = this.def;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (val === null || val === undefined) {
      delete target[key];
    } else {
      target[key] = val;
    }
  }
}
