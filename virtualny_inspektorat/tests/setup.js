import { vi } from 'vitest';
import * as THREE from 'three';

// Stub TextureLoader.load to return a dummy texture (avoids network requests)
vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url) => {
  const tex = new THREE.Texture();
  tex.image = { width: 64, height: 64 };
  return tex;
});

// Pre-create DOM elements that modules query in constructors
const elementIds = [
  'dialogue-overlay', 'dialogue-speaker', 'dialogue-text',
  'dialogue-choices', 'dialogue-continue', 'notification',
  'game-canvas', 'cursor', 'crosshair', 'loading',
  'title-screen', 'start-btn', 'transition',
  'brightness-slider', 'brightness-value'
];

for (const id of elementIds) {
  if (!document.getElementById(id)) {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
}

// Create a canvas element for game-canvas (some code checks for getContext)
const canvas = document.getElementById('game-canvas');
if (canvas.tagName !== 'CANVAS') {
  const realCanvas = document.createElement('canvas');
  realCanvas.id = 'game-canvas';
  canvas.replaceWith(realCanvas);
}

// Stub pointer lock APIs
HTMLElement.prototype.requestPointerLock = vi.fn();
document.exitPointerLock = vi.fn();

// Stub AudioContext
globalThis.AudioContext = vi.fn().mockImplementation(() => ({
  state: 'running',
  resume: vi.fn(),
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { value: 440 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn()
  }))
}));
globalThis.webkitAudioContext = globalThis.AudioContext;
