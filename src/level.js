import * as THREE from 'three';
import { PIECE_DEFS } from './pieces.js';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function choosePieceForDelta(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx !== 0 && dz !== 0) return Math.abs(dx) === Math.abs(dz) ? 'bend45Half' : 'bend90Half';
  return 'straightHalf';
}

export function generateLevel(seed = Math.random()) {
  const rng = mulberry32(Math.floor(seed * 1e9));
  const rand = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

  const start = new THREE.Vector3(rand(-6, -3), rand(4, 6), rand(-6, -3));
  const goal = new THREE.Vector3(rand(3, 7), rand(0, 2), rand(3, 7));

  const hiddenPath = [start.clone()];
  const steps = rand(6, 9);
  let cur = start.clone();
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Vector3(rand(-2, 2), rand(-1, 0), rand(-2, 2));
    if (step.lengthSq() === 0) step.x = 1;
    cur = cur.clone().add(step);
    cur.y = Math.max(goal.y, cur.y);
    hiddenPath.push(cur.clone());
  }
  hiddenPath.push(goal.clone());

  const inventory = {};
  for (let i = 1; i < hiddenPath.length; i++) {
    const pt = choosePieceForDelta(hiddenPath[i - 1], hiddenPath[i]);
    inventory[pt] = (inventory[pt] || 0) + 1;
  }

  // Guaranteed utility pieces + randomized extras for experimentation.
  inventory.springPad = (inventory.springPad || 0) + 1;
  inventory.landingPlatform = (inventory.landingPlatform || 0) + 2;
  const extras = ['straightFull', 'bend45Full', 'bend90Full', 'straightHalf', 'bend90Half'];
  extras.forEach((k) => (inventory[k] = (inventory[k] || 0) + rand(1, 3)));

  let budget = 0;
  Object.entries(inventory).forEach(([k, count]) => { budget += (PIECE_DEFS[k]?.cost || 0) * count; });

  return {
    start,
    goal,
    hiddenPath,
    inventory,
    budget,
    size: 18,
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
