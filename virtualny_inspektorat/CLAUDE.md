# CLAUDE.md — Vapor Temple Project Guide

## Project Overview

Browser-based 3D point-and-click adventure game with vaporwave aesthetics and early 90s VGA-era visuals. Scenes are defined declaratively in JSON — adding content requires no code changes, only new JSON scene files and assets.

## Running

Requires a local HTTP server (ES modules won't load from `file://`):

```bash
python3 -m http.server 8000
# or: npx serve .
```

- Game: `http://localhost:8000`
- Editor: `http://localhost:8000/editor.html`

No build step, no bundler. Game dependencies load from CDN via import maps. Dev dependencies (vitest, three) are in `node_modules` for testing only.

## Testing

```bash
npm install            # first time only
npm test               # vitest run — all tests
npm run test:watch     # vitest interactive mode
npm run test:coverage  # with v8 coverage
```

- 259 unit tests across 15 test files in `tests/unit/`
- Uses Vitest with jsdom environment
- `three@0.160.0` installed as devDependency (matching CDN version) — tests use real THREE math objects
- `tests/setup.js` stubs TextureLoader, DOM elements, AudioContext, pointer lock
- `vitest.config.js` aliases `'three'` import to `node_modules` so CDN import maps work in Node

## File Structure

```
├── index.html                 # Game shell — UI, dialogue box, HUD, title screen, CSS
├── editor.html                # WYSIWYG scene editor — toolbar, panels, modal, CSS
├── package.json               # Dev dependencies only (vitest, three for tests)
├── vitest.config.js           # Test runner config (jsdom, import aliases)
├── .gitignore                 # Excludes node_modules
├── js/
│   ├── shared/
│   │   ├── geometry.js        # GeometryBuilders factory + COMPOUND_TYPES (shared by game & editor)
│   │   ├── textures.js        # TEXTURE_REGISTRY, loadTexture(), TEXTURE_OPTIONS (shared)
│   │   └── materials.js       # createMaterial() (shared)
│   ├── constants.js           # Game constants (RENDER_WIDTH, PLAYER_HEIGHT, GRAVITY, etc.)
│   ├── shaders.js             # DitherShader, BloomShaders, PSX effects (GLSL post-processing)
│   ├── dialogue.js            # DialogueEngine class
│   ├── notifications.js       # NotificationSystem class
│   ├── collision.js           # CollisionSystem class (AABB)
│   ├── animation.js           # AnimationSystem class
│   ├── audio.js               # AudioSystem class (procedural Web Audio blips)
│   ├── scene-loader.js        # SceneLoader class (JSON → THREE.Scene)
│   ├── engine.js              # VaporwaveEngine class (main orchestrator)
│   ├── game.js                # Game entry point (imports engine, bootstraps)
│   ├── editor-commands.js     # UndoStack, TransformCommand, PropertyCommand, etc.
│   ├── editor-schema.js       # DEFAULT_PARAMS, PARAM_SCHEMA, DEFAULT_MATERIAL
│   ├── editor-utils.js        # round3(), escHtml()
│   └── editor.js              # SceneEditor class + bootstrap (editor entry point)
├── tests/
│   ├── setup.js               # Global test setup (THREE stubs, DOM elements)
│   └── unit/                  # 15 test files (259 tests)
├── scenes/
│   ├── temple_exterior.json   # Scene 1: temple on water with oracle riddle
│   └── temple_interior.json   # Scene 2: dark room with crystal altar
├── assets/
│   └── textures/              # Procedural tileable textures (64×64 PNG)
├── scripts/
│   └── generate_textures.py   # Python script to regenerate texture PNGs
├── README.md                  # User-facing docs, scene schema reference
└── CLAUDE.md                  # This file
```

## Architecture

### Module dependency graph

```
index.html ─► js/game.js (entry)
                └─► js/engine.js (VaporwaveEngine)
                      ├─► js/constants.js
                      ├─► js/shaders.js
                      ├─► js/dialogue.js ─► js/audio.js
                      ├─► js/notifications.js
                      ├─► js/collision.js
                      ├─► js/animation.js
                      └─► js/scene-loader.js
                            ├─► js/shared/geometry.js
                            └─► js/shared/materials.js ─► js/shared/textures.js

editor.html ─► js/editor.js (entry + SceneEditor)
                 ├─► js/editor-commands.js
                 ├─► js/shared/geometry.js
                 ├─► js/shared/textures.js
                 ├─► js/shared/materials.js
                 ├─► js/editor-schema.js
                 └─► js/editor-utils.js
```

### Shared modules (`js/shared/`)

These modules are imported by both the game and editor:

- **`geometry.js`** — `GeometryBuilders` factory object with primitives (`box`, `sphere`, `cylinder`, `cone`, `plane`, `torus`) and compound types (`column`, `stairs`, `pediment`, `head`, `water`). Also exports `COMPOUND_TYPES` array.
- **`textures.js`** — `TEXTURE_REGISTRY` mapping names to PNG paths, `loadTexture()` with NearestFilter + RepeatWrapping cache, `TEXTURE_OPTIONS` array for editor dropdowns.
- **`materials.js`** — `createMaterial(def)` converts JSON material def → `THREE.MeshStandardMaterial` (supports `texture`, `textureRepeat`, `emissive`, `transparent`, etc.)

### Game modules

- **`constants.js`** — All game constants: `RENDER_WIDTH=640`, `RENDER_HEIGHT=480`, `PLAYER_HEIGHT=1.6`, `GRAVITY=-15`, `STEP_HEIGHT=0.5`, etc.
- **`shaders.js`** — `DitherShader`, `BloomExtractShader`, `BloomBlurShader`, `BloomCompositeShader` GLSL post-processing; `applyPSXEffects()` for vertex jitter + affine warping; `chainOnBeforeCompile()` for composing material hooks
- **`dialogue.js`** — `DialogueEngine` class: typewriter text, branching choices, correct/incorrect riddle logic, callbacks
- **`notifications.js`** — `NotificationSystem` class: timed on-screen text messages
- **`collision.js`** — `CollisionSystem` class: AABB collision with ground detection, step-up for stairs, fall-through recovery
- **`animation.js`** — `AnimationSystem` class: declarative float/rotate/bob/pulse animations
- **`scene-loader.js`** — `SceneLoader` class: parses JSON → builds THREE.Scene with objects, lights, sky, fog, water, interactables, collision meshes
- **`engine.js`** — `VaporwaveEngine` class: main orchestrator — renderer setup, pointer lock FPS controls, player physics loop, interaction raycasting, scene transitions
- **`audio.js`** — `AudioSystem` class: procedural Web Audio typing blips (Animal Crossing style), lazy-init AudioContext
- **`game.js`** — Entry point: imports `VaporwaveEngine`, instantiates and calls `init()`

### Editor modules

- **`editor-commands.js`** — `UndoStack`, `TransformCommand`, `PropertyCommand`, `AddObjectCommand`, `DeleteObjectCommand` — command pattern for undo/redo
- **`editor-schema.js`** — `DEFAULT_PARAMS`, `DEFAULT_MATERIAL`, `PARAM_SCHEMA` for the inspector panel
- **`editor-utils.js`** — `round3()`, `escHtml()` utility functions
- **`editor.js`** — `SceneEditor` class + bootstrap: 3D viewport, OrbitControls + TransformControls, hierarchy panel, inspector panel, dialogue tree modal editor, spawn point visualization, scene-level settings, undo/redo

### Scene JSON format

Scenes are self-contained JSON files. Key top-level fields:

```
id, title, sky, fog, ambient, lights[], water, spawn, objects[]
```

Each object has: `id, type, params, position, rotation, scale, material, collision, collisionOptions, animation, interactable`

Interaction types: `dialogue`, `examine`, `trigger`, `pickup`
Action types: `transition` (scene change), `notify` (message), `setState` (game flag)

Full schema is documented in README.md.

## Code Conventions

- **No build system** — raw ES modules with CDN imports via `<script type="importmap">`
- **Three.js r160** from `cdn.jsdelivr.net`
- **Rotations** in JSON are degrees; converted to radians on load (`* Math.PI / 180`)
- **Y-up** coordinate system (Three.js default)
- **Flat shading** is default for all materials (low-poly aesthetic)
- **Textures** are 64×64 PNGs loaded with `NearestFilter` + `RepeatWrapping` for pixelated tiling. Color field tints the texture (set `"#ffffff"` for pure texture)
- **Compound geometry types** (`column`, `stairs`, `pediment`, `head`) return `THREE.Group` not `THREE.Mesh` — code must handle both via `obj.traverse()` or `obj.isMesh` checks
- **Collision** is AABB only — `THREE.Box3.setFromObject()`. Ground detection uses the box's `max.y` as the walkable surface
- **Player position** `.y` is eye height (1.6m), not feet. Spawn Y should be `floor_surface_Y + 1.6`

## Common Tasks

### Adding a new geometry type

1. Add builder function to `GeometryBuilders` in `js/shared/geometry.js`
2. If compound (returns Group), add the type name to `COMPOUND_TYPES` array in `js/shared/geometry.js`
3. Add param schema to `PARAM_SCHEMA` in `js/editor-schema.js` so the inspector shows the right fields
4. Add default params to `DEFAULT_PARAMS` in `js/editor-schema.js`

### Adding a new interaction type

1. Add handling in `VaporwaveEngine.handleInteraction()` in `js/engine.js`
2. Add inspector UI fields in `SceneEditor.refreshInspector()` in `js/editor.js` under the interaction section
3. Document the schema in README.md

### Adding a new animation type

1. Add the case in `SceneLoader.applyAnimation()` in `js/scene-loader.js`
2. Add the option to the select dropdown in `SceneEditor.refreshInspector()` animation section in `js/editor.js`

### Adding a new scene

Create `scenes/your_scene.json` following the schema. To link to it, add a transition action to an interactable in an existing scene:
```json
"onSuccess": { "type": "transition", "target": "your_scene" }
```
The engine loads scenes by fetching `scenes/{id}.json`.

### Debugging collision issues

- Spawn Y must be `floor_max_y + PLAYER_HEIGHT (1.6)` and within the horizontal bounds of a collision-enabled surface
- The `checkPosition()` method in `CollisionSystem` (`js/collision.js`) takes a `prevY` parameter for fall-through detection — if the player fell through a surface between frames, it snaps them back up
- Terminal velocity is clamped to -20 to prevent tunneling
- `STEP_HEIGHT` (0.5) controls the max height the player can auto-step onto without it being treated as a wall

### Adding a new texture

**Registration (required for all textures):**

1. Place a 64×64 PNG in `assets/textures/` (power-of-2 dimensions, must tile seamlessly)
2. Add an entry to `TEXTURE_REGISTRY` in `js/shared/textures.js`: `name: 'assets/textures/name.png'`
3. The editor dropdown (`TEXTURE_OPTIONS`) auto-populates from the registry keys
4. Use in scene JSON: `"material": { "texture": "name", "textureRepeat": [x, y] }`

**Generating procedural textures with `scripts/generate_textures.py`:**

The script uses only Python stdlib (`struct`, `zlib`, `math`, `random`) — no PIL/Pillow. It provides:

- `write_png(filename, width, height, pixels)` — writes a list of `(r, g, b)` tuples as a raw PNG
- `clamp(v)` — clamps to 0–255 int
- `make_perlin(seed)` — returns `(noise, turbulence)` functions for procedural patterns
  - `noise(x, y)` → float roughly in [-1, 1], tileable when coordinates wrap at integer boundaries
  - `turbulence(x, y, octaves=4)` → summed absolute-value noise, good for organic distortion

**To add a new generator function**, follow this pattern:

```python
def generate_grass():
    noise, turb = make_perlin(seed=YOUR_SEED)  # unique seed = unique pattern
    pixels = []
    for y in range(SIZE):
        for x in range(SIZE):
            nx, ny = x / SIZE, y / SIZE       # normalize to 0-1 for tiling
            val = noise(nx * 8, ny * 8)        # scale controls feature size
            val = (val + 1) / 2                # normalize to 0-1
            val = int(val * 6) / 6.0           # quantize for VGA look (fewer levels = chunkier)
            r, g, b = base + val * range       # map to color palette
            r = int(r / 8) * 8                 # channel quantization (~32 shades per channel)
            pixels.append((r, g, b))
    write_png(os.path.join(OUTDIR, 'grass.png'), SIZE, SIZE, pixels)
```

Then call it from `__main__` and run `python3 scripts/generate_textures.py`.

**Key techniques used in existing textures:**

| Technique | Used in | How |
|---|---|---|
| Vertical gradient | sky | `t = y / (SIZE-1)` as blend factor between two colors |
| Multi-octave noise clouds | sky | Sum noise at 1x + 0.5x + 0.25x frequencies, threshold to shape |
| Marble veining | marble | `sin(x_freq * pi + turbulence(x, y) * distortion)` |
| Vertical masking | sky | `sin(t * pi)` fades effect in/out by row |
| Color quantization | both | `int(v / step) * step` per channel — fewer levels = more VGA |

**VGA aesthetic guidelines:**
- Quantize to 5–8 value levels for chunky low-color look
- Quantize RGB channels in steps of 6–8 (gives ~32–42 shades per channel)
- Use `NearestFilter` (set automatically by `loadTexture()`) — never smooth/linear
- Keep textures small: 64×64 is ideal, 128×128 max
- Use the vaporwave palette from the color reference table below as base/accent colors

## Known Limitations

- No save/load game state (only scene transitions carry `gameState` object in memory)
- Collision is AABB only — no mesh-accurate collision
- No pathfinding or NPC movement

## Vaporwave Color Palette Reference

| Name | Hex | Typical use |
|---|---|---|
| Hot Pink | `#ff71ce` | Accent, glow, UI highlights |
| Cyan | `#01cdfe` | Accent, glow, eyes, spawn helper |
| Purple | `#b967ff` | Atmosphere, borders, UI |
| Yellow | `#fffb96` | Highlights, gold surfaces |
| Teal Green | `#05d9a6` | Nature, orbs |
| Deep Purple | `#1a0a2e` | Backgrounds, dark surfaces |
| Gold | `#c8b850` | Architecture (temple stone) |
