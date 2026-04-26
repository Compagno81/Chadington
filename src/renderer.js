import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1220);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(18, 18, 18);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;
  controls.maxPolarAngle = Math.PI / 2.25;
  controls.minDistance = 12;
  controls.maxDistance = 44;
  controls.target.set(0, 2, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(8, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;

  scene.add(ambient, sun);

  const grid = new THREE.GridHelper(40, 40, 0x4b5a89, 0x2a3555);
  grid.position.y = 0.01;
  scene.add(grid);

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x1a213f, roughness: 0.9, metalness: 0.1 }),
  );
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera, controls };
}
