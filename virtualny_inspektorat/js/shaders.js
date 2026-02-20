import * as THREE from 'three';
import { RENDER_WIDTH, RENDER_HEIGHT } from './constants.js';

export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(RENDER_WIDTH, RENDER_HEIGHT) },
    ditherIntensity: { value: 0.08 },
    colorDepth: { value: 32.0 },
    time: { value: 0.0 }
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
    uniform float time;
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
      float aberration = 0.0008;
      float r = texture2D(tDiffuse, vUv + vec2(aberration, 0.0)).r;
      float b = texture2D(tDiffuse, vUv - vec2(aberration, 0.0)).b;
      color.r = floor((color.r * 0.7 + r * 0.3) * colorDepth + 0.5) / colorDepth;
      color.b = floor((color.b * 0.7 + b * 0.3) * colorDepth + 0.5) / colorDepth;

      // Vignette
      float dist = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - dist * 0.4;

      gl_FragColor = color;
    }
  `
};
