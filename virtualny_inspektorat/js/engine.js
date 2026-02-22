import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import {
  RENDER_WIDTH, RENDER_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS,
  MOVE_SPEED, MOUSE_SENSITIVITY, GRAVITY, JUMP_FORCE, INTERACT_DISTANCE,
  BOB_AMPLITUDE, BOB_FREQUENCY,
  ACCEL, DECEL, FRICTION,
  MAX_SLOPE_ANGLE, SLOPE_SLIDE_FORCE
} from './constants.js';
import { DitherShader, BloomExtractShader, BloomBlurShader, BloomCompositeShader } from './shaders.js';
import { SceneLoader } from './scene-loader.js';
import { DialogueEngine } from './dialogue.js';
import { NotificationSystem } from './notifications.js';
import { CollisionSystem } from './collision.js';
import { AnimationSystem } from './animation.js';

export class VaporwaveEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.cursor = document.getElementById('cursor');
    this.crosshair = document.getElementById('crosshair');
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
      moveVelocity: new THREE.Vector3(), // Smoothed horizontal movement
      yaw: 0,
      pitch: 0,
      onGround: false,
      canMove: true,
      bobTimer: 0
    };

    // Input state
    this.keys = {};
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0 };

    // Raycaster for interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 50;

    this.currentSceneId = null;
    this.gameState = {};  // Persistent state across scenes

    // Trigger tracking
    this._activeTriggers = new Set();

    // Brightness (gamma)
    this.gamma = parseFloat(localStorage.getItem('brightness') || '1.2');
  }

  async init() {
    this.setupRenderer();
    this.setupControls();
    this.setupPostProcessing();

    // Show title screen
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('title-screen').style.display = 'flex';

    // Brightness slider
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
      brightnessSlider.value = this.gamma;
      document.getElementById('brightness-value').textContent = this.gamma.toFixed(1);
      brightnessSlider.addEventListener('input', (e) => {
        this.gamma = parseFloat(e.target.value);
        localStorage.setItem('brightness', this.gamma.toFixed(2));
        document.getElementById('brightness-value').textContent = this.gamma.toFixed(1);
      });
    }

    const startGame = async (sceneId) => {
      document.getElementById('title-screen').style.display = 'none';
      await this.loadScene(sceneId);
      this.gameLoop();
    };

    document.getElementById('start-btn').addEventListener('click', () => startGame('temple_exterior'));

    document.querySelectorAll('.scene-btn').forEach(btn => {
      btn.addEventListener('click', () => startGame(btn.dataset.scene));
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

  rebuildComposer(postProcessing) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(RENDER_WIDTH, RENDER_HEIGHT);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass (extract bright pixels → blur → composite)
    const bloomExtract = new ShaderPass(BloomExtractShader);
    bloomExtract.uniforms.threshold.value = postProcessing?.bloomThreshold ?? 0.7;

    const bloomRT = new THREE.WebGLRenderTarget(RENDER_WIDTH / 2, RENDER_HEIGHT / 2);
    this._bloomRT = bloomRT;

    // We use a separate mini-composer for bloom blur
    this._bloomComposer = new EffectComposer(this.renderer, bloomRT);
    this._bloomComposer.renderToScreen = false;
    this._bloomComposer.addPass(new RenderPass(this.scene, this.camera));
    this._bloomComposer.addPass(bloomExtract);

    const blurH = new ShaderPass(BloomBlurShader);
    blurH.uniforms.direction.value.set(1.0, 0.0);
    blurH.uniforms.resolution.value.set(RENDER_WIDTH / 2, RENDER_HEIGHT / 2);
    this._bloomComposer.addPass(blurH);

    const blurV = new ShaderPass(BloomBlurShader);
    blurV.uniforms.direction.value.set(0.0, 1.0);
    blurV.uniforms.resolution.value.set(RENDER_WIDTH / 2, RENDER_HEIGHT / 2);
    this._bloomComposer.addPass(blurV);

    // Main composite: merge bloom into main render
    const bloomComposite = new ShaderPass(BloomCompositeShader);
    bloomComposite.uniforms.tBloom.value = bloomRT.texture;
    bloomComposite.uniforms.bloomStrength.value = postProcessing?.bloomStrength ?? 0.4;
    this.composer.addPass(bloomComposite);
    this._bloomCompositePass = bloomComposite;

    // Dither pass with per-scene tuning
    const ditherPass = new ShaderPass(DitherShader);
    ditherPass.uniforms.resolution.value.set(RENDER_WIDTH, RENDER_HEIGHT);

    // Apply per-scene overrides
    if (postProcessing) {
      if (postProcessing.ditherIntensity !== undefined)
        ditherPass.uniforms.ditherIntensity.value = postProcessing.ditherIntensity;
      if (postProcessing.colorLevels !== undefined)
        ditherPass.uniforms.colorDepth.value = postProcessing.colorLevels;
      if (postProcessing.chromaticAberration !== undefined)
        ditherPass.uniforms.chromaticAberration.value = postProcessing.chromaticAberration;
      if (postProcessing.vignette !== undefined)
        ditherPass.uniforms.vignette.value = postProcessing.vignette;
    }

    ditherPass.uniforms.gamma.value = this.gamma;

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
        this.crosshair.style.display = 'block';
      } else {
        this.cursor.classList.remove('hidden');
        this.crosshair.style.display = 'none';
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
    this._activeTriggers.clear();

    const result = await this.sceneLoader.loadScene(sceneId);
    if (!result) {
      console.error('Failed to load scene:', sceneId);
      transition.classList.remove('active');
      return;
    }

    this.scene = result.scene;
    this.interactables = result.interactables;
    this.currentSceneId = sceneId;

    // Fog culling — match camera far plane to fog distance
    if (result.data.fog) {
      this.camera.far = result.data.fog.far || 60;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.far = 200;
      this.camera.updateProjectionMatrix();
    }

    // Setup collision
    for (const { object, options } of result.collisionMeshes) {
      if (options.terrain) {
        if (object.isMesh) {
          object.updateMatrixWorld(true);
          this.collision.addTerrain(object);
        }
      } else if (options.trigger) {
        // Trigger zones: add all meshes (or the group's bounding box)
        object.updateMatrixWorld(true);
        if (object.isMesh) {
          this.collision.addBox(object, options);
        } else {
          // For groups, create a single bounding box for the trigger
          object.traverse((child) => {
            if (child.isMesh) {
              this.collision.addBox(child, options);
            }
          });
        }
      } else if (object.isMesh) {
        this.collision.addBox(object, options);
      } else {
        // For groups, ensure world matrices are computed before extracting bounding boxes
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
    this.player.moveVelocity.set(0, 0, 0);
    if (spawn.rotation) {
      this.player.yaw = (spawn.rotation[1] || 0) * Math.PI / 180;
      this.player.pitch = (spawn.rotation[0] || 0) * Math.PI / 180;
    }
    this.player.onGround = false;
    this.player.bobTimer = 0;

    // Rebuild post-processing with per-scene tuning
    this.rebuildComposer(result.postProcessing);

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

  // Check requires — supports string (single key) or object with all/any arrays
  checkRequires(requires) {
    if (!requires) return true;

    // Simple string check (backward compatible)
    if (typeof requires === 'string') {
      return !!this.gameState[requires];
    }

    // Object with all/any arrays
    if (requires.all) {
      return requires.all.every(key => !!this.gameState[key]);
    }
    if (requires.any) {
      return requires.any.some(key => !!this.gameState[key]);
    }

    return true;
  }

  handleInteraction() {
    if (!this.hoveredInteractable) return;
    const inter = this.hoveredInteractable;

    if (inter.data.requires && !this.checkRequires(inter.data.requires)) {
      this.notifications.show(inter.data.requiresText || 'Something is missing...', 2500);
      return;
    }

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
      const examText = inter.data.text || inter.data.examineText || 'Nothing special.';
      const examDur = Math.max(3000, examText.length * 40);
      this.notifications.show(examText, examDur);
    } else if (inter.type === 'trigger') {
      this.handleAction(inter.data.action);
    } else if (inter.type === 'pickup') {
      this.notifications.show(`Picked up: ${inter.data.itemName || 'item'}`, 2000);
      this.gameState[inter.data.stateKey || inter.id] = true;
      inter.object.visible = false;
      this.updateConditionalVisibility();
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
      this.updateConditionalVisibility();
    }
  }

  // Re-evaluate visibleWhen/hiddenWhen for all objects in the scene
  updateConditionalVisibility() {
    if (!this.scene) return;
    this.scene.traverse((obj) => {
      const rule = obj.userData.visibilityRule;
      if (!rule) return;
      if (rule.visibleWhen) {
        obj.visible = !!this.gameState[rule.visibleWhen];
      } else if (rule.hiddenWhen) {
        obj.visible = !this.gameState[rule.hiddenWhen];
      }
    });
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

    // Movement direction (target velocity)
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

    const targetDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) targetDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) targetDir.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetDir.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetDir.add(right);

    const isMoving = targetDir.lengthSq() > 0;
    const targetVelocity = new THREE.Vector3();
    if (isMoving) {
      targetDir.normalize();
      targetVelocity.copy(targetDir).multiplyScalar(MOVE_SPEED);
    }

    // Momentum: lerp toward target velocity
    const accelFactor = isMoving ? ACCEL : DECEL;
    const lerpFactor = 1 - Math.exp(-accelFactor * delta);
    this.player.moveVelocity.lerp(targetVelocity, lerpFactor);

    // Apply friction when stopping
    if (!isMoving && this.player.moveVelocity.lengthSq() > 0) {
      const frictionFactor = Math.exp(-FRICTION * delta);
      this.player.moveVelocity.multiplyScalar(frictionFactor);
      // Snap to zero when very slow
      if (this.player.moveVelocity.lengthSq() < 0.001) {
        this.player.moveVelocity.set(0, 0, 0);
      }
    }

    const moveDir = this.player.moveVelocity.clone().multiplyScalar(delta);

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

    // Slope sliding
    if (check.slopeNormal && check.groundY > -Infinity) {
      const slopeAngle = Math.acos(Math.min(1, check.slopeNormal.y)) * 180 / Math.PI;
      if (slopeAngle > MAX_SLOPE_ANGLE) {
        // Apply slide force along the slope
        const slideDir = new THREE.Vector3(
          check.slopeNormal.x,
          0,
          check.slopeNormal.z
        ).normalize();
        const slideFactor = (slopeAngle - MAX_SLOPE_ANGLE) / 90 * SLOPE_SLIDE_FORCE * delta;
        newPos.x += slideDir.x * slideFactor;
        newPos.z += slideDir.z * slideFactor;
      }
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
        this.player.moveVelocity.set(0, 0, 0);
      } else {
        newPos.y = PLAYER_HEIGHT + 5;
        this.player.velocity.y = 0;
      }
    } else {
      this.player.onGround = false;
    }

    this.player.position.copy(newPos);

    // Process trigger zones
    if (check.triggeredIds && check.triggeredIds.length > 0) {
      for (const triggerId of check.triggeredIds) {
        if (!this._activeTriggers.has(triggerId)) {
          this._activeTriggers.add(triggerId);
          this.fireTrigger(triggerId);
        }
      }
    }
    // Clear triggers the player has left
    for (const id of this._activeTriggers) {
      if (!check.triggeredIds || !check.triggeredIds.includes(id)) {
        this._activeTriggers.delete(id);
      }
    }

    // Update camera
    this.camera.position.copy(this.player.position);

    // Head bob when moving and on ground
    const moving = this.player.moveVelocity.lengthSq() > 0.5;
    if (moving && this.player.onGround) {
      this.player.bobTimer += delta * BOB_FREQUENCY;
      this.camera.position.y += Math.sin(this.player.bobTimer) * BOB_AMPLITUDE;
      this.camera.position.x += Math.cos(this.player.bobTimer * 0.5) * BOB_AMPLITUDE * 0.5;
    } else {
      // Smoothly decay bob timer
      this.player.bobTimer *= 0.9;
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;
  }

  // Fire a trigger zone event
  fireTrigger(triggerId) {
    // Find the interactable associated with this trigger
    for (const inter of this.interactables) {
      if (inter.id === triggerId && inter.object.visible) {
        if (inter.data.requires && !this.checkRequires(inter.data.requires)) {
          return; // Requirements not met
        }
        if (inter.type === 'trigger' && inter.data.action) {
          this.handleAction(inter.data.action);
        } else if (inter.type === 'dialogue') {
          document.exitPointerLock();
          this.dialogue.start(inter.data.dialogue, (result) => {
            if (result === 'success' && inter.data.onSuccess) {
              this.handleAction(inter.data.onSuccess);
            } else if (result === 'completed' && inter.data.onComplete) {
              this.handleAction(inter.data.onComplete);
            }
            setTimeout(() => {
              if (!this.dialogueActive) {
                this.canvas.requestPointerLock();
              }
            }, 100);
          });
        } else if (inter.type === 'examine') {
          const trigExamText = inter.data.text || inter.data.examineText || '';
          this.notifications.show(trigExamText, Math.max(3000, trigExamText.length * 40));
        }
      }
    }
  }

  updateInteractionCheck() {
    if (this.dialogueActive || !this.pointerLocked) {
      this.hoveredInteractable = null;
      this.cursor.classList.remove('interact');
      this.crosshair.classList.remove('interact');
      return;
    }

    // Cast ray from center of screen (crosshair)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    let closestDist = Infinity;
    let closest = null;

    for (const inter of this.interactables) {
      if (!inter.object.visible) continue;
      const maxDist = inter.data.interactDistance || INTERACT_DISTANCE;
      const objects = [];
      inter.object.traverse((child) => {
        if (child.isMesh) objects.push(child);
      });
      if (inter.object.isMesh) objects.push(inter.object);

      const hits = this.raycaster.intersectObjects(objects, false);
      if (hits.length > 0 && hits[0].distance <= maxDist && hits[0].distance < closestDist) {
        closestDist = hits[0].distance;
        closest = inter;
      }
    }

    this.hoveredInteractable = closest;

    // Update crosshair / notification
    if (closest && this.pointerLocked) {
      this.crosshair.classList.add('interact');
      // Show interaction hint
      this.notifications.show(closest.hoverText, 500);
    } else {
      this.crosshair.classList.remove('interact');
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

      // Update dither shader uniforms
      if (this.ditherPass) {
        this.ditherPass.uniforms.time.value = time;
        this.ditherPass.uniforms.gamma.value = this.gamma;
      }

      // Render bloom pass
      if (this._bloomComposer && this.scene && this.camera) {
        this._bloomComposer.render();
      }

      // Render main pass
      if (this.scene && this.camera) {
        this.composer.render();
      }
    };

    animate();
  }
}
