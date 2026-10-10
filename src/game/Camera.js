import * as THREE from 'three';
import { CONFIG } from '../config/game.config.js';
const V3 = THREE.Vector3;

export class CameraRig {
  constructor(camera, world) {
    this.cam = camera; this.world = world; this.yaw = 0; this.pitch = 0.35; this.dist = CONFIG.camera.distance; this.sens = 1;
    this.pos = new V3(); this.look = new V3(); this.cine = null; this.init = false;
  }
  rotate(dx, dy) { this.yaw -= dx * 0.0025 * this.sens; this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0025 * this.sens, -0.2, 1.25); }
  zoom(w) { this.dist = THREE.MathUtils.clamp(this.dist + w * 0.006, CONFIG.camera.min, CONFIG.camera.max); }
  /** Fly an orbiting shot around a point for `dur` seconds, then call onDone. */
  cinematic(center, dur, radius, onDone) { this.cine = { center: center.clone(), t: 0, dur, r: radius, a0: Math.random() * 6.28, onDone }; }
  skipCinematic() { if (this.cine) { const d = this.cine.onDone; this.cine = null; d && d(); } }
  update(dt, target) {
    const tgt = new V3(target.x, target.y + 1.5, target.z); let desired, lookAt = tgt, rate = 12;
    if (this.cine) {
      const c = this.cine; c.t += dt; const a = c.a0 + (c.t / c.dur) * 1.1;
      desired = new V3(c.center.x + Math.sin(a) * c.r, c.center.y + c.r * 0.55, c.center.z + Math.cos(a) * c.r); lookAt = c.center; rate = 3.5;
      if (c.t >= c.dur) { const d = c.onDone; this.cine = null; d && d(); }
    } else {
      const off = new V3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
      desired = tgt.clone().add(off); const t = this.world.cameraClip(tgt, desired); desired = tgt.clone().add(off.multiplyScalar(t));
    }
    const gy = this.world.groundAt(desired.x, desired.z, tgt.y + 2); if (gy !== null) desired.y = Math.max(desired.y, gy + 0.7);
    if (!this.init) { this.pos.copy(desired); this.look.copy(lookAt); this.init = true; }
    const k = 1 - Math.exp(-rate * dt); this.pos.lerp(desired, k); this.look.lerp(lookAt, 1 - Math.exp(-(this.cine ? 5 : 20) * dt));
    this.cam.position.copy(this.pos); this.cam.lookAt(this.look);
  }
  /** Slow orbit used behind the main menu. */
  menuOrbit(t) {
    const r = this.world.radius * 0.55, a = t * 0.06; this.cam.position.set(Math.sin(a) * r, r * 0.35 + 12, Math.cos(a) * r); this.cam.lookAt(0, 4, 0); this.init = false;
  }
}
