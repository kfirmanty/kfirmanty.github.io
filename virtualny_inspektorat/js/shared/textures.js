import * as THREE from 'three';

const TEXTURE_REGISTRY = {
  sky: 'assets/textures/sky.png',
  marble: 'assets/textures/marble.png'
};

const TEXTURE_OPTIONS = ['none', ...Object.keys(TEXTURE_REGISTRY)];

const textureLoader = new THREE.TextureLoader();
const textureCache = {};

function loadTexture(name) {
  if (textureCache[name]) return textureCache[name];
  const path = TEXTURE_REGISTRY[name];
  if (!path) return null;
  const tex = textureLoader.load(path);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache[name] = tex;
  return tex;
}

export { TEXTURE_REGISTRY, TEXTURE_OPTIONS, loadTexture };
