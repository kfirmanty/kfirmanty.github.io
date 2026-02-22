import * as THREE from 'three';
import { RENDER_WIDTH, RENDER_HEIGHT } from './constants.js';

export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(RENDER_WIDTH, RENDER_HEIGHT) },
    ditherIntensity: { value: 0.08 },
    colorDepth: { value: 32.0 },
    chromaticAberration: { value: 0.0008 },
    vignette: { value: 0.4 },
    time: { value: 0.0 },
    gamma: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float ditherIntensity;
    uniform float colorDepth;
    uniform float chromaticAberration;
    uniform float vignette;
    uniform float time;
    uniform float gamma;
    varying vec2 vUv;

    // 8x8 Bayer matrix for ordered dithering
    float bayer8(vec2 p) {
      ivec2 ip = ivec2(mod(p, 8.0));
      int index = ip.x + ip.y * 8;
      // Bayer 8x8 pattern
      int b8[64] = int[64](
         0, 32,  8, 40,  2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
         3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21
      );
      return float(b8[index]) / 64.0 - 0.5;
    }

    void main() {
      vec2 pixelPos = vUv * resolution;
      vec4 color = texture2D(tDiffuse, vUv);

      // Apply Bayer dithering
      float dither = bayer8(pixelPos) * ditherIntensity;
      color.rgb += dither;

      // Quantize colors to limited palette
      color.rgb = floor(color.rgb * colorDepth + 0.5) / colorDepth;

      // Slight color aberration for CRT feel
      float r = texture2D(tDiffuse, vUv + vec2(chromaticAberration, 0.0)).r;
      float b = texture2D(tDiffuse, vUv - vec2(chromaticAberration, 0.0)).b;
      color.r = floor((color.r * 0.7 + r * 0.3) * colorDepth + 0.5) / colorDepth;
      color.b = floor((color.b * 0.7 + b * 0.3) * colorDepth + 0.5) / colorDepth;

      // Vignette
      float dist = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - dist * vignette;

      // Gamma brightness correction
      color.rgb = pow(clamp(color.rgb, 0.0, 1.0), vec3(1.0 / gamma));

      gl_FragColor = color;
    }
  `
};

// Helper to chain onBeforeCompile hooks without overwriting
function chainOnBeforeCompile(material, hook) {
  const prev = material.onBeforeCompile;
  if (prev) {
    material.onBeforeCompile = (shader, renderer) => {
      prev(shader, renderer);
      hook(shader, renderer);
    };
  } else {
    material.onBeforeCompile = hook;
  }
  material.needsUpdate = true;
}

// ── PSX Vertex Jitter + Affine Warping (combined) ──
// Both effects modify the vertex shader's project_vertex, so they're applied together
// to avoid conflicting #include replacements.
export function applyPSXEffects(material, snapResolution, affineWarp) {
  if ((!snapResolution || snapResolution <= 0) && !affineWarp) return;

  chainOnBeforeCompile(material, (shader) => {
    let projectAppend = '';

    // Vertex jitter: snap screen-space positions to a grid
    if (snapResolution && snapResolution > 0) {
      shader.uniforms.vertexSnap = { value: snapResolution };
      projectAppend += `
      {
        float snap = ${snapResolution.toFixed(1)};
        vec4 snapped = gl_Position;
        snapped.xyz /= snapped.w;
        snapped.xy = floor(snapped.xy * snap + 0.5) / snap;
        snapped.xyz *= snapped.w;
        gl_Position = snapped;
      }`;
    }

    // Affine warping: multiply UVs by w so interpolation is linear (not perspective-corrected)
    if (affineWarp) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_UV
          vUv *= gl_Position.w;
        #endif`
      );
      shader.fragmentShader = 'varying float vAffineW;\n' + shader.fragmentShader;
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'varying float vAffineW;\nvoid main() {'
      );
      projectAppend += '\n      vAffineW = gl_Position.w;';

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec2 affineUv = vUv / vAffineW;
          vec4 sampledDiffuseColor = texture2D( map, affineUv );
          diffuseColor *= sampledDiffuseColor;
        #endif`
      );
    }

    if (projectAppend) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>' + projectAppend
      );
    }
  });
}

// Convenience wrappers for backward compatibility
export function applyVertexJitter(material, snapResolution) {
  applyPSXEffects(material, snapResolution, false);
}

export function applyAffineWarping(material) {
  applyPSXEffects(material, 0, true);
}

// ── Bloom Extract + Blur Shaders ──

export const BloomExtractShader = {
  uniforms: {
    tDiffuse: { value: null },
    threshold: { value: 0.7 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float threshold;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      if (brightness > threshold) {
        gl_FragColor = color;
      } else {
        gl_FragColor = vec4(0.0);
      }
    }
  `
};

export const BloomBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    direction: { value: new THREE.Vector2(1.0, 0.0) },
    resolution: { value: new THREE.Vector2(RENDER_WIDTH, RENDER_HEIGHT) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 direction;
    uniform vec2 resolution;
    varying vec2 vUv;
    void main() {
      vec2 texel = direction / resolution;
      vec4 color = vec4(0.0);
      // 9-tap Gaussian
      color += texture2D(tDiffuse, vUv - 4.0 * texel) * 0.016;
      color += texture2D(tDiffuse, vUv - 3.0 * texel) * 0.054;
      color += texture2D(tDiffuse, vUv - 2.0 * texel) * 0.121;
      color += texture2D(tDiffuse, vUv - 1.0 * texel) * 0.194;
      color += texture2D(tDiffuse, vUv              ) * 0.230;
      color += texture2D(tDiffuse, vUv + 1.0 * texel) * 0.194;
      color += texture2D(tDiffuse, vUv + 2.0 * texel) * 0.121;
      color += texture2D(tDiffuse, vUv + 3.0 * texel) * 0.054;
      color += texture2D(tDiffuse, vUv + 4.0 * texel) * 0.016;
      gl_FragColor = color;
    }
  `
};

export const BloomCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    bloomStrength: { value: 0.4 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float bloomStrength;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 bloom = texture2D(tBloom, vUv);
      gl_FragColor = base + bloom * bloomStrength;
    }
  `
};
