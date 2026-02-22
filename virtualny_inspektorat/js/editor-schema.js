export const DEFAULT_PARAMS = {
  box: { width: 2, height: 2, depth: 2 },
  sphere: { radius: 1, widthSegments: 8, heightSegments: 6 },
  cylinder: { radius: 0.5, height: 2, segments: 8 },
  cone: { radius: 0.5, height: 2, segments: 6 },
  plane: { width: 4, height: 4 },
  torus: { radius: 1, tube: 0.3, radialSegments: 6, tubularSegments: 8 },
  column: { radius: 0.35, height: 4 },
  stairs: { steps: 8, stepWidth: 6, stepHeight: 0.25, stepDepth: 0.4 },
  pediment: { width: 8, height: 2, depth: 0.5 },
  head: { scale: 1 },
  terrain: { width: 40, depth: 40, segments: 32, hillHeight: 3, hillFrequency: 0.15, seed: 0, bowl: 0 },
  group: {}
};

export const DEFAULT_MATERIAL = { color: '#cccccc', roughness: 0.8, metalness: 0.1 };

export const PARAM_SCHEMA = {
  box: [
    { key: 'width', label: 'Width', type: 'number', step: 0.1 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 },
    { key: 'depth', label: 'Depth', type: 'number', step: 0.1 }
  ],
  sphere: [
    { key: 'radius', label: 'Radius', type: 'number', step: 0.1 },
    { key: 'widthSegments', label: 'W Segs', type: 'number', step: 1, min: 3 },
    { key: 'heightSegments', label: 'H Segs', type: 'number', step: 1, min: 2 }
  ],
  cylinder: [
    { key: 'radius', label: 'Radius', type: 'number', step: 0.1 },
    { key: 'radiusTop', label: 'Top R', type: 'number', step: 0.1 },
    { key: 'radiusBottom', label: 'Bot R', type: 'number', step: 0.1 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 },
    { key: 'segments', label: 'Segments', type: 'number', step: 1, min: 3 }
  ],
  cone: [
    { key: 'radius', label: 'Radius', type: 'number', step: 0.1 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 },
    { key: 'segments', label: 'Segments', type: 'number', step: 1, min: 3 }
  ],
  plane: [
    { key: 'width', label: 'Width', type: 'number', step: 0.1 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 }
  ],
  torus: [
    { key: 'radius', label: 'Radius', type: 'number', step: 0.1 },
    { key: 'tube', label: 'Tube', type: 'number', step: 0.01 },
    { key: 'radialSegments', label: 'Rad Segs', type: 'number', step: 1, min: 3 },
    { key: 'tubularSegments', label: 'Tub Segs', type: 'number', step: 1, min: 3 }
  ],
  column: [
    { key: 'radius', label: 'Radius', type: 'number', step: 0.05 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 }
  ],
  stairs: [
    { key: 'steps', label: 'Steps', type: 'number', step: 1, min: 1 },
    { key: 'stepWidth', label: 'Width', type: 'number', step: 0.1 },
    { key: 'stepHeight', label: 'Step H', type: 'number', step: 0.05 },
    { key: 'stepDepth', label: 'Step D', type: 'number', step: 0.05 }
  ],
  pediment: [
    { key: 'width', label: 'Width', type: 'number', step: 0.1 },
    { key: 'height', label: 'Height', type: 'number', step: 0.1 },
    { key: 'depth', label: 'Depth', type: 'number', step: 0.1 }
  ],
  head: [
    { key: 'scale', label: 'Scale', type: 'number', step: 0.1, min: 0.1 }
  ],
  terrain: [
    { key: 'width', label: 'Width', type: 'number', step: 1 },
    { key: 'depth', label: 'Depth', type: 'number', step: 1 },
    { key: 'segments', label: 'Segments', type: 'number', step: 1, min: 4 },
    { key: 'hillHeight', label: 'Hill H', type: 'number', step: 0.5 },
    { key: 'hillFrequency', label: 'Hill Freq', type: 'number', step: 0.01 },
    { key: 'seed', label: 'Seed', type: 'number', step: 0.1 },
    { key: 'bowl', label: 'Bowl', type: 'number', step: 0.5 }
  ],
  group: []
};
