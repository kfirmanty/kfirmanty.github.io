import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'three': path.resolve('./node_modules/three/build/three.module.js'),
      'three/addons/': path.resolve('./node_modules/three/examples/jsm/')
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    coverage: {
      include: ['js/**/*.js'],
      exclude: ['js/game.js', 'js/audio.js']
    }
  }
});
