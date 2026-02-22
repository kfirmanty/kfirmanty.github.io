import * as THREE from 'three';
import { PLAYER_HEIGHT } from './constants.js';
import { GeometryBuilders, COMPOUND_TYPES } from './shared/geometry.js';
import { createMaterial } from './shared/materials.js';
import { applyPSXEffects } from './shaders.js';

export class SceneLoader {
  constructor(game) {
    this.game = game;
    this.sceneCache = {};
  }

  async loadScene(sceneId) {
    let data;
    try {
      const resp = await fetch(`scenes/${sceneId}.json`, { cache: 'no-cache' });
      data = await resp.json();
    } catch (e) {
      console.error(`Failed to load scene: ${sceneId}`, e);
      return null;
    }

    this.sceneCache[sceneId] = data;
    return this.buildScene(data);
  }

  buildScene(data) {
    const scene = new THREE.Scene();
    const interactables = [];
    const collisionMeshes = [];
    const spawnPoint = data.spawn || { position: [0, PLAYER_HEIGHT, 0], rotation: [0, 0, 0] };
    const vertexSnap = data.vertexSnap || 0;
    const affineWarp = data.affineWarp || false;

    // Sky
    if (data.sky) {
      if (data.sky.type === 'gradient') {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        const stops = data.sky.stops || [
          [0, data.sky.topColor || '#0a0a2e'],
          [1, data.sky.bottomColor || '#2a7ea8']
        ];
        stops.forEach(([stop, color]) => grad.addColorStop(stop, color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 2, 256);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        scene.background = tex;
      } else if (data.sky.color) {
        scene.background = new THREE.Color(data.sky.color);
      }
    }

    // Fog
    if (data.fog) {
      scene.fog = new THREE.Fog(
        new THREE.Color(data.fog.color),
        data.fog.near || 10,
        data.fog.far || 60
      );
    }

    // Ambient light
    if (data.ambient) {
      const ambient = new THREE.AmbientLight(
        new THREE.Color(data.ambient.color || '#ffffff'),
        data.ambient.intensity ?? 0.4
      );
      scene.add(ambient);
    }

    // Directional / point lights
    if (data.lights) {
      for (const lDef of data.lights) {
        let light;
        if (lDef.type === 'directional') {
          light = new THREE.DirectionalLight(
            new THREE.Color(lDef.color || '#ffffff'),
            lDef.intensity ?? 1.0
          );
          if (lDef.position) light.position.set(...lDef.position);
          light.castShadow = lDef.castShadow ?? false;
        } else if (lDef.type === 'point') {
          light = new THREE.PointLight(
            new THREE.Color(lDef.color || '#ffffff'),
            lDef.intensity ?? 1.0,
            lDef.distance || 20,
            lDef.decay ?? 2
          );
          if (lDef.position) light.position.set(...lDef.position);
        } else if (lDef.type === 'spot') {
          light = new THREE.SpotLight(
            new THREE.Color(lDef.color || '#ffffff'),
            lDef.intensity ?? 1.0,
            lDef.distance || 20,
            (lDef.angle ?? 45) * Math.PI / 180,
            lDef.penumbra ?? 0.3,
            lDef.decay ?? 2
          );
          if (lDef.position) light.position.set(...lDef.position);
          if (lDef.target) light.target.position.set(...lDef.target);
        } else if (lDef.type === 'hemisphere') {
          light = new THREE.HemisphereLight(
            new THREE.Color(lDef.skyColor || '#ffffff'),
            new THREE.Color(lDef.groundColor || '#444444'),
            lDef.intensity ?? 0.6
          );
        }
        if (light) {
          scene.add(light);
          if (light.isSpotLight) scene.add(light.target);
        }
      }
    }

    // Water
    if (data.water) {
      const water = GeometryBuilders.water(data.water);
      scene.add(water);
    }

    // Objects
    if (data.objects) {
      for (const objDef of data.objects) {
        const result = this.buildObject(objDef, vertexSnap, affineWarp);
        if (!result) continue;
        const { object, collision } = result;

        // Conditional visibility
        const visible = this._checkVisibility(objDef, this.game.gameState);
        object.visible = visible;
        if (objDef.visibleWhen || objDef.hiddenWhen) {
          object.userData.visibilityRule = {
            visibleWhen: objDef.visibleWhen,
            hiddenWhen: objDef.hiddenWhen
          };
        }

        scene.add(object);

        if (collision) {
          const options = { ...(objDef.collisionOptions || {}) };
          // Mark trigger zones
          if (options.trigger) {
            options.triggerId = objDef.id;
          }
          collisionMeshes.push({ object, options });
        }

        if (objDef.interactable) {
          interactables.push({
            object,
            id: objDef.id,
            type: objDef.interactable.type,
            data: objDef.interactable,
            hoverText: objDef.interactable.hoverText || 'Interact'
          });
        }

        // Animations
        if (objDef.animation) {
          this.applyAnimation(object, objDef.animation);
        }
      }
    }

    return {
      scene, interactables, collisionMeshes, spawnPoint, data,
      postProcessing: data.postProcessing || null
    };
  }

  buildObject(def, vertexSnap, affineWarp) {
    const mat = createMaterial(def.material);

    // Apply PSX effects (vertex jitter + affine warping)
    const hasTexture = !!def.material?.texture;
    if (vertexSnap > 0 || (affineWarp && hasTexture)) {
      applyPSXEffects(mat, vertexSnap, affineWarp && hasTexture);
    }

    let object;
    let isMesh = true;

    // Compound types return groups
    if (COMPOUND_TYPES.includes(def.type)) {
      const params = { ...def.params, _material: mat };
      if (def.type === 'head' && def.params?.eyeMaterial) {
        params._eyeMaterial = createMaterial(def.params.eyeMaterial);
      }
      object = GeometryBuilders[def.type](params);
      isMesh = false;

      // Apply PSX effects to all child meshes in compound types
      if (vertexSnap > 0 || affineWarp) {
        object.traverse((child) => {
          if (child.isMesh && child.material) {
            applyPSXEffects(child.material, vertexSnap, false); // No affine on compound internals
          }
        });
      }
    } else if (def.type === 'group') {
      object = new THREE.Group();
      if (def.children) {
        for (const childDef of def.children) {
          const childResult = this.buildObject(childDef, vertexSnap, affineWarp);
          if (childResult) object.add(childResult.object);
        }
      }
      isMesh = false;
    } else if (GeometryBuilders[def.type]) {
      const geom = GeometryBuilders[def.type](def.params || {});
      object = new THREE.Mesh(geom, mat);
    } else {
      console.warn(`Unknown geometry type: ${def.type}`);
      return null;
    }

    // Transform
    if (def.position) object.position.set(...def.position);
    if (def.rotation) {
      object.rotation.set(
        (def.rotation[0] || 0) * Math.PI / 180,
        (def.rotation[1] || 0) * Math.PI / 180,
        (def.rotation[2] || 0) * Math.PI / 180
      );
    }
    if (def.scale) {
      if (typeof def.scale === 'number') {
        object.scale.setScalar(def.scale);
      } else {
        object.scale.set(...def.scale);
      }
    }

    // Shadows
    if (isMesh) {
      object.castShadow = def.castShadow ?? true;
      object.receiveShadow = def.receiveShadow ?? true;
    }

    object.userData.id = def.id || '';
    object.userData.def = def;

    return {
      object,
      collision: def.collision ?? false
    };
  }

  // Check if an object should be visible based on game state
  _checkVisibility(def, gameState) {
    if (def.visibleWhen) {
      return !!gameState[def.visibleWhen];
    }
    if (def.hiddenWhen) {
      return !gameState[def.hiddenWhen];
    }
    return true;
  }

  applyAnimation(object, animDef) {
    const type = animDef.type;
    const speed = animDef.speed || 1;
    const amplitude = animDef.amplitude || 1;
    const offset = animDef.offset || 0;
    const basePos = object.position.clone();
    const baseRot = object.rotation.clone();

    if (type === 'float') {
      this.game.animations.add(object, (time) => {
        object.position.y = basePos.y + Math.sin(time * speed + offset) * amplitude;
      });
    } else if (type === 'rotate') {
      const axis = animDef.axis || 'y';
      this.game.animations.add(object, (time) => {
        object.rotation[axis] = baseRot[axis] + time * speed;
      });
    } else if (type === 'bob') {
      this.game.animations.add(object, (time) => {
        object.position.y = basePos.y + Math.sin(time * speed + offset) * amplitude;
        object.rotation.y = baseRot.y + Math.sin(time * speed * 0.5 + offset) * 0.1;
      });
    } else if (type === 'pulse') {
      this.game.animations.add(object, (time) => {
        const s = 1 + Math.sin(time * speed + offset) * amplitude * 0.1;
        object.scale.setScalar(s);
      });
    }
  }
}
