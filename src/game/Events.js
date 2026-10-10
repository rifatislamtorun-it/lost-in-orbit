import { CONFIG } from '../config/game.config.js';
import { EVENTS } from '../data/missions.js';

/** Controlled random Mission Control alerts: at most one per mission, educational, always a small trade-off. */
export class EventManager {
  constructor(game) { this.g = game; this.timer = 0; this.fired = false; this.last = null; }
  reset() { this.timer = CONFIG.events.minDelay + Math.random() * (CONFIG.events.maxDelay - CONFIG.events.minDelay); this.fired = false; }
  update(dt) {
    const g = this.g, m = g.missions;
    if (!m.active || this.fired || g.state !== 'playing' || g.cam.cine || m.steps.some((x) => x.busy) || m.current.final || m.index < 1) return;
    this.timer -= dt; if (this.timer > 0) return;
    this.fired = true; const pool = EVENTS.filter((e) => e.id !== this.last); const ev = pool[Math.floor(Math.random() * pool.length)]; this.last = ev.id; this.trigger(ev);
  }
  trigger(ev) {
    const g = this.g; g.audio.sfx('warn'); g.world.setAlerts([...g.missions.baseAlerts, ev.where]);
    g.hud.toast(`⚠ ${ev.title}`, 'warn');
    g.panels.event(ev, (opt) => {
      const lines = g.res.apply(opt.fx); if (opt.science) { g.score.science += opt.science; g.score.points += opt.science; }
      g.world.setAlerts(g.missions.baseAlerts); return lines;
    });
  }
}
