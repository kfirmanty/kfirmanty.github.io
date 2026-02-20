import * as THREE from 'three';
import { loadTexture } from './textures.js';

export function createMaterial(def) {
  if (!def) return new THREE.MeshStandardMaterial({ color: 0xcccccc });

  const params = {};
  if (def.color) params.color = new THREE.Color(def.color);
  if (def.emissive) {
    params.emissive = new THREE.Color(def.emissive);
    params.emissiveIntensity = def.emissiveIntensity ?? 1.0;
  }
  params.metalness = def.metalness ?? 0.1;
  params.roughness = def.roughness ?? 0.8;
  if (def.transparent) {
    params.transparent = true;
    params.opacity = def.opacity ?? 0.5;
  }
  if (def.wireframe) params.wireframe = true;
  if (def.flatShading !== false) params.flatShading = true; // Default flat for low-poly
  if (def.side === 'double') params.side = THREE.DoubleSide;

  if (def.texture) {
    const srcTex = loadTexture(def.texture);
    if (srcTex) {
      const tex = srcTex.clone();
      tex.needsUpdate = true;
      if (def.textureRepeat) {
        tex.repeat.set(def.textureRepeat[0], def.textureRepeat[1]);
      }
      params.map = tex;
    }
  }

  return new THREE.MeshStandardMaterial(params);
}
