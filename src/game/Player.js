import * as THREE from 'three';
import { ASSETS, CONFIG } from '../config/game.config.js';
import { AnimationController } from './AnimationController.js';
import { buildCommander } from './Character.js';
import { exists, loadGLB } from './Loader.js';

const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

export class Player {
  constructor(scene, world) {
    this.world = world; this.group = new THREE.Group(); this.heading = new THREE.Group(); this.fx = new THREE.Group();
    this.group.add(this.heading); this.heading.add(this.fx); scene.add(this.group);
    this.vel = new THREE.Vector3(); this.vy = 0; this.grounded = false; this.facing = 0; this.speed = 0; this.coyote = 0; this.onJump = null; this.landed = 0; this.helmetOn = true; this.rig = null;
  }
  async load() {
    let gltf = null;
    if (ASSETS.USE_GLB.player && (await exists(ASSETS.PLAYER_MODEL))) gltf = await loadGLB(ASSETS.PLAYER_MODEL);
    if (gltf) {
      const m = gltf.scene, holder = new THREE.Group(); holder.add(m); holder.rotation.y = CONFIG.player.modelYawOffset; m.updateMatrixWorld(true);
      let b = new THREE.Box3().setFromObject(m); m.scale.multiplyScalar(CONFIG.player.height / (b.max.y - b.min.y || 1)); m.updateMatrixWorld(true);
      b = new THREE.Box3().setFromObject(m); const c = b.getCenter(new THREE.Vector3()); m.position.set(-c.x, -b.min.y, -c.z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.fx.add(holder); this.anim = new AnimationController({ fx: this.fx, root: m, clips: gltf.animations || [] }); this.usingGLB = true;
    } else {
      const a = buildCommander(); a.group.scale.setScalar(CONFIG.player.height / a.height); this.fx.add(a.group); this.rig = a.rig;
      this.anim = new AnimationController({ fx: this.fx, root: a.group, clips: [], rig: a.rig }); this.rig.setHelmet(this.helmetOn);
    }
  }
  toggleHelmet() { this.helmetOn = !this.helmetOn; this.rig && this.rig.setHelmet(this.helmetOn); return this.helmetOn; }
  spawn(p, yaw = 0) { this.group.position.copy(p); this.vel.set(0, 0, 0); this.vy = 0; this.facing = yaw; this.heading.rotation.y = yaw; }
  react(name, dur) { this.anim && this.anim.playOnce(name, dur); }
  faceToward(pt) { this.facing = Math.atan2(pt.x - this.group.position.x, pt.z - this.group.position.z); this.heading.rotation.y = this.facing; }
  update(dt, input, camYaw, canMove) {
    const C = CONFIG.player, pos = this.group.position; let ix = 0, iz = 0; this.landed = 0;
    if (canMove) { if (input.down('KeyW') || input.down('ArrowUp')) iz++; if (input.down('KeyS') || input.down('ArrowDown')) iz--; if (input.down('KeyD') || input.down('ArrowRight')) ix++; if (input.down('KeyA') || input.down('ArrowLeft')) ix--; if (input.hit('KeyH')) this.toggleHelmet(); }
    const f = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), r = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const dir = f.multiplyScalar(iz).add(r.multiplyScalar(ix)); const moving = dir.lengthSq() > 0; if (moving) dir.normalize();
    const sprint = canMove && (input.down('ShiftLeft') || input.down('ShiftRight'));
    dir.multiplyScalar(sprint ? C.sprint : C.walk);
    const k = Math.min(1, dt * (this.grounded ? 12 : 3)); this.vel.x += (dir.x - this.vel.x) * k; this.vel.z += (dir.z - this.vel.z) * k;
    const adj = this.world.collide(pos, this.vel.x * dt, this.vel.z * dt, C.radius); pos.x += adj.x; pos.z += adj.z; this.world.clampBounds(pos);
    if (canMove && input.hit('Space') && (this.grounded || this.coyote > 0)) { this.vy = C.jump; this.grounded = false; this.coyote = 0; this.onJump && this.onJump(); }
    const was = this.grounded, preVy = this.vy; this.vy -= C.gravity * dt; let ny = pos.y + this.vy * dt;
    const gh = this.world.groundAt(pos.x, pos.z, pos.y);
    if (gh !== null && this.vy <= 0 && (ny <= gh + 0.001 || (was && pos.y - gh < 0.4))) { ny = gh; this.vy = 0; this.grounded = true; if (!was && preVy < -6) this.landed = Math.min(1, -preVy / 14); } else this.grounded = false;
    if (was && !this.grounded && this.vy <= 0) this.coyote = 0.1; this.coyote = Math.max(0, this.coyote - dt);
    pos.y = ny;
    if (pos.y < this.world.bounds.min.y - 25) { pos.copy(this.world.spawn); this.vy = 0; this.vel.set(0, 0, 0); }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.6 && moving) { this.facing = lerpAngle(this.facing, Math.atan2(this.vel.x, this.vel.z), 1 - Math.exp(-dt * 12)); this.heading.rotation.y = this.facing; }
    this.anim.update(dt, { speed: this.speed, grounded: this.grounded, vy: this.vy });
  }
}
