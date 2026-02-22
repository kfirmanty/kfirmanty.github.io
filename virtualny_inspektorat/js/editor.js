// ═══════════════════════════════════════════════════════════════
//  V A P O R   T E M P L E   —   Scene Editor
//  WYSIWYG editor for JSON scene files
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { GeometryBuilders, COMPOUND_TYPES } from './shared/geometry.js';
import { TEXTURE_REGISTRY, TEXTURE_OPTIONS, loadTexture } from './shared/textures.js';
import { createMaterial } from './shared/materials.js';
import { DEFAULT_PARAMS, DEFAULT_MATERIAL, PARAM_SCHEMA } from './editor-schema.js';
import { round3, escHtml } from './editor-utils.js';

// ─────────────────────────────────────────────
//  UNDO/REDO COMMAND SYSTEM
// ─────────────────────────────────────────────

class UndoStack {
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
class TransformCommand {
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
class AddObjectCommand {
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
class DeleteObjectCommand {
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
class PropertyCommand {
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

// ─────────────────────────────────────────────
//  SCENE EDITOR ENGINE
// ─────────────────────────────────────────────

class SceneEditor {
  constructor() {
    this.sceneData = null;        // The raw JSON data being edited
    this.objectDefs = [];         // Array of object definition objects
    this.threeObjects = new Map();// Map<def, THREE.Object3D>
    this.defsByObject = new Map();// Map<THREE.Object3D, def> (reverse)
    this.selected = null;         // Currently selected def (primary)
    this.selectedObject = null;   // Currently selected THREE object
    this.selectionSet = new Set();// Multi-select: set of selected defs
    this.selectedLightIndex = -1; // Currently selected light index (-1 = none)
    this.snap = 0.5;
    this.gridVisible = true;
    this.animating = true;
    this.collisionPreview = false;
    this.useSceneLights = false;
    this._collisionHelpers = [];
    this._transformStartState = null; // For undo on transform

    this.undoStack = new UndoStack(this);

    this.init();
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupControls();
    this.setupUI();
    this.animate();
  }

  // ─────────────── RENDERER ───────────────

  setupRenderer() {
    const container = document.getElementById('viewport');
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    this.camera.position.set(15, 12, 20);
    this.camera.lookAt(0, 2, 0);

    window.addEventListener('resize', () => {
      const w = container.clientWidth, h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // ─────────────── BASE SCENE ───────────────

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Helpers
    this.gridHelper = new THREE.GridHelper(100, 100, 0x2a2a44, 0x1a1a30);
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(3);
    this.scene.add(this.axesHelper);

    // Default lights for editor view
    this.editorAmbient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.editorAmbient);
    this.editorDirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    this.editorDirLight.position.set(10, 20, 10);
    this.scene.add(this.editorDirLight);

    // Container for loaded scene objects
    this.sceneRoot = new THREE.Group();
    this.sceneRoot.name = 'sceneRoot';
    this.scene.add(this.sceneRoot);

    // Container for scene lights
    this.sceneLightsGroup = new THREE.Group();
    this.sceneLightsGroup.name = 'sceneLights';
    this.scene.add(this.sceneLightsGroup);

    // Container for collision helpers
    this.collisionHelpersGroup = new THREE.Group();
    this.collisionHelpersGroup.name = 'collisionHelpers';
    this.collisionHelpersGroup.visible = false;
    this.scene.add(this.collisionHelpersGroup);
  }

  // ─────────────── CONTROLS ───────────────

  setupControls() {
    const container = document.getElementById('viewport');

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.target.set(0, 2, 0);

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.setSpace('world');
    this.transformControls.setTranslationSnap(this.snap);
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.orbitControls.enabled = !e.value;
      if (e.value) {
        // Starting drag — save state for undo
        this._captureTransformStart();
      } else {
        // Ended drag — create undo command
        this._commitTransform();
      }
    });
    this.transformControls.addEventListener('objectChange', () => {
      if (this.selected && this.selectedObject) {
        this.syncObjectToData(this.selected, this.selectedObject);
        this.refreshInspector();
      }
    });
    this.scene.add(this.transformControls);

