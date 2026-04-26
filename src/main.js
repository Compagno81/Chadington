import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { GameState, Phase } from './state.js';
import { generateLevel } from './level.js';
import { PlacementSystem } from './placement.js';
import { UI } from './ui.js';
import { PIECE_DEFS, createPieceMesh } from './pieces.js';
import { PhysicsSystem } from './physics.js';
import { computeScore } from './scoring.js';

const canvas = document.getElementById('game-canvas');
const { renderer, scene, camera, controls } = createRenderer(canvas);
const state = new GameState();
const ui = new UI(state);
const physics = new PhysicsSystem();
await physics.init();
const placement = new PlacementSystem(scene, camera, renderer.domElement, state);

let level = null;
let ballMesh = null;
let startPad = null;
let finishZone = null;
let pieceIdCounter = 1;
let runResolved = false;

function createMetalBall() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 28, 28),
    new THREE.MeshStandardMaterial({ color: 0xdce6f0, metalness: 0.95, roughness: 0.22 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPad(color = 0x4cc4ff) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function setupLevel() {
  clearPlaced();
  physics.resetWorld();
  if (ballMesh) scene.remove(ballMesh);
  if (startPad) scene.remove(startPad);
  if (finishZone) scene.remove(finishZone);

  startPad = createPad(0x53dbff);
  finishZone = createPad(0x72ff8d);
  startPad.position.copy(level.start);
  finishZone.position.copy(level.goal);
  scene.add(startPad, finishZone);

  ballMesh = createMetalBall();
  ballMesh.position.copy(level.start).add(new THREE.Vector3(0, 0.9, 0));
  scene.add(ballMesh);

  physics.createBall(ballMesh.position);
  state.resetForLevel(level);
  placement.reset();
  ui.renderPieceList();
  ui.updateHUD();
  ui.setStatus('Build your track, then press Start Run.');
}

function clearPlaced() {
  state.placed.forEach((p) => scene.remove(p.mesh));
  state.placed = [];
  state.totalCost = 0;
}

function loadNextLevel() {
  level = generateLevel(Math.random());
  state.levelIndex += 1;
  setupLevel();
  state.phase = Phase.BUILD;
  runResolved = false;
}

function placeCurrentPiece() {
  if (!state.canEdit()) return;
  const placed = placement.tryPlace();
  if (!placed) return;

  const cost = PIECE_DEFS[placed.type].cost;
  if (state.totalCost + cost > state.budget) {
    ui.setStatus('Budget exceeded. Remove pieces or choose cheaper parts.');
    return;
  }

  placed.id = `p-${pieceIdCounter++}`;
  placed.mesh.position.copy(placed.pos);
  placed.mesh.rotation.y = placed.rotY;
  placed.mesh.userData.pieceId = placed.id;

  state.inventory[placed.type] -= 1;
  state.totalCost += cost;
  state.placed.push(placed);
  placement.registerPlaced(placed);

  scene.add(placed.mesh);
  ui.renderPieceList();
  ui.updateHUD();
}

function removePieceAtCursor() {
  if (!state.canEdit()) return;
  const piece = placement.findPlacedAtPointer();
  if (!piece) return;
  state.placed = state.placed.filter((p) => p.id !== piece.id);
  state.inventory[piece.type] += 1;
  state.totalCost -= PIECE_DEFS[piece.type].cost;
  scene.remove(piece.mesh);
  placement.removePlaced(piece);
  ui.renderPieceList();
  ui.updateHUD();
}

function startRun() {
  if (state.phase !== Phase.BUILD) return;
  state.phase = Phase.RUN;
  state.attempts += 1;
  state.runStartTime = performance.now();
  ui.setStatus('Simulation running. Watch the marble!');
  ui.updateHUD();

  physics.resetWorld();
  state.placed.forEach((p) => physics.addPieceCollider(p));
  physics.createBall(level.start.clone().add(new THREE.Vector3(0, 0.9, 0)));
  runResolved = false;
}

function restartRun() {
  if (!level) return;
  state.phase = Phase.BUILD;
  state.elapsed = 0;
  runResolved = false;
  physics.resetWorld();
  physics.createBall(level.start.clone().add(new THREE.Vector3(0, 0.9, 0)));
  ballMesh.position.copy(level.start).add(new THREE.Vector3(0, 0.9, 0));
  ui.setStatus('Attempt reset. Continue editing your track.');
  ui.updateHUD();
  ui.renderPieceList();
}

function checkSuccess() {
  if (state.phase !== Phase.RUN || runResolved) return;
  const ballPos = physics.getBallPosition();
  const withinX = Math.abs(ballPos.x - level.goal.x) < 1;
  const withinZ = Math.abs(ballPos.z - level.goal.z) < 1;
  const withinY = Math.abs(ballPos.y - level.goal.y) < 1.2;

  if (withinX && withinY && withinZ) {
    runResolved = true;
    state.phase = Phase.SUCCESS;
    const totalTime = (performance.now() - state.runStartTime) / 1000;
    state.elapsed = totalTime;
    const score = computeScore(state.totalCost, state.attempts, totalTime);
    ui.showSuccess({
      score,
      attempts: state.attempts,
      totalCost: state.totalCost,
      elapsed: state.elapsed,
      remainingBudget: Math.max(0, state.budget - state.totalCost),
    });
    ui.updateHUD();
    ui.setStatus('Great run! Continue to the next generated level.');
  }

  if (ballPos.y < -2) {
    runResolved = true;
    state.phase = Phase.BUILD;
    state.elapsed = 0;
    ui.setStatus('The marble fell off. Adjust the build and try again.');
    ui.updateHUD();
    ui.renderPieceList();
    physics.resetWorld();
    physics.createBall(level.start.clone().add(new THREE.Vector3(0, 0.9, 0)));
  }
}

function animate() {
  requestAnimationFrame(animate);
  placement.updatePreview();

  if (state.phase === Phase.RUN) {
    physics.applySpringBoostIfNeeded();
    physics.step(1 / 60);
    const p = physics.getBallPosition();
    ballMesh.position.copy(p);
    state.elapsed = (performance.now() - state.runStartTime) / 1000;
    checkSuccess();
    ui.updateHUD();
  }

  controls.update();
  renderer.render(scene, camera);
}

ui.bindActionHandlers({
  startGame: () => {
    ui.hideOverlay();
    state.phase = Phase.BUILD;
    state.levelIndex = -1;
    loadNextLevel();
  },
  startRun,
  restartRun,
  nextLevel: () => {
    ui.hideOverlay();
    loadNextLevel();
  },
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    state.rotation += Math.PI / 2;
  } else if (e.code === 'Space') {
    e.preventDefault();
    startRun();
  } else if (e.code === 'Delete') {
    removePieceAtCursor();
  }
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (e.button === 0) placeCurrentPiece();
  else if (e.button === 2) removePieceAtCursor();
});

ui.showTitle();
animate();
