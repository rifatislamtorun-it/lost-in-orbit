import * as THREE from 'three';
import { ANIMATION_MAP, ANIM_FALLBACK } from '../config/game.config.js';
const LOCO = ['Idle', 'Walk', 'Run', 'Jump', 'Fall'];
const damp = (a, b, k) => a + (b - a) * k;

/**
 * Plays GLB clips when a custom model supplies them (auto-detected by name with fallbacks).
 * Otherwise poses the procedural astronaut rig: walk/run cycle with knees + elbows, idle breathing,
 * jump/fall, squash & stretch, and gestures (Wave, Celebrate, Point, Sad, Scan, Repair, Interact, UseTool, Damage).
 */
export class AnimationController {
  constructor({ fx, root, clips = [], rig = null }) {
    this.fx = fx; this.rig = rig; this.t = 0; this.phase = 0; this.actions = {}; this.cur = null; this.curAction = null; this.once = null; this.proc = null; this.land = 0; this.prevGround = true; this.run = 0; this.hasClips = false;
    this.mixer = clips.length ? new THREE.AnimationMixer(root) : null;
    if (this.mixer) {
      for (const [name, pats] of Object.entries(ANIMATION_MAP)) {
        const lc = (c) => c.name.toLowerCase();
        const clip = clips.find((c) => lc(c) === name.toLowerCase()) || clips.find((c) => pats.some((p) => lc(c).includes(p)));
        if (clip) this.actions[name] = this.mixer.clipAction(clip);
      }
      if (!this.actions.Idle) this.actions.Idle = this.mixer.clipAction(clips[0]);
      this.hasClips = true; console.info('[Player] animations mapped:', Object.keys(this.actions).join(', '));
    }
  }
  resolve(name) { for (const n of ANIM_FALLBACK[name] || [name]) if (this.actions[n]) return n; return null; }
  play(name, fade = 0.2, once = false) {
    const a = this.actions[name]; if (!a) return;
    a.enabled = true; a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once;
    if (this.curAction && this.curAction !== a) { a.reset(); a.crossFadeFrom(this.curAction, fade, false); } else if (once) a.reset();
    a.play(); this.curAction = a; this.cur = name;
  }
  playOnce(name, dur = 1.5) {
    if (this.hasClips) {
      const r = this.resolve(name);
      if (r && !LOCO.includes(r)) { this.play(r, 0.15, true); this.once = { until: this.t + this.actions[r].getClip().duration }; return; }
      this.once = { until: this.t + dur };
    }
    this.proc = { name, t: 0, dur };
  }
  update(dt, s) {
    this.t += dt;
    if (this.hasClips) {
      this.mixer.update(dt); if (this.once && this.t >= this.once.until) this.once = null;
      if (!this.once) {
        const loco = !s.grounded ? (s.vy > 0 ? 'Jump' : 'Fall') : s.speed > 6.5 ? 'Run' : s.speed > 0.4 ? 'Walk' : 'Idle';
        const r = this.resolve(loco); if (r && r !== this.cur) this.play(r, 0.2);
        if (this.curAction && (this.cur === 'Walk' || this.cur === 'Run')) this.curAction.timeScale = THREE.MathUtils.clamp(s.speed / (this.cur === 'Run' ? 9 : 5), 0.7, 1.4);
      }
    }
    this.pose(dt, s);
  }
  pose(dt, s) {
    const fx = this.fx, t = this.t, R = this.rig; fx.position.set(0, 0, 0); fx.rotation.set(0, 0, 0); fx.scale.set(1, 1, 1);
    if (!this.prevGround && s.grounded) this.land = 0.2; this.prevGround = s.grounded; this.land = Math.max(0, this.land - dt);
    if (this.land > 0) { const k = this.land / 0.2; fx.scale.set(1 + 0.08 * k, 1 - 0.1 * k, 1 + 0.08 * k); fx.position.y = -0.04 * k; }       // landing squash
    if (!s.grounded) { const k = Math.min(1, Math.abs(s.vy) / 8) * 0.06; fx.scale.set(1 - k * 0.5, 1 + k, 1 - k * 0.5); }                       // air stretch
    if (R && !this.hasClips) this.rigPose(dt, s, R); else if (this.proc) this.procBody(dt);
    if (this.proc && this.hasClips) { /* clip model: body-only gesture */ }
  }
  rigPose(dt, s, R) {
    const t = this.t, k = Math.min(1, dt * 14), { legL, legR, armL, armR, spine, hips, head, chest } = R;
    // target pose values
    const P = { hipL: 0, hipR: 0, kneeL: 0.04, kneeR: 0.04, shL: 0, shR: 0, shLz: 0.1, shRz: -0.1, elL: -0.12, elR: -0.12, spX: 0, spY: 0, spZ: 0, headX: 0, headY: 0, bob: 0, lean: 0, hipsY: 0, shLy: 0, shRy: 0, elLz: 0, elRz: 0 };
    const moving = s.grounded && s.speed > 0.5, runK = THREE.MathUtils.clamp((s.speed - 5) / 4, 0, 1); this.run = damp(this.run, runK, k);
    if (!s.grounded) {
      const up = s.vy > 0;
      P.hipL = up ? -0.9 : -0.35; P.kneeL = up ? 1.25 : 0.5; P.hipR = up ? 0.15 : 0.25; P.kneeR = up ? 0.5 : 0.3;
      P.shLz = P.shRz = 0; P.shLz = 1.3; P.shRz = -1.3; P.shL = P.shR = up ? -0.6 : -0.1; P.elL = P.elR = -0.5; P.spX = 0.05;
    } else if (moving) {
      this.phase += dt * s.speed * (2.15 - this.run * 0.1); const p = this.phase, A = 0.5 + this.run * 0.5, sw = Math.sin(p), cs = Math.cos(p);
      P.hipL = -sw * A; P.hipR = sw * A; P.kneeL = 0.08 + Math.max(0, cs) * (0.75 + this.run * 0.7); P.kneeR = 0.08 + Math.max(0, -cs) * (0.75 + this.run * 0.7);
      P.shL = sw * A * 0.95; P.shR = -sw * A * 0.95; P.elL = P.elR = -0.3 - this.run * 0.9; P.elL -= Math.max(0, -sw) * 0.2; P.elR -= Math.max(0, sw) * 0.2;
      P.shLz = 0.12 + this.run * 0.05; P.shRz = -0.12 - this.run * 0.05;
      P.spY = sw * 0.16 * (1 + this.run * 0.5); P.spX = 0.05 + this.run * 0.16; P.headY = -sw * 0.06; P.headX = -P.spX * 0.5; P.bob = Math.abs(cs) * (0.03 + this.run * 0.045) - 0.03; P.spZ = -sw * 0.03;
    } else {
      this.phase = 0; const b = Math.sin(t * 1.7);
      P.spX = b * 0.012; P.shLz = 0.1 + b * 0.012; P.shRz = -0.1 - b * 0.012; P.shL = Math.sin(t * 0.9) * 0.03; P.shR = -Math.sin(t * 0.9) * 0.03; P.headY = Math.sin(t * 0.5) * 0.16; P.headX = Math.sin(t * 0.37) * 0.03; P.spZ = Math.sin(t * 0.8) * 0.012; P.hipsY = Math.sin(t * 0.8) * 0.015;
    }
    if (this.proc) {
      const p = this.proc; p.t += dt; const kk = p.t / p.dur;
      if (kk >= 1) this.proc = null;
      else {
        const e = Math.min(1, Math.sin(Math.PI * kk) * 2.2), pt = p.t;
        switch (p.name) {
          case 'Celebrate': P.shLz = 2.7 * e + 0.1 * (1 - e); P.shRz = -2.7 * e - 0.1 * (1 - e); P.elL = P.elR = -0.3 * e; this.fx.position.y = Math.abs(Math.sin(pt * 8)) * 0.3 * e; this.fx.rotation.y = Math.sin(pt * 6) * 0.5 * e; P.headX = -0.25 * e; P.kneeL = P.kneeR = 0.4 * e; break;
          case 'Wave': P.shRz = -(2.45 * e) - 0.1 * (1 - e); P.elRz = -Math.sin(pt * 11) * 0.45 * e; P.elR = -0.4 * e; P.headY = 0.25 * e; this.fx.rotation.z = 0.04 * e; break;
          case 'Point': P.shL = -1.5 * e; P.shLz = 0.1; P.elL = -0.05; P.headY = -0.15 * e; this.fx.rotation.x = 0.04 * e; break;
          case 'Sad': P.spX = 0.3 * e; P.headX = 0.45 * e; P.shLz = 0.05; P.shRz = -0.05; P.shL = P.shR = 0.1 * e; this.fx.scale.y *= 1 - 0.02 * e; break;
          case 'Damage': this.fx.rotation.z = Math.sin(pt * 30) * 0.07 * e; P.spX = 0.15 * e; P.shLz = 0.5 * e; P.shRz = -0.5 * e; break;
          case 'Scan': P.shL = P.shR = -1.2 * e; P.elL = P.elR = -0.9 * e; P.shLz = 0.12; P.shRz = -0.12; P.spY = Math.sin(pt * 5) * 0.5 * e; P.headY = Math.sin(pt * 5) * 0.3 * e; break;
          case 'Repair': case 'UseTool':
            P.shR = (-1.1 + Math.sin(pt * 14) * 0.3) * e; P.elR = -0.9 * e; P.shL = -0.9 * e; P.elL = -0.7 * e; P.spX = 0.3 * e; P.hipL = P.hipR = -0.3 * e; P.kneeL = P.kneeR = 0.6 * e; this.fx.position.y = -0.1 * e; P.headX = 0.25 * e; break;
          default: // Interact
            P.shR = -1.3 * e; P.elR = -0.3 * e; P.spX = 0.12 * e; P.headX = 0.12 * e; P.shL = -0.2 * e; P.shLy = 0;
        }
      }
    }
    const lerp = (o, key, v) => { o.rotation[key] = damp(o.rotation[key], v, k); };
    lerp(legL.hip, 'x', P.hipL); lerp(legR.hip, 'x', P.hipR); lerp(legL.knee, 'x', P.kneeL); lerp(legR.knee, 'x', P.kneeR);
    legL.ankle.rotation.x = damp(legL.ankle.rotation.x, -P.kneeL * 0.35 + (-P.hipL) * 0.4, k); legR.ankle.rotation.x = damp(legR.ankle.rotation.x, -P.kneeR * 0.35 + (-P.hipR) * 0.4, k);
    lerp(armL.sh, 'x', P.shL); lerp(armR.sh, 'x', P.shR); lerp(armL.sh, 'z', P.shLz); lerp(armR.sh, 'z', P.shRz); lerp(armL.el, 'x', P.elL); lerp(armR.el, 'x', P.elR); lerp(armL.el, 'z', P.elLz); lerp(armR.el, 'z', P.elRz);
    lerp(spine, 'x', P.spX); lerp(spine, 'y', P.spY); lerp(spine, 'z', P.spZ); lerp(head, 'x', P.headX); lerp(head, 'y', P.headY);
    chest.scale.y = 1 + Math.sin(t * 1.7) * 0.006; hips.position.y = 0.93 + P.bob + P.hipsY; hips.rotation.y = damp(hips.rotation.y, -P.spY * 0.6, k);
  }
  procBody(dt) {   // gestures for clip-based (GLB) models that lack the needed clip: simple whole-body motion
    const p = this.proc; p.t += dt; const kk = p.t / p.dur; if (kk >= 1) { this.proc = null; return; }
    const e = Math.sin(Math.PI * kk), fx = this.fx;
    if (p.name === 'Celebrate') { fx.position.y = Math.abs(Math.sin(p.t * 8)) * 0.3 * e; fx.rotation.y = Math.sin(p.t * 6) * 0.6 * e; }
    else if (p.name === 'Sad') fx.rotation.x = 0.3 * e; else if (p.name === 'Damage') fx.rotation.z = Math.sin(p.t * 30) * 0.07 * e; else { fx.rotation.x = 0.15 * e; fx.position.y = -0.03 * e; }
  }
}