    // Raycaster for selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // Don't select when dragging gizmo
      if (this.transformControls.dragging) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this._pointerDownPos = { x: e.clientX, y: e.clientY };
      this._pointerShift = e.shiftKey; // Track shift for multi-select
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !this._pointerDownPos) return;
      const dx = e.clientX - this._pointerDownPos.x;
      const dy = e.clientY - this._pointerDownPos.y;
      // Only select on click (not drag)
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        this.pickObject(this._pointerShift);
      }
      this._pointerDownPos = null;
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      switch (e.code) {
        case 'KeyW': this.setTransformMode('translate'); break;
        case 'KeyE': this.setTransformMode('rotate'); break;
        case 'KeyR': this.setTransformMode('scale'); break;
        case 'KeyG': this.toggleGrid(); break;
        case 'KeyF': this.focusSelected(); break;
        case 'KeyC': this.toggleCollisionPreview(); break;
        case 'Delete': case 'Backspace': this.deleteSelected(); break;
        case 'KeyD':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.duplicateSelected(); }
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) this.undoStack.redo();
            else this.undoStack.undo();
          }
          break;
        case 'KeyY':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.undoStack.redo(); }
          break;
        case 'Escape': this.deselect(); break;
      }
    });
  }

  // ─────────────── TRANSFORM UNDO HELPERS ───────────────

  _captureTransformStart() {
    if (!this.selected) return;
    const def = this.selected;
    this._transformStartState = {
      position: def.position ? def.position.slice() : [0, 0, 0],
      rotation: def.rotation ? def.rotation.slice() : undefined,
      scale: Array.isArray(def.scale) ? def.scale.slice() : def.scale
    };
  }

  _commitTransform() {
    if (!this.selected || !this._transformStartState) return;
    const def = this.selected;
    const obj = this.threeObjects.get(def);
    const newState = {
      position: def.position ? def.position.slice() : [0, 0, 0],
      rotation: def.rotation ? def.rotation.slice() : undefined,
      scale: Array.isArray(def.scale) ? def.scale.slice() : def.scale
    };
    const cmd = new TransformCommand(this, def, obj, this._transformStartState, newState);
    this.undoStack.push(cmd);
    this._transformStartState = null;
  }

  // ─────────────── UI BINDING ───────────────

  setupUI() {
    // Toolbar buttons
    document.getElementById('btn-load').addEventListener('click', () => this.loadFile());
    document.getElementById('btn-save').addEventListener('click', () => this.exportScene());
    document.getElementById('btn-new').addEventListener('click', () => this.newScene());
    document.getElementById('btn-translate').addEventListener('click', () => this.setTransformMode('translate'));
    document.getElementById('btn-rotate').addEventListener('click', () => this.setTransformMode('rotate'));
    document.getElementById('btn-scale').addEventListener('click', () => this.setTransformMode('scale'));
    document.getElementById('btn-duplicate').addEventListener('click', () => this.duplicateSelected());
    document.getElementById('btn-delete').addEventListener('click', () => this.deleteSelected());
    document.getElementById('btn-play').addEventListener('click', () => this.playScene());
    document.getElementById('btn-snap-toggle').addEventListener('click', () => this.cycleSnap());
    document.getElementById('btn-collision').addEventListener('click', () => this.toggleCollisionPreview());
    document.getElementById('btn-scene-lights').addEventListener('click', () => this.toggleSceneLights());

    // File input
    document.getElementById('file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          this.loadSceneData(data);
        } catch (err) {
          alert('Failed to parse JSON: ' + err.message);
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    // Add object dropdown
    const addBtn = document.getElementById('btn-add-obj');
    const dropdown = document.getElementById('add-dropdown');
    addBtn.addEventListener('click', (e) => {
      const rect = addBtn.getBoundingClientRect();
      dropdown.style.top = rect.bottom + 4 + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.classList.toggle('open');
      e.stopPropagation();
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    dropdown.querySelectorAll('.dropdown-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addObject(btn.dataset.type);
        dropdown.classList.remove('open');
      });
    });

    // Dialogue modal buttons
    document.getElementById('dlg-cancel').addEventListener('click', () => {
      document.getElementById('dialogue-modal').classList.remove('active');
    });
    document.getElementById('dlg-save').addEventListener('click', () => this.saveDialogueFromModal());
    document.getElementById('dlg-add-node').addEventListener('click', () => this.addDialogueNode());
  }

  // ─────────────── SCENE LOADING ───────────────

  loadFile() {
    document.getElementById('file-input').click();
  }

  newScene() {
    const data = {
      id: 'new_scene',
      title: 'New Scene',
      sky: { type: 'gradient', stops: [[0, '#0a0e2a'], [1, '#2a8aaa']] },
      fog: { color: '#1a4a6a', near: 25, far: 75 },
      ambient: { color: '#ffffff', intensity: 0.4 },
      lights: [
        { type: 'directional', color: '#ffffff', intensity: 1.0, position: [10, 20, 5] }
      ],
      spawn: { position: [0, 1.6, 5], rotation: [0, 180, 0] },
      objects: []
    };
    this.loadSceneData(data);
  }

  loadSceneData(data) {
    this.sceneData = JSON.parse(JSON.stringify(data)); // Deep clone
    this.deselect();
    this.clearScene();
    this.undoStack.clear();
    this.objectDefs = this.sceneData.objects || [];

    // Apply sky
    this.applySceneSky(this.sceneData.sky);

    // Apply fog
    if (this.sceneData.fog) {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(this.sceneData.fog.color),
        this.sceneData.fog.near || 10,
        this.sceneData.fog.far || 60
      );
    } else {
      this.scene.fog = null;
    }

    // Scene lights
    this.sceneLightsGroup.clear();
    if (this.sceneData.ambient) {
      const a = new THREE.AmbientLight(
        new THREE.Color(this.sceneData.ambient.color || '#ffffff'),
        this.sceneData.ambient.intensity ?? 0.4
      );
      this.sceneLightsGroup.add(a);
    }
    if (this.sceneData.lights) {
      for (const lDef of this.sceneData.lights) {
        const light = this.buildLight(lDef);
        if (light) this.sceneLightsGroup.add(light);
      }
    }

    // Water
    if (this.sceneData.water) {
      const w = this.sceneData.water.width || 200, h = this.sceneData.water.height || 200;
      const geom = new THREE.PlaneGeometry(w, h, 1, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.sceneData.water.color || '#2244aa'),
        metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7, side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = this.sceneData.water.level ?? -2;
      mesh.name = '__water__';
      this.sceneRoot.add(mesh);
    }

    // Build objects
    for (const def of this.objectDefs) {
      this.buildAndAddObject(def);
    }

    // Spawn helper
    this.updateSpawnHelper();

    // Collision preview
    this.rebuildCollisionHelpers();

    this.refreshHierarchy();
    this.refreshSceneProps();
    this.updateStatusBar();
    document.getElementById('viewport-info').textContent = `Scene: ${data.id || 'untitled'}`;
  }

  applySceneSky(sky) {
    if (!sky) { this.scene.background = new THREE.Color(0x1a1a2e); return; }
    if (sky.type === 'gradient' && sky.stops) {
      const canvas = document.createElement('canvas');
      canvas.width = 2; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      for (const [stop, color] of sky.stops) grad.addColorStop(stop, color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 2, 256);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      this.scene.background = tex;
    } else if (sky.color) {
      this.scene.background = new THREE.Color(sky.color);
    }
  }

  buildLight(def) {
    let light;
    if (def.type === 'directional') {
      light = new THREE.DirectionalLight(new THREE.Color(def.color || '#ffffff'), def.intensity ?? 1);
      if (def.position) light.position.set(...def.position);
    } else if (def.type === 'point') {
      light = new THREE.PointLight(new THREE.Color(def.color || '#ffffff'), def.intensity ?? 1, def.distance || 20, def.decay ?? 2);
      if (def.position) light.position.set(...def.position);
    } else if (def.type === 'hemisphere') {
      light = new THREE.HemisphereLight(
        new THREE.Color(def.skyColor || '#ffffff'),
        new THREE.Color(def.groundColor || '#444444'),
        def.intensity ?? 0.6
      );
    }
    return light;
  }

  clearScene() {
    // Remove all scene objects
    while (this.sceneRoot.children.length > 0) {
      const child = this.sceneRoot.children[0];
      this.sceneRoot.remove(child);
      this.disposeObject(child);
    }
    this.threeObjects.clear();
    this.defsByObject.clear();
    this.sceneLightsGroup.clear();
    this.clearCollisionHelpers();

    // Remove spawn helper if exists
    if (this._spawnHelper) {
      this.scene.remove(this._spawnHelper);
      this._spawnHelper = null;
    }
  }

  disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  // ─────────────── OBJECT BUILD ───────────────

  buildAndAddObject(def) {
    const obj = this.buildObject(def);
    if (!obj) return;
    this.sceneRoot.add(obj);
    this.threeObjects.set(def, obj);
    this.defsByObject.set(obj, def);
    return obj;
  }

  buildObject(def) {
    const mat = createMaterial(def.material);
    let object;

    if (COMPOUND_TYPES.includes(def.type)) {
      const params = { ...def.params, _material: mat };
      if (def.type === 'head' && def.params?.eyeMaterial) {
        params._eyeMaterial = createMaterial(def.params.eyeMaterial);
      }
      object = GeometryBuilders[def.type](params);
    } else if (def.type === 'group') {
      object = new THREE.Group();
      if (def.children) {
        for (const childDef of def.children) {
          const childObj = this.buildObject(childDef);
          if (childObj) object.add(childObj);
        }
      }
    } else if (GeometryBuilders[def.type]) {
      const geom = GeometryBuilders[def.type](def.params || {});
      object = new THREE.Mesh(geom, mat);
    } else {
      return null;
    }

    if (def.position) object.position.set(...def.position);
    if (def.rotation) {
      object.rotation.set(
        (def.rotation[0] || 0) * Math.PI / 180,
        (def.rotation[1] || 0) * Math.PI / 180,
        (def.rotation[2] || 0) * Math.PI / 180
      );
    }
    if (def.scale) {
      if (typeof def.scale === 'number') object.scale.setScalar(def.scale);
      else object.scale.set(...def.scale);
    }

    object.name = def.id || def.type;
    object.userData.editorDef = def;
    return object;
  }

  rebuildObject(def) {
    const oldObj = this.threeObjects.get(def);
    if (oldObj) {
      // Detach gizmo if attached to this
      if (this.selectedObject === oldObj) {
        this.transformControls.detach();
      }
      this.sceneRoot.remove(oldObj);
      this.defsByObject.delete(oldObj);
      this.disposeObject(oldObj);
    }

    const newObj = this.buildObject(def);
    if (!newObj) return;
    this.sceneRoot.add(newObj);
    this.threeObjects.set(def, newObj);
    this.defsByObject.set(newObj, def);

    if (this.selected === def) {
      this.selectedObject = newObj;
      this.transformControls.attach(newObj);
    }

    this.rebuildCollisionHelpers();
    return newObj;
  }

  // ─────────────── SYNC OBJECT → DATA ───────────────

  syncObjectToData(def, obj) {
    const p = obj.position;
    def.position = [round3(p.x), round3(p.y), round3(p.z)];

    const r = obj.rotation;
    const rx = round3(r.x * 180 / Math.PI);
    const ry = round3(r.y * 180 / Math.PI);
    const rz = round3(r.z * 180 / Math.PI);
    if (rx !== 0 || ry !== 0 || rz !== 0) {
      def.rotation = [rx, ry, rz];
    } else {
      delete def.rotation;
    }

    const s = obj.scale;
    if (s.x !== 1 || s.y !== 1 || s.z !== 1) {
      if (s.x === s.y && s.y === s.z) def.scale = round3(s.x);
      else def.scale = [round3(s.x), round3(s.y), round3(s.z)];
    } else {
      delete def.scale;
    }
  }

  // ─────────────── SPAWN HELPER ───────────────

  updateSpawnHelper() {
    if (this._spawnHelper) {
      this.scene.remove(this._spawnHelper);
    }
    const spawn = this.sceneData?.spawn;
    if (!spawn) return;

    const group = new THREE.Group();
    // Capsule-like shape for player
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
      new THREE.MeshBasicMaterial({ color: 0x01cdfe, wireframe: true, transparent: true, opacity: 0.5 })
    );
    body.position.y = 0.6;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x01cdfe, wireframe: true, transparent: true, opacity: 0.5 })
    );
    head.position.y = 1.4;
    group.add(head);
    // Forward arrow
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0),
      1.5, 0x01cdfe, 0.3, 0.15
    );
    if (spawn.rotation) {
      const yaw = (spawn.rotation[1] || 0) * Math.PI / 180;
      arrow.setDirection(new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)));
    }
    group.add(arrow);

    group.position.set(
      spawn.position[0],
      spawn.position[1] - 1.6,  // Spawn Y is eye height
      spawn.position[2]
    );
    group.name = '__spawn__';
    this.scene.add(group);
    this._spawnHelper = group;
  }

  // ─────────────── COLLISION PREVIEW ───────────────

  toggleCollisionPreview() {
    this.collisionPreview = !this.collisionPreview;
    this.collisionHelpersGroup.visible = this.collisionPreview;
    document.getElementById('btn-collision').classList.toggle('active', this.collisionPreview);
  }

  clearCollisionHelpers() {
    while (this.collisionHelpersGroup.children.length > 0) {
      const child = this.collisionHelpersGroup.children[0];
      this.collisionHelpersGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  rebuildCollisionHelpers() {
    this.clearCollisionHelpers();
    for (const def of this.objectDefs) {
      if (!def.collision) continue;
      const obj = this.threeObjects.get(def);
      if (!obj) continue;

      const isTrigger = def.collisionOptions?.trigger;
      const isWalkable = def.collisionOptions?.walkable;
      const color = isTrigger ? 0xfffb96 : (isWalkable ? 0x05d9a6 : 0xff4466);

      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshBasicMaterial({
        color, wireframe: true, transparent: true, opacity: 0.6
      });
      const helper = new THREE.Mesh(geom, mat);
      helper.position.copy(center);
      this.collisionHelpersGroup.add(helper);
    }
  }

  // ─────────────── SCENE LIGHTING TOGGLE ───────────────

  toggleSceneLights() {
    this.useSceneLights = !this.useSceneLights;
    this.editorAmbient.visible = !this.useSceneLights;
    this.editorDirLight.visible = !this.useSceneLights;
    this.sceneLightsGroup.visible = true; // Scene lights always on (they contribute)
    document.getElementById('btn-scene-lights').classList.toggle('active', this.useSceneLights);
  }

  // ─────────────── SELECTION ───────────────

  pickObject(shiftKey) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Gather all meshes from scene objects
    const targets = [];
    for (const [def, obj] of this.threeObjects) {
      obj.traverse((child) => {
        if (child.isMesh) targets.push(child);
      });
    }

    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) {
      if (!shiftKey) this.deselect();
      return;
    }

    // Find which def owns this mesh
    let hitObj = hits[0].object;
    let def = null;
    while (hitObj) {
      def = this.defsByObject.get(hitObj);
      if (def) break;
      hitObj = hitObj.parent;
    }

    if (def) {
      if (shiftKey) {
        // Multi-select toggle
        if (this.selectionSet.has(def)) {
          this.selectionSet.delete(def);
          if (this.selected === def) {
            // Pick another from the set or deselect
            const remaining = [...this.selectionSet];
            if (remaining.length > 0) {
              this.selected = remaining[0];
              this.selectedObject = this.threeObjects.get(remaining[0]);
              this.transformControls.attach(this.selectedObject);
            } else {
              this.deselect();
              return;
            }
          }
        } else {
          this.selectionSet.add(def);
          if (!this.selected) {
            this.selected = def;
            this.selectedObject = this.threeObjects.get(def);
            this.transformControls.attach(this.selectedObject);
          }
        }
        this.refreshHierarchy();
        this.refreshInspector();
      } else {
        this.selectDef(def);
      }
    } else if (!shiftKey) {
      this.deselect();
    }
  }

  selectDef(def) {
    this.selected = def;
    this.selectedObject = this.threeObjects.get(def);
    this.selectionSet.clear();
    this.selectionSet.add(def);
    if (this.selectedObject) {
      this.transformControls.attach(this.selectedObject);
    }
    this.refreshHierarchy();
    this.refreshInspector();
  }

  deselect() {
    this.selected = null;
    this.selectedObject = null;
    this.selectedLightIndex = -1;
    this.selectionSet.clear();
    this.transformControls.detach();
    this.refreshHierarchy();
    this.refreshInspector();
  }

  focusSelected() {
    if (!this.selectedObject) return;
    const box = new THREE.Box3().setFromObject(this.selectedObject);
    const center = box.getCenter(new THREE.Vector3());
    this.orbitControls.target.copy(center);
  }

  // ─────────────── ADD / DELETE / DUPLICATE ───────────────

  addObject(type) {
    if (!this.sceneData) this.newScene();

    if (type === 'point_light') {
      this.sceneData.lights = this.sceneData.lights || [];
      this.sceneData.lights.push({
        type: 'point', color: '#ffffff', intensity: 1.0, distance: 20, position: [0, 4, 0]
      });
      this.rebuildSceneLights();
      this.refreshSceneProps();
      this.refreshHierarchy();
      return;
    }

    const id = type + '_' + Date.now().toString(36);
    const def = {
      id,
      type,
      params: { ...(DEFAULT_PARAMS[type] || {}) },
      position: [0, 1, 0],
      material: { ...DEFAULT_MATERIAL },
      collision: false
    };

    // Use undo-able command
    const cmd = new AddObjectCommand(this, def);
    cmd.execute();
    this.undoStack.push(cmd);
    this.selectDef(def);
  }

  deleteSelected() {
    if (!this.selected) return;

    // Delete all selected objects
    const toDelete = [...this.selectionSet];
    if (toDelete.length === 0 && this.selected) toDelete.push(this.selected);

    this.deselect();

    for (const def of toDelete) {
      const idx = this.objectDefs.indexOf(def);
      const cmd = new DeleteObjectCommand(this, def, idx);
      cmd.execute();
      this.undoStack.push(cmd);
    }
  }

  duplicateSelected() {
    if (!this.selected) return;

    const toClone = [...this.selectionSet];
    if (toClone.length === 0) toClone.push(this.selected);

    let lastDef = null;
    for (const srcDef of toClone) {
      const clone = JSON.parse(JSON.stringify(srcDef));
      clone.id = (clone.id || clone.type) + '_' + Date.now().toString(36);
      if (clone.position) clone.position[0] += 2;

      const cmd = new AddObjectCommand(this, clone);
      cmd.execute();
      this.undoStack.push(cmd);
      lastDef = clone;
    }

    if (lastDef) this.selectDef(lastDef);
  }

  rebuildSceneLights() {
    this.sceneLightsGroup.clear();
    if (this.sceneData.ambient) {
      this.sceneLightsGroup.add(new THREE.AmbientLight(
        new THREE.Color(this.sceneData.ambient.color || '#fff'),
        this.sceneData.ambient.intensity ?? 0.4
      ));
    }
    if (this.sceneData.lights) {
      for (const lDef of this.sceneData.lights) {
        const l = this.buildLight(lDef);
        if (l) this.sceneLightsGroup.add(l);
      }
    }
  }

  // ─────────────── TRANSFORM MODE ───────────────

  setTransformMode(mode) {
    this.transformControls.setMode(mode);
    document.getElementById('btn-translate').classList.toggle('active', mode === 'translate');
    document.getElementById('btn-rotate').classList.toggle('active', mode === 'rotate');
    document.getElementById('btn-scale').classList.toggle('active', mode === 'scale');

    if (mode === 'translate') this.transformControls.setTranslationSnap(this.snap);
    else if (mode === 'rotate') this.transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
    else this.transformControls.setTranslationSnap(null);
  }

  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    this.gridHelper.visible = this.gridVisible;
    this.axesHelper.visible = this.gridVisible;
  }

  cycleSnap() {
    const snaps = [0, 0.25, 0.5, 1, 2];
    const idx = snaps.indexOf(this.snap);
    this.snap = snaps[(idx + 1) % snaps.length];
    this.transformControls.setTranslationSnap(this.snap || null);
    document.getElementById('btn-snap-toggle').textContent = this.snap ? `Snap: ${this.snap}` : 'Snap: Off';
  }

  // ─────────────── HIERARCHY PANEL ───────────────

  refreshHierarchy() {
    const list = document.getElementById('hierarchy-list');
    list.innerHTML = '';

    // Scene lights
    const lights = this.sceneData?.lights || [];
    for (let i = 0; i < lights.length; i++) {
      const lDef = lights[i];
      const item = document.createElement('div');
      item.className = 'hier-item';
      item.innerHTML = `
        <span class="type-badge" style="background:#fffb96;color:#0a0a14">${lDef.type}</span>
        <span>light_${i}</span>
      `;
      item.addEventListener('click', () => {
        this.deselect();
        this.selectedLightIndex = i;
        this.refreshHierarchy();
        this.refreshLightInspector(i);
      });
      if (this.selectedLightIndex === i && this.selected === null) {
        item.classList.add('selected');
      }
      list.appendChild(item);
    }

    // Scene objects
    for (const def of this.objectDefs) {
      const isSelected = this.selectionSet.has(def);
      const item = document.createElement('div');
      item.className = 'hier-item' + (isSelected ? ' selected' : '');
      item.innerHTML = `
        <span class="type-badge">${def.type}</span>
        <span>${def.id || 'unnamed'}</span>
      `;
      item.addEventListener('click', (e) => {
        this.selectedLightIndex = -1;
        if (e.shiftKey) {
          // Multi-select
          if (this.selectionSet.has(def)) {
            this.selectionSet.delete(def);
            if (this.selected === def) {
              const remaining = [...this.selectionSet];
              if (remaining.length > 0) {
                this.selected = remaining[0];
                this.selectedObject = this.threeObjects.get(remaining[0]);
                this.transformControls.attach(this.selectedObject);
              } else {
                this.deselect();
              }
            }
            this.refreshHierarchy();
            this.refreshInspector();
          } else {
            this.selectionSet.add(def);
            if (!this.selected) {
              this.selected = def;
              this.selectedObject = this.threeObjects.get(def);
              this.transformControls.attach(this.selectedObject);
            }
            this.refreshHierarchy();
            this.refreshInspector();
          }
        } else {
          this.selectDef(def);
        }
      });
      item.addEventListener('dblclick', () => {
        this.selectedLightIndex = -1;
        this.selectDef(def);
        this.focusSelected();
      });
      list.appendChild(item);
    }
  }

  refreshLightInspector(index) {
    const empty = document.getElementById('inspector-empty');
    const panels = document.getElementById('inspector-panels');
    empty.style.display = 'none';
    panels.style.display = 'block';
    panels.innerHTML = '';

    const lDef = this.sceneData.lights[index];
    if (!lDef) return;

    const section = this.makeSection('Point Light');
    section.body.appendChild(this.makeRow('Color', this.makeColorInput(lDef.color || '#ffffff', (v) => {
      lDef.color = v;
      this.rebuildSceneLights();
    })));
    section.body.appendChild(this.makeRow('Intensity', this.makeNumberInput(lDef.intensity ?? 1, 0.1, (v) => {
      lDef.intensity = v;
      this.rebuildSceneLights();
    })));
    section.body.appendChild(this.makeRow('Distance', this.makeNumberInput(lDef.distance ?? 20, 1, (v) => {
      lDef.distance = v;
      this.rebuildSceneLights();
    })));
    section.body.appendChild(this.makeRow('Position', this.makeVec3Input(lDef.position || [0, 4, 0], (v) => {
      lDef.position = v;
      this.rebuildSceneLights();
    })));

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn';
    delBtn.style.cssText = 'border-color:var(--danger);color:var(--danger);margin-top:8px;width:100%';
    delBtn.textContent = 'Delete Light';
    delBtn.addEventListener('click', () => {
      this.sceneData.lights.splice(index, 1);
      this.selectedLightIndex = -1;
      this.rebuildSceneLights();
      this.refreshHierarchy();
      this.refreshInspector();
    });
    section.body.appendChild(delBtn);

    panels.appendChild(section.el);
  }

  // ─────────────── SCENE PROPS PANEL ───────────────

  refreshSceneProps() {
    if (!this.sceneData) return;
    const container = document.getElementById('scene-props');
    container.innerHTML = '';

    const d = this.sceneData;

    // ID & Title
    container.appendChild(this.makeRow('ID', this.makeTextInput(d.id || '', (v) => { d.id = v; })));
    container.appendChild(this.makeRow('Title', this.makeTextInput(d.title || '', (v) => { d.title = v; })));

    // Spawn
    container.appendChild(this.makeSectionLabel('Spawn Point'));
    const sp = d.spawn || { position: [0, 1.6, 0], rotation: [0, 0, 0] };
    container.appendChild(this.makeRow('Position', this.makeVec3Input(sp.position, (v) => {
      d.spawn = d.spawn || {};
      d.spawn.position = v;
      this.updateSpawnHelper();
    })));
    container.appendChild(this.makeRow('Rotation', this.makeVec3Input(sp.rotation || [0, 0, 0], (v) => {
      d.spawn = d.spawn || {};
      d.spawn.rotation = v;
      this.updateSpawnHelper();
    })));

    // Fog
    container.appendChild(this.makeSectionLabel('Fog'));
    const fog = d.fog || {};
    container.appendChild(this.makeRow('Color', this.makeColorInput(fog.color || '#1a4a6a', (v) => {
      d.fog = d.fog || {};
      d.fog.color = v;
      if (this.scene.fog) this.scene.fog.color.set(v);
    })));
    container.appendChild(this.makeRow('Near', this.makeNumberInput(fog.near ?? 25, 0.1, (v) => {
      d.fog = d.fog || {};
      d.fog.near = v;
      if (this.scene.fog) this.scene.fog.near = v;
    })));
    container.appendChild(this.makeRow('Far', this.makeNumberInput(fog.far ?? 75, 1, (v) => {
      d.fog = d.fog || {};
      d.fog.far = v;
      if (this.scene.fog) this.scene.fog.far = v;
    })));

    // Ambient
    container.appendChild(this.makeSectionLabel('Ambient Light'));
    const amb = d.ambient || {};
    container.appendChild(this.makeRow('Color', this.makeColorInput(amb.color || '#ffffff', (v) => {
      d.ambient = d.ambient || {};
      d.ambient.color = v;
      this.rebuildSceneLights();
    })));
    container.appendChild(this.makeRow('Intensity', this.makeNumberInput(amb.intensity ?? 0.4, 0.05, (v) => {
      d.ambient = d.ambient || {};
      d.ambient.intensity = v;
      this.rebuildSceneLights();
    })));

    // Water
    container.appendChild(this.makeSectionLabel('Water'));
    const water = d.water || {};
    container.appendChild(this.makeRow('Level', this.makeNumberInput(water.level ?? -2, 0.1, (v) => {
      d.water = d.water || {};
      d.water.level = v;
      // Update water mesh
      const wm = this.sceneRoot.getObjectByName('__water__');
      if (wm) wm.position.y = v;
    })));
    container.appendChild(this.makeRow('Color', this.makeColorInput(water.color || '#2244aa', (v) => {
      d.water = d.water || {};
      d.water.color = v;
    })));

    // Post-Processing
    container.appendChild(this.makeSectionLabel('Post-Processing'));
    const pp = d.postProcessing || {};
    container.appendChild(this.makeRow('Dither', this.makeNumberInput(pp.ditherIntensity ?? 0.08, 0.01, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.ditherIntensity = v;
    })));
    container.appendChild(this.makeRow('Color Lvls', this.makeNumberInput(pp.colorLevels ?? 32, 1, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.colorLevels = v;
    }, 4)));
    container.appendChild(this.makeRow('Chrom. Ab.', this.makeNumberInput(pp.chromaticAberration ?? 0.0008, 0.0002, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.chromaticAberration = v;
    })));
    container.appendChild(this.makeRow('Vignette', this.makeNumberInput(pp.vignette ?? 0.4, 0.05, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.vignette = v;
    }, 0, 2)));
    container.appendChild(this.makeRow('Bloom Str', this.makeNumberInput(pp.bloomStrength ?? 0.4, 0.05, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.bloomStrength = v;
    }, 0, 2)));
    container.appendChild(this.makeRow('Bloom Thr', this.makeNumberInput(pp.bloomThreshold ?? 0.7, 0.05, (v) => {
      d.postProcessing = d.postProcessing || {};
      d.postProcessing.bloomThreshold = v;
    }, 0, 1)));

    // PSX Effects
    container.appendChild(this.makeSectionLabel('PSX Effects'));
    container.appendChild(this.makeRow('Vtx Snap', this.makeNumberInput(d.vertexSnap ?? 0, 10, (v) => {
      d.vertexSnap = v;
    }, 0)));
    container.appendChild(this.makeRow('Affine UV', this.makeCheckbox(d.affineWarp || false, (v) => {
      d.affineWarp = v;
    })));
  }

  // ─────────────── INSPECTOR PANEL ───────────────

  refreshInspector() {
    const empty = document.getElementById('inspector-empty');
    const panels = document.getElementById('inspector-panels');

    if (!this.selected) {
      empty.style.display = 'flex';
      panels.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    panels.style.display = 'block';
    panels.innerHTML = '';

    // Show multi-select count
    if (this.selectionSet.size > 1) {
      const badge = document.createElement('div');
      badge.style.cssText = 'padding:6px 12px; font-size:10px; color:var(--accent-cyan); font-family:"JetBrains Mono",monospace; border-bottom:1px solid var(--border);';
      badge.textContent = `${this.selectionSet.size} objects selected`;
      panels.appendChild(badge);
    }

    const def = this.selected;

    // ── IDENTITY SECTION ──
    const identSection = this.makeSection('Identity');
    identSection.body.appendChild(this.makeRow('ID', this.makeTextInput(def.id || '', (v) => {
      def.id = v;
      this.refreshHierarchy();
    })));
    identSection.body.appendChild(this.makeRow('Type', this.makeReadonly(def.type)));
    panels.appendChild(identSection.el);

    // ── TRANSFORM SECTION ──
    const transSection = this.makeSection('Transform');
    const pos = def.position || [0, 0, 0];
    transSection.body.appendChild(this.makeRow('Position', this.makeVec3Input(pos, (v) => {
      def.position = v;
      const obj = this.threeObjects.get(def);
      if (obj) obj.position.set(...v);
    }, 0.1)));

    const rot = def.rotation || [0, 0, 0];
    transSection.body.appendChild(this.makeRow('Rotation', this.makeVec3Input(rot, (v) => {
      def.rotation = v;
      const obj = this.threeObjects.get(def);
      if (obj) obj.rotation.set(v[0] * Math.PI / 180, v[1] * Math.PI / 180, v[2] * Math.PI / 180);
    }, 1)));

    const scl = def.scale ? (typeof def.scale === 'number' ? [def.scale, def.scale, def.scale] : def.scale) : [1, 1, 1];
    transSection.body.appendChild(this.makeRow('Scale', this.makeVec3Input(scl, (v) => {
      def.scale = (v[0] === v[1] && v[1] === v[2]) ? v[0] : v;
      const obj = this.threeObjects.get(def);
      if (obj) obj.scale.set(...v);
    }, 0.1)));
    panels.appendChild(transSection.el);

    // ── GEOMETRY PARAMS SECTION ──
    const schema = PARAM_SCHEMA[def.type];
    if (schema && schema.length > 0) {
      const geomSection = this.makeSection('Geometry');
      const params = def.params || {};
      for (const field of schema) {
        geomSection.body.appendChild(this.makeRow(field.label, this.makeNumberInput(
          params[field.key] ?? DEFAULT_PARAMS[def.type]?.[field.key] ?? 1,
          field.step || 0.1,
          (v) => {
            def.params = def.params || {};
            def.params[field.key] = v;
            this.rebuildObject(def);
          },
          field.min
        )));
      }
      panels.appendChild(geomSection.el);
    }

    // ── GROUP CHILDREN SECTION (for group type) ──
    if (def.type === 'group') {
      const groupSection = this.makeSection('Children');
      const children = def.children || [];
      groupSection.body.appendChild(this.makeReadonly(`${children.length} child objects`));

      const addChildBtn = document.createElement('button');
      addChildBtn.className = 'prop-btn';
      addChildBtn.textContent = '+ Add Child (box)';
      addChildBtn.style.cssText = 'width:100%; margin-top:6px;';
      addChildBtn.addEventListener('click', () => {
        def.children = def.children || [];
        def.children.push({
          id: 'child_' + Date.now().toString(36),
          type: 'box',
          params: { width: 1, height: 1, depth: 1 },
          position: [0, 0, 0],
          material: { ...DEFAULT_MATERIAL }
        });
        this.rebuildObject(def);
        this.refreshInspector();
      });
      groupSection.body.appendChild(addChildBtn);

      panels.appendChild(groupSection.el);
    }

    // ── MATERIAL SECTION (skip for groups) ──
    if (def.type !== 'group') {
      const matSection = this.makeSection('Material');
      const mat = def.material || {};
      matSection.body.appendChild(this.makeRow('Color', this.makeColorInput(mat.color || '#cccccc', (v) => {
        def.material = def.material || {};
        def.material.color = v;
        this._applyMaterialToSelection('color', new THREE.Color(v), v);
      })));
      matSection.body.appendChild(this.makeRow('Emissive', this.makeColorInput(mat.emissive || '#000000', (v) => {
        def.material = def.material || {};
        def.material.emissive = v === '#000000' ? undefined : v;
        this._applyMaterialToSelection('emissive', new THREE.Color(v), v === '#000000' ? undefined : v);
      })));
      matSection.body.appendChild(this.makeRow('Emiss. Int.', this.makeNumberInput(mat.emissiveIntensity ?? 0, 0.1, (v) => {
        def.material = def.material || {};
        def.material.emissiveIntensity = v;
        this._applyMaterialToSelection('emissiveIntensity', v, v);
      })));
      matSection.body.appendChild(this.makeRow('Metalness', this.makeNumberInput(mat.metalness ?? 0.1, 0.05, (v) => {
        def.material = def.material || {};
        def.material.metalness = v;
        this._applyMaterialToSelection('metalness', v, v);
      }, 0, 1)));
      matSection.body.appendChild(this.makeRow('Roughness', this.makeNumberInput(mat.roughness ?? 0.8, 0.05, (v) => {
        def.material = def.material || {};
        def.material.roughness = v;
        this._applyMaterialToSelection('roughness', v, v);
      }, 0, 1)));
      matSection.body.appendChild(this.makeRow('Transparent', this.makeCheckbox(mat.transparent || false, (v) => {
        def.material = def.material || {};
        def.material.transparent = v;
        this.rebuildObject(def);
      })));
      if (mat.transparent) {
        matSection.body.appendChild(this.makeRow('Opacity', this.makeNumberInput(mat.opacity ?? 1, 0.05, (v) => {
          def.material = def.material || {};
          def.material.opacity = v;
          this.updateMaterialProp(def, 'opacity', v);
        }, 0, 1)));
      }
      matSection.body.appendChild(this.makeRow('Texture', this.makeSelect(
        mat.texture || 'none',
        TEXTURE_OPTIONS,
        (v) => {
          def.material = def.material || {};
          if (v === 'none') {
            delete def.material.texture;
            delete def.material.textureRepeat;
          } else {
            def.material.texture = v;
            if (!def.material.textureRepeat) {
              def.material.textureRepeat = [1, 1];
            }
          }
          this.rebuildObject(def);
          this.refreshInspector();
        }
      )));
      if (mat.texture) {
        const tr = mat.textureRepeat || [1, 1];
        matSection.body.appendChild(this.makeRow('Tex Repeat X', this.makeNumberInput(tr[0], 0.5, (v) => {
          def.material = def.material || {};
          def.material.textureRepeat = def.material.textureRepeat || [1, 1];
          def.material.textureRepeat[0] = v;
          this.rebuildObject(def);
        }, 0.5)));
        matSection.body.appendChild(this.makeRow('Tex Repeat Y', this.makeNumberInput(tr[1], 0.5, (v) => {
          def.material = def.material || {};
          def.material.textureRepeat = def.material.textureRepeat || [1, 1];
          def.material.textureRepeat[1] = v;
          this.rebuildObject(def);
        }, 0.5)));
      }
      panels.appendChild(matSection.el);
    }

    // ── COLLISION SECTION ──
    const collSection = this.makeSection('Collision');
    collSection.body.appendChild(this.makeRow('Enabled', this.makeCheckbox(def.collision || false, (v) => {
      def.collision = v;
      this.rebuildCollisionHelpers();
      this.refreshInspector();
    })));
    if (def.collision) {
      const co = def.collisionOptions || {};
      collSection.body.appendChild(this.makeRow('Walkable', this.makeCheckbox(co.walkable || false, (v) => {
        def.collisionOptions = def.collisionOptions || {};
        def.collisionOptions.walkable = v;
        this.rebuildCollisionHelpers();
      })));
      collSection.body.appendChild(this.makeRow('Is Stairs', this.makeCheckbox(co.isStairs || false, (v) => {
        def.collisionOptions = def.collisionOptions || {};
        def.collisionOptions.isStairs = v;
      })));
      collSection.body.appendChild(this.makeRow('Trigger', this.makeCheckbox(co.trigger || false, (v) => {
        def.collisionOptions = def.collisionOptions || {};
        def.collisionOptions.trigger = v;
        this.rebuildCollisionHelpers();
        this.refreshInspector();
      })));
      collSection.body.appendChild(this.makeRow('Terrain', this.makeCheckbox(co.terrain || false, (v) => {
        def.collisionOptions = def.collisionOptions || {};
        def.collisionOptions.terrain = v;
      })));
    }
    panels.appendChild(collSection.el);

    // ── VISIBILITY SECTION ──
    const visSection = this.makeSection('Conditional Visibility');
    visSection.body.appendChild(this.makeRow('Visible When', this.makeTextInput(def.visibleWhen || '', (v) => {
      if (v) def.visibleWhen = v;
      else delete def.visibleWhen;
    })));
    visSection.body.appendChild(this.makeRow('Hidden When', this.makeTextInput(def.hiddenWhen || '', (v) => {
      if (v) def.hiddenWhen = v;
      else delete def.hiddenWhen;
    })));
    panels.appendChild(visSection.el);

    // ── ANIMATION SECTION ──
    const animSection = this.makeSection('Animation');
    const anim = def.animation;
    animSection.body.appendChild(this.makeRow('Type', this.makeSelect(
      anim?.type || 'none',
      ['none', 'float', 'rotate', 'bob', 'pulse'],
      (v) => {
        if (v === 'none') { delete def.animation; }
        else {
          def.animation = def.animation || {};
          def.animation.type = v;
          def.animation.speed = def.animation.speed ?? 1;
          def.animation.amplitude = def.animation.amplitude ?? 0.5;
          def.animation.offset = def.animation.offset ?? 0;
        }
        this.refreshInspector();
      }
    )));
    if (anim) {
      animSection.body.appendChild(this.makeRow('Speed', this.makeNumberInput(anim.speed ?? 1, 0.1, (v) => { def.animation.speed = v; })));
      animSection.body.appendChild(this.makeRow('Amplitude', this.makeNumberInput(anim.amplitude ?? 0.5, 0.05, (v) => { def.animation.amplitude = v; })));
      animSection.body.appendChild(this.makeRow('Offset', this.makeNumberInput(anim.offset ?? 0, 0.1, (v) => { def.animation.offset = v; })));
      if (anim.type === 'rotate') {
        animSection.body.appendChild(this.makeRow('Axis', this.makeSelect(anim.axis || 'y', ['x', 'y', 'z'], (v) => { def.animation.axis = v; })));
      }
    }
    panels.appendChild(animSection.el);

    // ── INTERACTION SECTION ──
    const interSection = this.makeSection('Interaction');
    const inter = def.interactable;
    interSection.body.appendChild(this.makeRow('Type', this.makeSelect(
      inter?.type || 'none',
      ['none', 'dialogue', 'examine', 'trigger', 'pickup'],
      (v) => {
        if (v === 'none') { delete def.interactable; }
        else {
          def.interactable = def.interactable || {};
          def.interactable.type = v;
          def.interactable.hoverText = def.interactable.hoverText || 'Interact';
        }
        this.refreshInspector();
      }
    )));
    if (inter) {
      interSection.body.appendChild(this.makeRow('Hover Text', this.makeTextInput(inter.hoverText || '', (v) => { def.interactable.hoverText = v; })));
      interSection.body.appendChild(this.makeRow('Int. Dist', this.makeNumberInput(inter.interactDistance ?? 4, 0.5, (v) => { def.interactable.interactDistance = v; })));

      // Requires field (supports string or object)
      interSection.body.appendChild(this.makeRow('Requires', this.makeTextInput(
        typeof inter.requires === 'string' ? inter.requires : (inter.requires ? JSON.stringify(inter.requires) : ''),
        (v) => {
          if (!v) { delete def.interactable.requires; return; }
          try {
            const parsed = JSON.parse(v);
            def.interactable.requires = parsed;
          } catch {
            def.interactable.requires = v; // plain string
          }
        }
      )));
      interSection.body.appendChild(this.makeRow('Req. Text', this.makeTextInput(inter.requiresText || '', (v) => {
        if (v) def.interactable.requiresText = v;
        else delete def.interactable.requiresText;
      })));

      if (inter.type === 'examine') {
        interSection.body.appendChild(this.makeRow('Text', this.makeTextArea(inter.text || inter.examineText || '', (v) => { def.interactable.text = v; })));
      }

      if (inter.type === 'trigger') {
        interSection.body.appendChild(this.makeSectionLabel('Action'));
        const action = inter.action || {};
        interSection.body.appendChild(this.makeRow('Action', this.makeSelect(action.type || 'transition', ['transition', 'notify', 'setState'], (v) => {
          def.interactable.action = def.interactable.action || {};
          def.interactable.action.type = v;
          this.refreshInspector();
        })));
        if (action.type === 'transition') {
          interSection.body.appendChild(this.makeRow('Target', this.makeTextInput(action.target || '', (v) => { def.interactable.action.target = v; })));
        } else if (action.type === 'notify') {
          interSection.body.appendChild(this.makeRow('Text', this.makeTextInput(action.text || '', (v) => { def.interactable.action.text = v; })));
        } else if (action.type === 'setState') {
          interSection.body.appendChild(this.makeRow('Key', this.makeTextInput(action.key || '', (v) => { def.interactable.action.key = v; })));
          interSection.body.appendChild(this.makeRow('Value', this.makeTextInput(String(action.value ?? 'true'), (v) => {
            def.interactable.action.value = v === 'false' ? false : (v === 'true' ? true : v);
          })));
        }
      }

      if (inter.type === 'pickup') {
        interSection.body.appendChild(this.makeRow('Item Name', this.makeTextInput(inter.itemName || '', (v) => { def.interactable.itemName = v; })));
        interSection.body.appendChild(this.makeRow('State Key', this.makeTextInput(inter.stateKey || '', (v) => { def.interactable.stateKey = v; })));
      }

      if (inter.type === 'dialogue') {
        const editBtn = document.createElement('button');
        editBtn.className = 'prop-btn';
        editBtn.textContent = '✎ Edit Dialogue Tree';
        editBtn.style.width = '100%';
        editBtn.style.marginTop = '4px';
        editBtn.addEventListener('click', () => this.openDialogueEditor(def));
        interSection.body.appendChild(editBtn);

        // OnSuccess action
        interSection.body.appendChild(this.makeSectionLabel('On Success Action'));
        const onSuccess = inter.onSuccess || {};
        interSection.body.appendChild(this.makeRow('Type', this.makeSelect(onSuccess.type || 'none', ['none', 'transition', 'notify', 'setState'], (v) => {
          if (v === 'none') delete def.interactable.onSuccess;
          else { def.interactable.onSuccess = { type: v }; }
          this.refreshInspector();
        })));
        if (onSuccess.type === 'transition') {
          interSection.body.appendChild(this.makeRow('Target', this.makeTextInput(onSuccess.target || '', (v) => {
            def.interactable.onSuccess = def.interactable.onSuccess || {};
            def.interactable.onSuccess.target = v;
          })));
        } else if (onSuccess.type === 'setState') {
          interSection.body.appendChild(this.makeRow('Key', this.makeTextInput(onSuccess.key || '', (v) => {
            def.interactable.onSuccess = def.interactable.onSuccess || {};
            def.interactable.onSuccess.key = v;
          })));
          interSection.body.appendChild(this.makeRow('Value', this.makeTextInput(String(onSuccess.value ?? 'true'), (v) => {
            def.interactable.onSuccess = def.interactable.onSuccess || {};
            def.interactable.onSuccess.value = v === 'false' ? false : (v === 'true' ? true : v);
          })));
        }
      }
    }
    panels.appendChild(interSection.el);
  }

  // Apply a material property change to all selected objects (multi-select)
  _applyMaterialToSelection(prop, threeValue, defValue) {
    for (const def of this.selectionSet) {
      def.material = def.material || {};
      if (prop === 'emissive') {
        def.material.emissive = defValue;
      } else if (prop === 'color') {
        def.material.color = defValue;
      } else {
        def.material[prop] = defValue;
      }
      this.updateMaterialProp(def, prop, threeValue);
    }
  }

  updateMaterialProp(def, prop, value) {
    const obj = this.threeObjects.get(def);
    if (!obj) return;
    // For compound types, update all child materials
    obj.traverse((child) => {
      if (child.isMesh && child.material) {
        if (prop === 'color' || prop === 'emissive') {
          if (child.material[prop]) child.material[prop].copy(value);
        } else {
          child.material[prop] = value;
        }
        child.material.needsUpdate = true;
      }
    });
  }

  // ─────────────── DIALOGUE EDITOR ───────────────

  openDialogueEditor(def) {
    this._dialogueDef = def;
    const dialogue = def.interactable?.dialogue || { nodes: [] };
    this._editingDialogue = JSON.parse(JSON.stringify(dialogue));
    this.renderDialogueEditor();
    document.getElementById('dialogue-modal').classList.add('active');
  }

  renderDialogueEditor() {
    const container = document.getElementById('dialogue-editor-content');
    container.innerHTML = '';
    const nodes = this._editingDialogue.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const el = document.createElement('div');
      el.className = 'dlg-node';
      el.innerHTML = `
        <div class="dlg-node-header">
          <span>Node ${i}</span>
          <button class="prop-btn small danger" data-idx="${i}">✕ Remove</button>
        </div>
        <div class="prop-row">
          <span class="prop-label">Speaker</span>
          <div class="prop-input"><input type="text" value="${escHtml(node.speaker || '')}" data-field="speaker" data-idx="${i}"></div>
        </div>
        <div class="prop-row">
          <span class="prop-label">Text</span>
          <div class="prop-input"><textarea data-field="text" data-idx="${i}">${escHtml(node.text || '')}</textarea></div>
        </div>
        <div class="prop-row">
          <span class="prop-label">Next</span>
          <div class="prop-input"><input type="number" value="${node.next ?? ''}" data-field="next" data-idx="${i}" placeholder="auto (next index)"></div>
        </div>
        <div class="dlg-choices-container" id="dlg-choices-${i}"></div>
        <button class="prop-btn small" data-add-choice="${i}" style="margin-top:6px;">+ Add Choice</button>
      `;
      container.appendChild(el);

      // Render choices
      const choicesContainer = el.querySelector(`#dlg-choices-${i}`);
      if (node.choices) {
        for (let c = 0; c < node.choices.length; c++) {
          const choice = node.choices[c];
          const cEl = document.createElement('div');
          cEl.className = 'dlg-choice';
          cEl.innerHTML = `
            <div class="dlg-choice-header">
              <span>Choice ${c}</span>
              <button class="prop-btn small danger" data-rm-choice="${i}" data-cidx="${c}">✕</button>
            </div>
            <div class="prop-row">
              <span class="prop-label" style="width:60px">Text</span>
              <div class="prop-input"><input type="text" value="${escHtml(choice.text || '')}" data-cfield="text" data-idx="${i}" data-cidx="${c}"></div>
            </div>
            <div class="prop-row">
              <span class="prop-label" style="width:60px">Correct</span>
              <div class="prop-input"><select data-cfield="correct" data-idx="${i}" data-cidx="${c}">
                <option value="" ${choice.correct == null ? 'selected' : ''}>—</option>
                <option value="true" ${choice.correct === true ? 'selected' : ''}>True</option>
                <option value="false" ${choice.correct === false ? 'selected' : ''}>False</option>
              </select></div>
            </div>
            <div class="prop-row">
              <span class="prop-label" style="width:60px">Response</span>
              <div class="prop-input"><textarea data-cfield="response" data-idx="${i}" data-cidx="${c}">${escHtml(choice.response || '')}</textarea></div>
            </div>
            <div class="prop-row">
              <span class="prop-label" style="width:60px">Goto</span>
              <div class="prop-input"><input type="number" value="${choice.goto ?? ''}" data-cfield="goto" data-idx="${i}" data-cidx="${c}" placeholder="node index"></div>
            </div>
          `;
          choicesContainer.appendChild(cEl);
        }
      }
    }

    // Event delegation
    container.addEventListener('input', (e) => {
      const t = e.target;
      const idx = parseInt(t.dataset.idx);
      if (isNaN(idx)) return;

      if (t.dataset.field) {
        // Node field
        const field = t.dataset.field;
        if (field === 'next') {
          const v = t.value.trim();
          nodes[idx].next = v === '' ? undefined : parseInt(v);
        } else {
          nodes[idx][field] = t.value;
        }
      } else if (t.dataset.cfield) {
        // Choice field
        const cidx = parseInt(t.dataset.cidx);
        const choice = nodes[idx].choices[cidx];
        const cf = t.dataset.cfield;
        if (cf === 'correct') {
          choice.correct = t.value === '' ? undefined : t.value === 'true';
        } else if (cf === 'goto') {
          const v = t.value.trim();
          choice.goto = v === '' ? undefined : parseInt(v);
        } else {
          choice[cf] = t.value;
        }
      }
    });

    container.addEventListener('change', (e) => {
      // same handler for selects
      e.target.dispatchEvent(new Event('input', { bubbles: true }));
    });

    container.addEventListener('click', (e) => {
      const t = e.target;
      if (t.dataset.idx !== undefined && t.classList.contains('danger')) {
        nodes.splice(parseInt(t.dataset.idx), 1);
        this.renderDialogueEditor();
      }
      if (t.dataset.addChoice !== undefined) {
        const idx = parseInt(t.dataset.addChoice);
        nodes[idx].choices = nodes[idx].choices || [];
        nodes[idx].choices.push({ text: 'Choice text', correct: null });
        this.renderDialogueEditor();
      }
      if (t.dataset.rmChoice !== undefined) {
        const idx = parseInt(t.dataset.rmChoice);
        const cidx = parseInt(t.dataset.cidx);
        nodes[idx].choices.splice(cidx, 1);
        if (nodes[idx].choices.length === 0) delete nodes[idx].choices;
        this.renderDialogueEditor();
      }
    });
  }

  addDialogueNode() {
    this._editingDialogue.nodes.push({
      speaker: 'SPEAKER',
      text: 'Dialogue text...'
    });
    this.renderDialogueEditor();
  }

  saveDialogueFromModal() {
    if (this._dialogueDef && this._editingDialogue) {
      this._dialogueDef.interactable = this._dialogueDef.interactable || {};
      this._dialogueDef.interactable.dialogue = this._editingDialogue;
    }
    document.getElementById('dialogue-modal').classList.remove('active');
    this.refreshInspector();
  }

  // ─────────────── EXPORT ───────────────

  exportScene() {
    if (!this.sceneData) { alert('No scene loaded.'); return; }

    // Clean up: remove undefined keys etc.
    const data = JSON.parse(JSON.stringify(this.sceneData));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (data.id || 'scene') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  playScene() {
    // Save to localStorage and open game
    if (!this.sceneData) return;
    localStorage.setItem('__vapor_editor_scene__', JSON.stringify(this.sceneData));
    window.open('index.html?editorScene=1', '_blank');
  }

  // ─────────────── UI HELPERS ───────────────

  makeSection(title) {
    const el = document.createElement('div');
    el.className = 'prop-section';
    const header = document.createElement('div');
    header.className = 'prop-section-header';
    header.innerHTML = `<span class="caret">▾</span> ${title}`;
    const body = document.createElement('div');
    body.className = 'prop-section-body';

    header.addEventListener('click', () => {
      body.classList.toggle('collapsed');
      header.querySelector('.caret').classList.toggle('collapsed');
    });

    el.appendChild(header);
    el.appendChild(body);
    return { el, body };
  }

  makeSectionLabel(text) {
    const el = document.createElement('div');
    el.style.cssText = 'font-size:10px; font-weight:600; color: var(--text-dim); margin: 8px 0 4px; letter-spacing:0.5px; text-transform: uppercase; font-family: "JetBrains Mono", monospace;';
    el.textContent = text;
    return el;
  }

  makeRow(label, inputEl) {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('span');
    lbl.className = 'prop-label';
    lbl.textContent = label;
    const inp = document.createElement('div');
    inp.className = 'prop-input';
    inp.appendChild(inputEl);
    row.appendChild(lbl);
    row.appendChild(inp);
    return row;
  }

  makeTextInput(value, onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('change', () => onChange(input.value));
    return input;
  }

  makeNumberInput(value, step, onChange, min, max) {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = round3(value);
    input.step = step;
    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
    input.addEventListener('change', () => onChange(parseFloat(input.value) || 0));
    return input;
  }

  makeTextArea(value, onChange) {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.addEventListener('change', () => onChange(ta.value));
    return ta;
  }

  makeSelect(value, options, onChange) {
    const sel = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  makeCheckbox(value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'prop-check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = value;
    cb.addEventListener('change', () => onChange(cb.checked));
    wrapper.appendChild(cb);
    return wrapper;
  }

  makeColorInput(value, onChange) {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-row';
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = value;
    const text = document.createElement('input');
    text.type = 'text';
    text.value = value;
    picker.addEventListener('input', () => { text.value = picker.value; onChange(picker.value); });
    text.addEventListener('change', () => { picker.value = text.value; onChange(text.value); });
    wrapper.appendChild(picker);
    wrapper.appendChild(text);
    return wrapper;
  }

  makeVec3Input(values, onChange, step = 0.1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vec3-row';
    const axes = ['x', 'y', 'z'];
    const inputs = [];
    for (let i = 0; i < 3; i++) {
      const label = document.createElement('span');
      label.className = `axis-label ${axes[i]}`;
      label.textContent = axes[i].toUpperCase();
      wrapper.appendChild(label);
      const input = document.createElement('input');
      input.type = 'number';
      input.value = round3(values[i] || 0);
      input.step = step;
      input.addEventListener('change', () => {
        const v = inputs.map(inp => parseFloat(inp.value) || 0);
        onChange(v);
      });
      wrapper.appendChild(input);
      inputs.push(input);
    }
    return wrapper;
  }

  makeReadonly(value) {
    const span = document.createElement('span');
    span.textContent = value;
    span.style.cssText = 'color: var(--text-dim); font-size: 11px;';
    return span;
  }

  // ─────────────── STATUS BAR ───────────────

  updateStatusBar() {
    document.getElementById('status-objects').textContent = `Objects: ${this.objectDefs.length}`;
  }

  // ─────────────── RENDER LOOP ───────────────

  animate() {
    requestAnimationFrame(() => this.animate());

    this.orbitControls.update();

    // Update camera status
    const cp = this.camera.position;
    document.getElementById('status-pos').textContent =
      `Cam: ${cp.x.toFixed(1)}, ${cp.y.toFixed(1)}, ${cp.z.toFixed(1)}`;

    this.renderer.render(this.scene, this.camera);
  }
}

// ─────────────── BOOTSTRAP ───────────────

const editor = new SceneEditor();
