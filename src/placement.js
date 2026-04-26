import * as THREE from 'three';
import { createPieceMesh, PIECE_DEFS, rotateConnector } from './pieces.js';

export class PlacementSystem {
  constructor(scene, camera, dom, state) {
    this.scene = scene;
    this.camera = camera;
    this.dom = dom;
    this.state = state;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.occupied = new Map();
    this.preview = null;
    this.previewValid = false;
    this.previewPos = new THREE.Vector3();

    this.dom.addEventListener('pointermove', (e) => this.onMove(e));
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  reset() {
    this.occupied.clear();
    if (this.preview) this.scene.remove(this.preview);
    this.preview = null;
  }

  registerPlaced(piece) {
    this.occupied.set(`${piece.pos.x}|${piece.pos.y}|${piece.pos.z}`, piece);
  }

  removePlaced(piece) {
    this.occupied.delete(`${piece.pos.x}|${piece.pos.y}|${piece.pos.z}`);
  }

  getSnappedPosition(raw) {
    const base = new THREE.Vector3(Math.round(raw.x), Math.round(raw.y), Math.round(raw.z));
    let best = base.clone();
    let bestDist = 999;

    for (const placed of this.state.placed) {
      const def = PIECE_DEFS[placed.type];
      for (const c of def.connectors) {
        const cv = rotateConnector(c, placed.rotY).add(placed.pos);
        const d = cv.distanceTo(raw);
        if (d < 1.4 && d < bestDist) {
          bestDist = d;
          best.copy(new THREE.Vector3(Math.round(cv.x), Math.round(cv.y), Math.round(cv.z)));
        }
      }
    }
    return best;
  }

  validate(type, pos) {
    if (this.occupied.has(`${pos.x}|${pos.y}|${pos.z}`)) return false;
    if (Math.abs(pos.x) > 18 || Math.abs(pos.z) > 18 || pos.y < 0 || pos.y > 12) return false;
    return this.state.inventory[type] > 0;
  }

  ensurePreview(type) {
    if (this.preview?.userData.type === type) return;
    if (this.preview) this.scene.remove(this.preview);
    this.preview = createPieceMesh(type);
    this.preview.userData.type = type;
    this.scene.add(this.preview);
  }

  onMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  updatePreview() {
    if (!this.state.canEdit()) {
      if (this.preview) this.preview.visible = false;
      return;
    }
    const type = this.state.selectedPiece;
    this.ensurePreview(type);
    this.preview.visible = true;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return;

    const snapped = this.getSnappedPosition(hit);
    this.previewPos.copy(snapped);
    this.preview.position.copy(snapped);
    this.preview.rotation.y = this.state.rotation;

    this.previewValid = this.validate(type, snapped);
    this.preview.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone();
        node.material.transparent = true;
        node.material.opacity = 0.6;
        node.material.color.set(this.previewValid ? 0x58ff87 : 0xff586e);
      }
    });
  }

  tryPlace() {
    if (!this.previewValid) return null;
    return {
      type: this.state.selectedPiece,
      pos: this.previewPos.clone(),
      rotY: this.state.rotation,
      quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation),
      mesh: createPieceMesh(this.state.selectedPiece),
    };
  }

  findPlacedAtPointer() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.state.placed.flatMap((p) => p.mesh ? [p.mesh] : []);
    const intersections = this.raycaster.intersectObjects(meshes, true);
    if (!intersections.length) return null;
    let cur = intersections[0].object;
    while (cur && !cur.userData.pieceId) cur = cur.parent;
    return this.state.placed.find((p) => p.id === cur?.userData.pieceId) || null;
  }
}
