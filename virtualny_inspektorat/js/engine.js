import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import {
  RENDER_WIDTH, RENDER_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS,
  MOVE_SPEED, MOUSE_SENSITIVITY, GRAVITY, JUMP_FORCE, INTERACT_DISTANCE
} from './constants.js';
import { DitherShader } from './shaders.js';
import { SceneLoader } from './scene-loader.js';
import { DialogueEngine } from './dialogue.js';
import { NotificationSystem } from './notifications.js';
import { CollisionSystem } from './collision.js';
import { AnimationSystem } from './animation.js';

export class VaporwaveEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.cursor = document.getElementById('cursor');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.clock = new THREE.Clock();

    this.sceneLoader = new SceneLoader(this);
    this.dialogue = new DialogueEngine(this);
    this.notifications = new NotificationSystem();
    this.collision = new CollisionSystem();
    this.animations = new AnimationSystem();

    this.dialogueActive = false;
    this.pointerLocked = false;
    this.interactables = [];
    this.hoveredInteractable = null;

    // Player state
    this.player = {
      position: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      onGround: false,
      canMove: true
    };

    // Input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };

    // Raycaster for interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = INTERACT_DISTANCE;

    this.currentSceneId = null;
    this.gameState = {};  // Persistent state across scenes
  }

  async init() {
    this.setupRenderer();
    this.setupControls();
    this.setupPostProcessing();

    // Show title screen
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('title-screen').style.display = 'flex';

    document.getElementById('start-btn').addEventListener('click', async () => {
      document.getElementById('title-screen').style.display = 'none';
      await this.loadScene('temple_exterior');
      this.gameLoop();
    });
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Blocky shadows for retro feel
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scale canvas to fill window while maintaining aspect
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 200);
  }

  resizeCanvas() {
    const aspect = RENDER_WIDTH / RENDER_HEIGHT;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (w / h > aspect) {
      w = h * aspect;
    } else {
      h = w / aspect;
    }
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
    this.canvas.style.top = `${Math.floor((window.innerHeight - h) / 2)}px`;
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    // We'll set up passes after scene is loaded
  }

  rebuildComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(RENDER_WIDTH, RENDER_HEIGHT);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const ditherPass = new ShaderPass(DitherShader);
    ditherPass.uniforms.resolution.value.set(RENDER_WIDTH, RENDER_HEIGHT);
    this.composer.addPass(ditherPass);
    this.ditherPass = ditherPass;
  }

  setupControls() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape' && this.pointerLocked) {
        document.exitPointerLock();
      }
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse movement (both pointer lock and free cursor)
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (this.pointerLocked && !this.dialogueActive) {
        this.mouse.dx = e.movementX;
        this.mouse.dy = e.movementY;
      }

      // Update custom cursor position
      this.cursor.style.left = e.clientX + 'px';
      this.cursor.style.top = e.clientY + 'px';
    });

    // Click to interact / lock pointer
    this.canvas.addEventListener('click', (e) => {
      if (this.dialogueActive) return;

      if (!this.pointerLocked) {
        this.canvas.requestPointerLock();
        return;
      }

      // Check for interaction
      this.handleInteraction();
    });

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.pointerLocked) {
        this.cursor.classList.add('hidden');
      } else {
        this.cursor.classList.remove('hidden');
      }
    });
  }

  async loadScene(sceneId) {
    const transition = document.getElementById('transition');
    transition.classList.add('active');

    await new Promise(r => setTimeout(r, 800));

    // Clear old scene
    this.collision.clear();
    this.animations.clear();
    this.interactables = [];

    const result = await this.sceneLoader.loadScene(sceneId);
    if (!result) {
      console.error('Failed to load scene:', sceneId);
      transition.classList.remove('active');
      return;
    }

    this.scene = result.scene;
    this.interactables = result.interactables;
    this.currentSceneId = sceneId;

    // Setup collision
    for (const { object, options } of result.collisionMeshes) {
      if (object.isMesh) {
        this.collision.addBox(object, options);
      } else {
        // For groups, ensure world matrices are computed before extracting bounding boxes
        // (setFromObject uses updateWorldMatrix(false,false) which won't update parents)
        object.updateMatrixWorld(true);
        object.traverse((child) => {
          if (child.isMesh) {
            this.collision.addBox(child, options);
          }
        });
      }
    }

    // Set player spawn
    const spawn = result.spawnPoint;
    this.player.position.set(...spawn.position);
    this.player.velocity.set(0, 0, 0);
    if (spawn.rotation) {
      this.player.yaw = (spawn.rotation[1] || 0) * Math.PI / 180;
      this.player.pitch = (spawn.rotation[0] || 0) * Math.PI / 180;
    }
    this.player.onGround = false;

    // Rebuild post-processing
    this.rebuildComposer();

    await new Promise(r => setTimeout(r, 400));
    transition.classList.remove('active');

    // Show scene title
    if (result.data.title) {
      this.notifications.show(result.data.title, 4000);
    }

    // Trigger start dialogue after transition fade-out completes (0.8s CSS transition).
    // Uses setTimeout so loadScene returns immediately, allowing gameLoop to start rendering.
    if (result.data.onStart?.dialogue) {
      const onStartData = result.data.onStart;
      setTimeout(() => {
        this.dialogue.start(onStartData.dialogue, (dlgResult) => {
          if (dlgResult === 'success' && onStartData.onSuccess) {
            this.handleAction(onStartData.onSuccess);
          } else if (dlgResult === 'completed' && onStartData.onComplete) {
            this.handleAction(onStartData.onComplete);
          }
          setTimeout(() => {
            if (!this.dialogueActive) {
              this.canvas.requestPointerLock();
            }
          }, 100);
        });
      }, 900);
    }
  }

  handleInteraction() {
    if (!this.hoveredInteractable) return;
    const inter = this.hoveredInteractable;

    if (inter.type === 'dialogue') {
      // Exit pointer lock for dialogue
      document.exitPointerLock();
      this.dialogue.start(inter.data.dialogue, (result) => {
        if (result === 'success' && inter.data.onSuccess) {
          this.handleAction(inter.data.onSuccess);
        } else if (result === 'completed' && inter.data.onComplete) {
          this.handleAction(inter.data.onComplete);
        }
        // Re-lock pointer after dialogue
        setTimeout(() => {
          if (!this.dialogueActive) {
            this.canvas.requestPointerLock();
          }
        }, 100);
      });
    } else if (inter.type === 'examine') {
      this.notifications.show(inter.data.examineText || 'Nothing special.', 3000);
    } else if (inter.type === 'trigger') {
      this.handleAction(inter.data.action);
    } else if (inter.type === 'pickup') {
      this.notifications.show(`Picked up: ${inter.data.itemName || 'item'}`, 2000);
      this.gameState[inter.data.stateKey || inter.id] = true;
      inter.object.visible = false;
    }
  }

  handleAction(action) {
    if (!action) return;
    if (action.type === 'transition') {
      this.loadScene(action.target);
    } else if (action.type === 'notify') {
      this.notifications.show(action.text, action.duration || 3000);
    } else if (action.type === 'setState') {
      this.gameState[action.key] = action.value;
    }
  }

  updatePlayer(delta) {
    if (!this.player.canMove || this.dialogueActive) return;

    // Mouse look
    if (this.pointerLocked) {
      this.player.yaw -= this.mouse.dx * MOUSE_SENSITIVITY;
      this.player.pitch -= this.mouse.dy * MOUSE_SENSITIVITY;
      this.player.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.player.pitch));
      this.mouse.dx = 0;
      this.mouse.dy = 0;
    }

    // Movement
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(
      -Math.sin(this.player.yaw),
      0,
      -Math.cos(this.player.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.player.yaw),
      0,
      -Math.sin(this.player.yaw)
    );

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(MOVE_SPEED * delta);
    }

    // Gravity (clamped to prevent tunneling)
    this.player.velocity.y += GRAVITY * delta;
    this.player.velocity.y = Math.max(this.player.velocity.y, -20);

    // Jump
    if (this.keys['Space'] && this.player.onGround) {
      this.player.velocity.y = JUMP_FORCE;
      this.player.onGround = false;
    }

    // Store previous Y for penetration detection
    const prevY = this.player.position.y;

    // Apply horizontal movement
    const newPos = this.player.position.clone();
    newPos.x += moveDir.x;
    newPos.z += moveDir.z;
    newPos.y += this.player.velocity.y * delta;

    // Collision detection (pass previous Y for fall-through detection)
    const check = this.collision.checkPosition(newPos, PLAYER_RADIUS, PLAYER_HEIGHT, prevY);

    if (check.collided) {
      newPos.x += check.pushback.x;
      newPos.z += check.pushback.z;
    }

    // Ground check — snap to ground if close enough
    if (check.groundY > -Infinity) {
      const targetY = check.groundY + PLAYER_HEIGHT;
      if (newPos.y <= targetY + 0.1) {
        newPos.y = targetY;
        this.player.velocity.y = 0;
        this.player.onGround = true;
      }
    } else if (newPos.y < -10) {
      // Fell off the world — reset
      const spawn = this.sceneLoader.sceneCache[this.currentSceneId]?.spawn;
      if (spawn) {
        newPos.set(...spawn.position);
        this.player.velocity.set(0, 0, 0);
      } else {
        newPos.y = PLAYER_HEIGHT + 5;
        this.player.velocity.y = 0;
      }
    } else {
      this.player.onGround = false;
    }

    this.player.position.copy(newPos);

    // Update camera
    this.camera.position.copy(this.player.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;
  }

  updateInteractionCheck() {
    if (this.dialogueActive || !this.pointerLocked) {
      this.hoveredInteractable = null;
      this.cursor.classList.remove('interact');
      return;
    }

    // Cast ray from center of screen (crosshair)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    let closestDist = Infinity;
    let closest = null;

    for (const inter of this.interactables) {
      if (!inter.object.visible) continue;
      const objects = [];
      inter.object.traverse((child) => {
        if (child.isMesh) objects.push(child);
      });
      if (inter.object.isMesh) objects.push(inter.object);

      const hits = this.raycaster.intersectObjects(objects, false);
      if (hits.length > 0 && hits[0].distance < closestDist) {
        closestDist = hits[0].distance;
        closest = inter;
      }
    }

    this.hoveredInteractable = closest;

    // Update cursor / notification
    if (closest && this.pointerLocked) {
      // Show interaction hint
      this.notifications.show(closest.hoverText, 500);
    }
  }

  updateWater(time) {
    if (!this.scene) return;
    this.scene.traverse((child) => {
      if (child.userData.isWater) {
        // Simple wave animation
        const positions = child.geometry.attributes.position;
        const original = child.geometry.userData.original ||
          Float32Array.from(positions.array);
        child.geometry.userData.original = original;

        for (let i = 0; i < positions.count; i++) {
          const x = original[i * 3];
          const z = original[i * 3 + 1]; // It's rotated, so Y in geometry = Z in world
          positions.array[i * 3 + 2] = Math.sin(x * 0.3 + time) * 0.15 +
            Math.cos(z * 0.2 + time * 0.7) * 0.1;
        }
        positions.needsUpdate = true;
      }
    });
  }

  gameLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.getElapsedTime();

      // Update systems
      this.updatePlayer(delta);
      this.updateInteractionCheck();
      this.animations.tick(time, delta);
      this.updateWater(time);

      // Update dither shader time
      if (this.ditherPass) {
        this.ditherPass.uniforms.time.value = time;
      }

      // Render
      if (this.scene && this.camera) {
        this.composer.render();
      }
    };

    animate();
  }
}
