import * as THREE from 'three';
import { CONFIG } from '../config/game.config.js';
import { LOCATION_INFO } from '../data/nasaSources.js';

export class Interaction {
  constructor(game) { this.g = game; this.target = null; this.tmp = new THREE.Vector3(); }
  update() {
    const g = this.g; if (g.state !== 'playing') { this.target = null; g.hud.setPrompt(null); return; }
    const p = g.player.group.position; let best = null, bd = 1e9;
    for (const loc of g.world.locations.values()) { const d = loc.distanceTo(p); if (d < bd) { bd = d; best = loc; } }
    if (best && bd <= CONFIG.interact.reach) {
      this.target = best; const step = g.missions.stepFor(best.key); const info = LOCATION_INFO[best.key];
      g.hud.setPrompt(`[ E ]  ${step ? step.label : info ? info.verb : 'Inspect'}`, !!step);
    } else { this.target = null; g.hud.setPrompt(null); }
    if (this.target && g.input.hit('KeyE')) g.interact(this.target.key);
  }
  /** Nearest objective for the waypoint marker. */
  waypointTarget() {
    const g = this.g, steps = g.missions.activeSteps(); if (!steps.length) return null;
    const p = g.player.group.position; let best = null, bd = 1e9;
    for (const s of steps) { const loc = g.world.locations.get(g.world.canonical(s.target)); if (!loc) continue; const d = loc.distanceTo(p); if (d < bd) { bd = d; best = loc; } }
    return best ? { loc: best, dist: bd, point: best.target(p) } : null;
  }
}
