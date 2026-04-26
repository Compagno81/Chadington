import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsSystem {
  constructor() {
    this.world = null;
    this.ballBody = null;
    this.pieceBodies = [];
    this.ready = false;
  }

  async init() {
    await RAPIER.init();
    this.ready = true;
    this.resetWorld();
  }

  resetWorld() {
    if (!this.ready) return;
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.pieceBodies = [];
    this.ballBody = null;

    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(20, 0.5, 20), ground);
  }

  createBall(position) {
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y, position.z));
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.35).setRestitution(0.3).setFriction(0.5).setDensity(3.2), rb);
    this.ballBody = rb;
    return rb;
  }

  addPieceCollider(piece) {
    const rb = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(piece.pos.x, piece.pos.y, piece.pos.z).setRotation(piece.quat));
    let collider;
    if (piece.type === 'springPad') {
      collider = RAPIER.ColliderDesc.cuboid(0.8, 0.2, 0.8).setRestitution(1.2);
    } else if (piece.type === 'landingPlatform') {
      collider = RAPIER.ColliderDesc.cuboid(1, 0.12, 1).setFriction(1.2);
    } else {
      collider = RAPIER.ColliderDesc.cuboid(1, 0.25, 0.55).setFriction(0.6);
    }
    this.world.createCollider(collider, rb);
    this.pieceBodies.push({ rb, piece });
  }

  step(dt = 1 / 60) {
    this.world.timestep = dt;
    this.world.step();
  }

  getBallPosition() {
    if (!this.ballBody) return new THREE.Vector3();
    const t = this.ballBody.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  applySpringBoostIfNeeded() {
    if (!this.ballBody) return;
    const ball = this.ballBody.translation();
    this.pieceBodies.forEach(({ piece }) => {
      if (piece.type !== 'springPad') return;
      const d = Math.hypot(ball.x - piece.pos.x, ball.z - piece.pos.z);
      if (d < 0.9 && Math.abs(ball.y - piece.pos.y) < 1.0) {
        this.ballBody.applyImpulse({ x: 0, y: 1.6, z: 0 }, true);
      }
    });
  }
}
