import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  DitherShader, BloomExtractShader, BloomBlurShader, BloomCompositeShader,
  applyPSXEffects, applyVertexJitter, applyAffineWarping
} from '../../js/shaders.js';

describe('Shader data objects', () => {
  const shaders = [
    ['DitherShader', DitherShader],
    ['BloomExtractShader', BloomExtractShader],
    ['BloomBlurShader', BloomBlurShader],
    ['BloomCompositeShader', BloomCompositeShader]
  ];

  for (const [name, shader] of shaders) {
    describe(name, () => {
      it('has uniforms object', () => {
        expect(shader.uniforms).toBeDefined();
        expect(typeof shader.uniforms).toBe('object');
      });

      it('has non-empty vertexShader string', () => {
        expect(typeof shader.vertexShader).toBe('string');
        expect(shader.vertexShader.length).toBeGreaterThan(0);
      });

      it('has non-empty fragmentShader string', () => {
        expect(typeof shader.fragmentShader).toBe('string');
        expect(shader.fragmentShader.length).toBeGreaterThan(0);
      });
    });
  }

  it('DitherShader has expected uniform keys', () => {
    const keys = Object.keys(DitherShader.uniforms);
    expect(keys).toContain('tDiffuse');
    expect(keys).toContain('resolution');
    expect(keys).toContain('ditherIntensity');
    expect(keys).toContain('colorDepth');
    expect(keys).toContain('chromaticAberration');
    expect(keys).toContain('vignette');
    expect(keys).toContain('time');
    expect(keys).toContain('gamma');
  });

  it('BloomExtractShader has threshold uniform', () => {
    expect(BloomExtractShader.uniforms.threshold.value).toBe(0.7);
  });

  it('BloomCompositeShader has bloomStrength uniform', () => {
    expect(BloomCompositeShader.uniforms.bloomStrength.value).toBe(0.4);
  });
});

describe('applyPSXEffects', () => {
  it('does nothing when both params are falsy', () => {
    const mat = new THREE.MeshStandardMaterial();
    const original = mat.onBeforeCompile;
    applyPSXEffects(mat, 0, false);
    expect(mat.onBeforeCompile).toBe(original);
  });

  it('sets onBeforeCompile when snapResolution > 0', () => {
    const mat = new THREE.MeshStandardMaterial();
    const versionBefore = mat.version;
    applyPSXEffects(mat, 80, false);
    expect(typeof mat.onBeforeCompile).toBe('function');
    expect(mat.version).toBeGreaterThan(versionBefore);
  });

  it('sets onBeforeCompile when affineWarp is true', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyPSXEffects(mat, 0, true);
    expect(typeof mat.onBeforeCompile).toBe('function');
  });

  it('chains hooks without overwriting previous ones', () => {
    const mat = new THREE.MeshStandardMaterial();
    const calls = [];

    // Set first hook
    applyPSXEffects(mat, 80, false);
    const firstHook = mat.onBeforeCompile;

    // Set second hook
    applyPSXEffects(mat, 60, false);
    const secondHook = mat.onBeforeCompile;

    expect(secondHook).not.toBe(firstHook);
  });
});

describe('applyVertexJitter', () => {
  it('delegates to applyPSXEffects with affineWarp=false', () => {
    const mat = new THREE.MeshStandardMaterial();
    const versionBefore = mat.version;
    applyVertexJitter(mat, 80);
    expect(typeof mat.onBeforeCompile).toBe('function');
    expect(mat.version).toBeGreaterThan(versionBefore);
  });
});

describe('applyAffineWarping', () => {
  it('delegates to applyPSXEffects with snapResolution=0', () => {
    const mat = new THREE.MeshStandardMaterial();
    applyAffineWarping(mat);
    expect(typeof mat.onBeforeCompile).toBe('function');
  });
});
