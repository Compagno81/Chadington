import * as THREE from 'three';

export const PIECE_DEFS = {
  straightHalf: { type: 'straightHalf', name: 'Straight Half-Pipe', cost: 10, length: 2, radius: 0.5, enclosure: 0.5, connectors: [[-1,0,0],[1,0,0]] },
  straightFull: { type: 'straightFull', name: 'Straight Full Pipe', cost: 15, length: 2, radius: 0.5, enclosure: 1, connectors: [[-1,0,0],[1,0,0]] },
  bend45Half: { type: 'bend45Half', name: '45° Bend Half-Pipe', cost: 20, bend: 45, radius: 1.4, enclosure: 0.5, connectors: [[-1,0,0],[0.7,0,0.7]] },
  bend45Full: { type: 'bend45Full', name: '45° Bend Full Pipe', cost: 25, bend: 45, radius: 1.4, enclosure: 1, connectors: [[-1,0,0],[0.7,0,0.7]] },
  bend90Half: { type: 'bend90Half', name: '90° Bend Half-Pipe', cost: 30, bend: 90, radius: 1.2, enclosure: 0.5, connectors: [[-1,0,0],[0,0,1]] },
  bend90Full: { type: 'bend90Full', name: '90° Bend Full Pipe', cost: 35, bend: 90, radius: 1.2, enclosure: 1, connectors: [[-1,0,0],[0,0,1]] },
  springPad: { type: 'springPad', name: 'Spring Pad', cost: 50, connectors: [[0,0,0]], springBoost: 14 },
  landingPlatform: { type: 'landingPlatform', name: 'Landing Platform', cost: 20, connectors: [[0,0,0]] },
};

export const PIECE_ORDER = Object.keys(PIECE_DEFS);

function makePipeMaterial(color = 0x6eb5ff, metalness = 0.25, roughness = 0.45) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function halfPipeGeometry(length = 2, radius = 0.5, arc = Math.PI) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, Math.PI, 0, false);
  const extrude = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 16 });
  extrude.rotateY(Math.PI / 2);
  extrude.translate(0, 0, -length / 2);
  return extrude;
}

export function createPieceMesh(pieceType) {
  const def = PIECE_DEFS[pieceType];
  const group = new THREE.Group();
  let bodyMesh;

  if (pieceType.startsWith('straight')) {
    const geom = halfPipeGeometry(def.length, def.radius, Math.PI * def.enclosure);
    bodyMesh = new THREE.Mesh(geom, makePipeMaterial(pieceType.includes('Full') ? 0x85d4ff : 0x7dc7b8));
  } else if (pieceType.startsWith('bend')) {
    const arc = def.bend === 45 ? Math.PI / 4 : Math.PI / 2;
    const tube = new THREE.TorusGeometry(def.radius, 0.28, 14, 28, arc);
    tube.rotateY(Math.PI);
    bodyMesh = new THREE.Mesh(tube, makePipeMaterial(pieceType.includes('Full') ? 0x84b7ff : 0xa0d8b3));
  } else if (pieceType === 'springPad') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), new THREE.MeshStandardMaterial({ color: 0xff6f91, metalness: 0.1, roughness: 0.7 }));
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffc9d7, metalness: 0.4, roughness: 0.3 }));
    coil.position.y = 0.35;
    group.add(base, coil);
  } else if (pieceType === 'landingPlatform') {
    bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0xf5d77a, roughness: 0.85 }));
  }

  if (bodyMesh) group.add(bodyMesh);

  group.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  return group;
}

export function gridKey(v) {
  return `${v.x.toFixed(2)}|${v.y.toFixed(2)}|${v.z.toFixed(2)}`;
}

export function rotateConnector(conn, rotationY) {
  const v = new THREE.Vector3(...conn);
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  return v;
}
