# V A P O R · T E M P L E

A browser-based 3D point-and-click adventure game engine with vaporwave aesthetics and early 90s 3D visuals.

## Quick Start

This project requires a local HTTP server (ES modules don't load from `file://`).

```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Controls

| Input | Action |
|-------|--------|
| Click on game | Lock mouse / enter game |
| WASD / Arrow keys | Move |
| Mouse | Look around |
| Left Click | Interact with highlighted objects |
| Space | Jump |
| Escape | Release mouse cursor |

## Project Structure

```
vaporwave-game/
├── index.html              # Main page with UI elements
├── js/
│   └── game.js             # Complete game engine
├── scenes/
│   ├── temple_exterior.json  # First scene (also embedded in engine)
│   └── temple_interior.json  # Second scene (also embedded in engine)
└── README.md
```

## Architecture

### Engine Components

| System | Description |
|--------|-------------|
| **Renderer** | Three.js with 640×480 render target, scaled to fill screen |
| **Post-Processing** | Bayer 8×8 ordered dithering, color quantization, chromatic aberration, vignette |
| **Scene Loader** | Parses JSON scene definitions into Three.js scene graphs |
| **Controls** | First-person WASD + mouse look with pointer lock |
| **Collision** | AABB-based collision with step-up for stairs |
| **Interaction** | Raycasting from camera center; click to interact |
| **Dialogue** | Typewriter text, branching choices, riddles with success/failure |
| **Animation** | Float, rotate, bob, pulse — all declarative via JSON |
| **Notifications** | Transient on-screen messages |
| **Transitions** | Fade-to-black between scenes |

### Adding New Scenes

Create a new `.json` file in `/scenes/` following the schema below. The engine will load it by ID. To trigger a transition to your scene, add an `onSuccess` or `onComplete` action to an interactable in an existing scene:

```json
"onSuccess": { "type": "transition", "target": "your_scene_id" }
```

## Scene JSON Schema

```jsonc
{
  // Required
  "id": "scene_id",           // Unique identifier (matches filename without .json)

  // Optional metadata
  "title": "SCENE TITLE",     // Shown as notification on entry

  // Sky / background
  "sky": {
    "type": "gradient",        // "gradient" or omit for solid
    "stops": [[0, "#color"], [1, "#color"]],  // Gradient stops [position, color]
    // OR for solid:
    "color": "#0a0a2e"
  },

  // Fog
  "fog": {
    "color": "#1a4a6a",
    "near": 10,                // Start distance
    "far": 60                  // End distance
  },

  // Ambient light
  "ambient": {
    "color": "#4488aa",
    "intensity": 0.4
  },

  // Lights array
  "lights": [
    {
      "type": "directional",   // directional | point | hemisphere
      "color": "#ffffff",
      "intensity": 1.0,
      "position": [x, y, z],
      "castShadow": true       // Only for directional
    },
    {
      "type": "point",
      "color": "#ff71ce",
      "intensity": 0.8,
      "distance": 15,          // Falloff distance
      "position": [x, y, z]
    },
    {
      "type": "hemisphere",
      "skyColor": "#aabbcc",
      "groundColor": "#332211",
      "intensity": 0.5
    }
  ],

  // Water plane (optional)
  "water": {
    "width": 200,
    "height": 200,
    "level": -2,               // Y position
    "color": "#2244aa"
  },

  // Player spawn
  "spawn": {
    "position": [x, y, z],    // Y should be ~1.6 (player height) above floor
    "rotation": [pitch, yaw, roll]  // In degrees
  },

  // Objects array
  "objects": [
    // See Object Schema below
  ]
}
```

## Object Schema

```jsonc
{
  "id": "unique_id",          // Required for interactables

  // Geometry type
  "type": "box",              // See Geometry Types below
  "params": { ... },          // Type-specific parameters

  // Transform
  "position": [x, y, z],     // World position
  "rotation": [rx, ry, rz],  // Rotation in degrees
  "scale": 1.0,              // Uniform scale (number) or [sx, sy, sz]

  // Material
  "material": {
    "color": "#c8b850",       // Base color (hex) — tints texture if present
    "emissive": "#ff71ce",    // Glow color
    "emissiveIntensity": 0.5,
    "metalness": 0.1,         // 0-1
    "roughness": 0.8,         // 0-1
    "transparent": false,
    "opacity": 1.0,
    "wireframe": false,
    "flatShading": true,      // Default true for low-poly look
    "side": "double",         // "double" for double-sided rendering
    "texture": "marble",      // Texture name from registry (sky, marble)
    "textureRepeat": [4, 2]   // UV tiling [x, y], default [1, 1]
  },

  // Physics
  "collision": true,          // Enable AABB collision
  "collisionOptions": {
    "walkable": true,         // Can be walked on
    "isStairs": true          // Step-up behavior
  },

  // Animation (optional)
  "animation": {
    "type": "float",          // float | rotate | bob | pulse
    "speed": 1.0,
    "amplitude": 0.5,
    "offset": 0,              // Phase offset
    "axis": "y"               // For rotate: x | y | z
  },

  // Interaction (optional)
  "interactable": {
    "type": "dialogue",       // dialogue | examine | trigger | pickup
    "hoverText": "Click me",  // Shown when looking at object
    // ... type-specific data (see below)
  }
}
```

## Geometry Types

### Primitives

| Type | Params |
|------|--------|
| `box` | `width`, `height`, `depth`, `segments: [w, h, d]` |
| `cylinder` | `radius` (or `radiusTop`/`radiusBottom`), `height`, `segments` |
| `sphere` | `radius`, `widthSegments`, `heightSegments` |
| `plane` | `width`, `height` |
| `cone` | `radius`, `height`, `segments` |
| `torus` | `radius`, `tube`, `radialSegments`, `tubularSegments` |

### Compound Types

| Type | Params | Description |
|------|--------|-------------|
| `column` | `radius`, `height` | Greek column with capital and base |
| `stairs` | `steps`, `stepWidth`, `stepHeight`, `stepDepth` | Ascending staircase |
| `pediment` | `width`, `height`, `depth` | Triangular Greek roof element |
| `head` | `scale`, `eyeMaterial` | Sculptural head with eyes and mouth |

### Groups

```jsonc
{
  "type": "group",
  "children": [
    { "type": "box", ... },
    { "type": "sphere", ... }
  ]
}
```

## Interaction Types

### Dialogue

```jsonc
"interactable": {
  "type": "dialogue",
  "hoverText": "☉ Speak to NPC",
  "dialogue": {
    "nodes": [
      {
        "speaker": "NPC NAME",
        "text": "What the NPC says...",
        "next": 1                    // Go to node index 1
      },
      {
        "speaker": "NPC NAME",
        "text": "A question?",
        "choices": [
          {
            "text": "Answer A",
            "correct": true,         // For riddles
            "response": "Correct!"   // Shown before success action
          },
          {
            "text": "Answer B",
            "correct": false,
            "response": "Wrong..."   // Shown, then re-asks
          },
          {
            "text": "Answer C",
            "goto": 0                // Jump to node index 0
          }
        ]
      }
    ]
  },
  "onSuccess": { "type": "transition", "target": "next_scene" },
  "onComplete": { "type": "notify", "text": "Dialogue finished" }
}
```

### Examine

```jsonc
"interactable": {
  "type": "examine",
  "hoverText": "✧ Look at this",
  "examineText": "A description of what you see..."
}
```

### Trigger

```jsonc
"interactable": {
  "type": "trigger",
  "hoverText": "⬡ Activate",
  "action": { "type": "transition", "target": "another_scene" }
}
```

### Pickup

```jsonc
"interactable": {
  "type": "pickup",
  "hoverText": "⊕ Pick up key",
  "itemName": "Golden Key",
  "stateKey": "has_key"           // Stored in gameState
}
```

## Action Types

| Action | Params | Description |
|--------|--------|-------------|
| `transition` | `target: "scene_id"` | Load a new scene |
| `notify` | `text`, `duration` | Show a notification |
| `setState` | `key`, `value` | Set a game state variable |

## Visual Style Guide

### Vaporwave Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Hot Pink | `#ff71ce` | Accent, glow, UI |
| Cyan | `#01cdfe` | Accent, glow, eyes |
| Purple | `#b967ff` | Atmosphere, borders |
| Yellow | `#fffb96` | Highlight, gold |
| Teal Green | `#05d9a6` | Nature, orbs |
| Deep Purple | `#1a0a2e` | Backgrounds |
| Gold | `#c8b850` | Architecture |

### Low-Poly Tips

- Keep segment counts low: 6-10 for cylinders/spheres
- Use `flatShading: true` (default) for faceted look
- The dithering shader handles color banding automatically
- Emissive materials create the neon glow effect
- Use fog to limit draw distance and add atmosphere

## Technical Notes

- Renders at 640×480, scaled to fill window (pixelated)
- Uses Bayer 8×8 ordered dithering for authentic retro look
- Chromatic aberration and vignette for CRT feel
- Scanline overlay via CSS
- Scenes can be embedded in `game.js` or loaded from `/scenes/*.json`
- Pointer lock API for FPS-style mouse look
- All collision is AABB (axis-aligned bounding boxes)

## Browser Requirements

- Modern browser with WebGL2 support
- ES Module support (Chrome 61+, Firefox 60+, Safari 11+)
- Pointer Lock API support

## License

MIT
