import * as THREE from 'three';
import { PLAYER_HEIGHT } from './constants.js';
import { GeometryBuilders, COMPOUND_TYPES } from './shared/geometry.js';
import { createMaterial } from './shared/materials.js';

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
        } else if (lDef.type === 'hemisphere') {
          light = new THREE.HemisphereLight(
            new THREE.Color(lDef.skyColor || '#ffffff'),
            new THREE.Color(lDef.groundColor || '#444444'),
            lDef.intensity ?? 0.6
          );
        }
        if (light) scene.add(light);
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
        const result = this.buildObject(objDef);
        if (!result) continue;
        const { object, collision } = result;

        scene.add(object);

        if (collision) {
          collisionMeshes.push({ object, options: objDef.collisionOptions || {} });
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

    return { scene, interactables, collisionMeshes, spawnPoint, data };
  }

  buildObject(def) {
    const mat = createMaterial(def.material);
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
    } else if (def.type === 'group') {
      object = new THREE.Group();
      if (def.children) {
        for (const childDef of def.children) {
          const childResult = this.buildObject(childDef);
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
