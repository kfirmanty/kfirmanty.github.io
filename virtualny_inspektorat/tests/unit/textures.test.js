import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TEXTURE_REGISTRY, TEXTURE_OPTIONS, loadTexture } from '../../js/shared/textures.js';

describe('TEXTURE_REGISTRY', () => {
  it('contains expected texture names', () => {
    expect(TEXTURE_REGISTRY).toHaveProperty('sky');
    expect(TEXTURE_REGISTRY).toHaveProperty('marble');
    expect(TEXTURE_REGISTRY).toHaveProperty('checkerboard');
  });

  it('all values are asset paths', () => {
    for (const [name, path] of Object.entries(TEXTURE_REGISTRY)) {
      expect(path, `${name} path`).toMatch(/^assets\/textures\/.+\.png$/);
    }
  });
});

describe('TEXTURE_OPTIONS', () => {
  it('starts with "none"', () => {
    expect(TEXTURE_OPTIONS[0]).toBe('none');
  });

  it('includes all registry keys', () => {
    for (const key of Object.keys(TEXTURE_REGISTRY)) {
      expect(TEXTURE_OPTIONS).toContain(key);
    }
  });

  it('has length of registry + 1 (for "none")', () => {
    expect(TEXTURE_OPTIONS.length).toBe(Object.keys(TEXTURE_REGISTRY).length + 1);
  });
});

describe('loadTexture', () => {
  it('returns null for unknown texture name', () => {
    expect(loadTexture('nonexistent')).toBeNull();
  });

  it('returns a Texture for known name', () => {
    const tex = loadTexture('sky');
    expect(tex).toBeInstanceOf(THREE.Texture);
  });

  it('sets NearestFilter on loaded textures', () => {
    const tex = loadTexture('marble');
    expect(tex.magFilter).toBe(THREE.NearestFilter);
    expect(tex.minFilter).toBe(THREE.NearestFilter);
  });

  it('sets RepeatWrapping on loaded textures', () => {
    const tex = loadTexture('marble');
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.wrapT).toBe(THREE.RepeatWrapping);
  });

  it('returns cached texture on subsequent calls', () => {
    const tex1 = loadTexture('checkerboard');
    const tex2 = loadTexture('checkerboard');
    expect(tex1).toBe(tex2); // same object reference
  });
});
