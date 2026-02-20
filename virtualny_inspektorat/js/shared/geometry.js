import * as THREE from 'three';

export const COMPOUND_TYPES = ['column', 'stairs', 'pediment', 'head', 'water'];

export const GeometryBuilders = {
  box(params) {
    const w = params.width || 1, h = params.height || 1, d = params.depth || 1;
    const segs = params.segments || [1, 1, 1];
    return new THREE.BoxGeometry(w, h, d, segs[0], segs[1], segs[2]);
  },

  cylinder(params) {
    const rt = params.radiusTop ?? params.radius ?? 0.5;
    const rb = params.radiusBottom ?? params.radius ?? 0.5;
    const h = params.height || 1;
    const segs = params.segments || 8; // Low poly!
    return new THREE.CylinderGeometry(rt, rb, h, segs);
  },

  sphere(params) {
    const r = params.radius || 0.5;
    const wSegs = params.widthSegments || 8;
    const hSegs = params.heightSegments || 6;
    return new THREE.SphereGeometry(r, wSegs, hSegs);
  },

  plane(params) {
    const w = params.width || 1, h = params.height || 1;
    return new THREE.PlaneGeometry(w, h, params.widthSegments || 1, params.heightSegments || 1);
  },

  cone(params) {
    const r = params.radius || 0.5;
    const h = params.height || 1;
    const segs = params.segments || 6;
    return new THREE.ConeGeometry(r, h, segs);
  },

  torus(params) {
    const r = params.radius || 1;
    const tube = params.tube || 0.3;
    return new THREE.TorusGeometry(r, tube, params.radialSegments || 6, params.tubularSegments || 8);
  },

  // Compound: Greek column with capital
  column(params) {
    const group = new THREE.Group();
    const r = params.radius || 0.3;
    const h = params.height || 4;
    const mat = params._material;

    // Shaft (slightly tapered)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.9, r, h - 0.6, 8),
      mat
    );
    shaft.position.y = h / 2 - 0.3;
    group.add(shaft);

    // Capital (wider top)
    const capital = new THREE.Mesh(
      new THREE.BoxGeometry(r * 2.8, 0.3, r * 2.8),
      mat
    );
    capital.position.y = h - 0.15;
    group.add(capital);

    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(r * 2.5, 0.3, r * 2.5),
      mat
    );
    base.position.y = 0.15;
    group.add(base);

    return group;
  },

  // Compound: Steps/stairs
  stairs(params) {
    const group = new THREE.Group();
    const count = params.steps || 8;
    const stepW = params.stepWidth || 6;
    const stepH = params.stepHeight || 0.25;
    const stepD = params.stepDepth || 0.4;
    const mat = params._material;

    for (let i = 0; i < count; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(stepW, stepH, stepD),
        mat
      );
      step.position.set(0, i * stepH + stepH / 2, -i * stepD);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }
    return group;
  },

  // Compound: Greek pediment (triangular roof)
  pediment(params) {
    const group = new THREE.Group();
    const w = params.width || 8;
    const h = params.height || 2;
    const d = params.depth || 1;
    const mat = params._material;

    // Triangular shape using ExtrudeGeometry
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(0, h);
    shape.lineTo(w / 2, 0);
    shape.lineTo(-w / 2, 0);

    const extrudeSettings = { depth: d, bevelEnabled: false };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.z = -d / 2;
    group.add(mesh);

    return group;
  },

  // Head sculpture — stoic classical bust
  head(params) {
    const group = new THREE.Group();
    const s = params.scale || 1;
    const mat = params._material;
    const eyeMat = params._eyeMaterial || new THREE.MeshStandardMaterial({ color: 0x000000 });

    // Cranium — tall, narrow, statuesque
    const craniumGeom = new THREE.SphereGeometry(0.8 * s, 10, 8);
    craniumGeom.scale(1, 1.3, 0.92);
    const cranium = new THREE.Mesh(craniumGeom, mat);
    group.add(cranium);

    // Brow ridge — heavy overhang, casts shadow over eyes
    const browGeom = new THREE.BoxGeometry(0.72 * s, 0.1 * s, 0.22 * s);
    const brow = new THREE.Mesh(browGeom, mat);
    brow.position.set(0, 0.28 * s, 0.62 * s);
    group.add(brow);

    // Eye sockets — deep dark recesses
    const socketGeom = new THREE.SphereGeometry(0.13 * s, 6, 4);
    const socketMat = new THREE.MeshStandardMaterial({
      color: 0x050510, roughness: 1.0, metalness: 0
    });
    const leftSocket = new THREE.Mesh(socketGeom, socketMat);
    leftSocket.position.set(-0.22 * s, 0.16 * s, 0.66 * s);
    group.add(leftSocket);
    const rightSocket = new THREE.Mesh(socketGeom, socketMat);
    rightSocket.position.set(0.22 * s, 0.16 * s, 0.66 * s);
    group.add(rightSocket);

    // Iris glow — faint pinpoints deep in the sockets
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x01cdfe, emissive: 0x01cdfe, emissiveIntensity: 1.2
    });
    const irisGeom = new THREE.SphereGeometry(0.035 * s, 4, 4);
    const leftIris = new THREE.Mesh(irisGeom, irisMat);
    leftIris.position.set(-0.22 * s, 0.15 * s, 0.7 * s);
    group.add(leftIris);
    const rightIris = new THREE.Mesh(irisGeom, irisMat);
    rightIris.position.set(0.22 * s, 0.15 * s, 0.7 * s);
    group.add(rightIris);

    // Nose — angular bridge, classical profile
    const bridgeGeom = new THREE.BoxGeometry(0.1 * s, 0.28 * s, 0.16 * s);
    const bridge = new THREE.Mesh(bridgeGeom, mat);
    bridge.position.set(0, 0.04 * s, 0.72 * s);
    group.add(bridge);
    const tipGeom = new THREE.ConeGeometry(0.07 * s, 0.14 * s, 4);
    const tip = new THREE.Mesh(tipGeom, mat);
    tip.position.set(0, -0.1 * s, 0.78 * s);
    tip.rotation.x = -Math.PI / 2;
    group.add(tip);

    // Cheekbones — angular planes for structure
    const cheekGeom = new THREE.BoxGeometry(0.18 * s, 0.12 * s, 0.2 * s);
    const leftCheek = new THREE.Mesh(cheekGeom, mat);
    leftCheek.position.set(-0.38 * s, 0.0, 0.52 * s);
    leftCheek.rotation.y = 0.3;
    group.add(leftCheek);
    const rightCheek = new THREE.Mesh(cheekGeom, mat);
    rightCheek.position.set(0.38 * s, 0.0, 0.52 * s);
    rightCheek.rotation.y = -0.3;
    group.add(rightCheek);

    // Mouth — thin closed line, neutral expression
    const mouthGeom = new THREE.BoxGeometry(0.3 * s, 0.025 * s, 0.06 * s);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a, roughness: 1.0, metalness: 0
    });
    const mouth = new THREE.Mesh(mouthGeom, mouthMat);
    mouth.position.set(0, -0.22 * s, 0.7 * s);
    group.add(mouth);

    // Jaw — defined, angular
    const jawGeom = new THREE.BoxGeometry(0.56 * s, 0.18 * s, 0.38 * s);
    const jaw = new THREE.Mesh(jawGeom, mat);
    jaw.position.set(0, -0.4 * s, 0.32 * s);
    group.add(jaw);
    // Chin point
    const chinGeom = new THREE.BoxGeometry(0.2 * s, 0.1 * s, 0.14 * s);
    const chin = new THREE.Mesh(chinGeom, mat);
    chin.position.set(0, -0.42 * s, 0.58 * s);
    group.add(chin);

    return group;
  },

  // Water plane with custom material
  water(params) {
    const w = params.width || 100;
    const h = params.height || 100;
    const geom = new THREE.PlaneGeometry(w, h, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: params.color ? new THREE.Color(params.color) : new THREE.Color(0x2255aa),
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = params.level || -2;
    mesh.userData.isWater = true;
    return mesh;
  }
};
