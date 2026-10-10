import * as THREE from 'three';
import { MISSIONS, DECISIONS } from '../data/missions.js';
import { LOCATION_INFO } from '../data/nasaSources.js';

export class MissionManager {
  constructor(game) { this.g = game; this.index = 0; this.steps = []; this.active = false; this.baseAlerts = []; }
  get current() { return MISSIONS[Math.min(this.index, MISSIONS.length - 1)]; }
  get total() { return MISSIONS.length; }

  begin(index) {
    const g = this.g; this.index = index; this.active = false; this.steps = []; this.baseAlerts = [];
    g.saveSnapshot(index); g.world.setActive([]); g.world.setAlerts([]); g.hud.setMission(this);
    g.audio.sfx('accept'); g.player.react('Wave', 2);
    g.panels.briefing(this.current, () => this.start());
  }
  start() {
    const g = this.g, m = this.current;
    this.steps = m.steps.map((s) => ({ ...s, done: false })); this.active = true;
    if (m.onStart) {
      g.res.apply(m.onStart.fx); g.hud.toast(`⚠ ${m.onStart.note}`, 'warn'); g.audio.sfx('warn');
      this.baseAlerts = (m.onStart.alert || []).map((k) => g.world.canonical(k));
    }
    g.world.setAlerts(this.baseAlerts); g.setStorm(m.storm || 0);
    this.refresh(); g.events.reset();
    const first = this.activeSteps()[0];
    if (first) {
      const loc = g.world.locations.get(g.world.canonical(first.target));
      if (loc) g.cam.cinematic(loc.center.clone().setY(loc.top * 0.6 + loc.center.y * 0.4), 3, THREE.MathUtils.clamp(loc.size * 0.9 + 10, 24, 70));
    }
  }
  activeSteps() {
    if (!this.active) return [];
    const un = this.steps.filter((s) => !s.done); if (!un.length) return [];
    const gmin = Math.min(...un.map((s) => s.g)); return un.filter((s) => s.g === gmin);
  }
  stepFor(key) { return this.activeSteps().find((s) => this.g.world.canonical(s.target) === key); }
  refresh() { const g = this.g; g.world.setActive(this.activeSteps().map((s) => g.world.canonical(s.target))); g.hud.setMission(this); }

  interact(key) {
    const g = this.g, step = this.stepFor(key); if (!step) return false;
    if (step.busy) return true; step.busy = true;
    const loc = g.world.locations.get(key); if (loc) g.player.faceToward(loc.target(g.player.group.position));
    g.player.react(step.anim || { repair: 'Repair', quiz: 'Interact', decision: 'Interact', visit: 'Interact' }[step.type], 1);
    if (step.rover) g.world.driveRover();
    setTimeout(() => this.run(step), 650);
    return true;
  }
  run(step) {
    const g = this.g, done = () => { step.busy = false; this.finish(step); };
    const cancel = () => { step.busy = false; };
    switch (step.type) {
      case 'visit': { const info = LOCATION_INFO[step.target] || {}; g.panels.info({ title: step.title || info.name, icon: info.icon, text: step.text || info.text, src: step.src !== undefined ? step.src : info.src, button: 'CONTINUE' }, done); break; }
      case 'quiz': g.panels.quiz(step.quiz, done); break;
      case 'repair': g.panels.repair(step, () => { if (step.fx) g.res.apply(step.fx); done(); }); break;
      case 'decision': g.panels.decision(DECISIONS[step.decision], step.decision, done); break;
      default: cancel();
    }
  }
  finish(step) {
    const g = this.g; step.done = true; g.score.points += 10; g.audio.sfx('accept'); g.hud.toast('✔ Objective complete  +10', 'good');
    if (this.activeSteps().length === 0) this.completeMission(); else this.refresh();
  }
  completeMission() {
    const g = this.g, m = this.current; this.active = false; g.world.setActive([]); g.world.setAlerts([]); this.baseAlerts = []; g.hud.setMission(this);
    const cycles = []; let failed = null;
    for (let i = 0; i < (m.final ? 3 : 1); i++) { cycles.push(g.res.cycle()); failed = g.res.failure(); if (failed) break; }
    if (m.onComplete) { g.res.apply(m.onComplete.fx); }
    g.setStorm(0);
    if (failed) { g.player.react('Sad', 2); g.audio.sfx('wrong'); g.panels.failed(failed, cycles, () => g.retryMission(), () => g.toMenu()); return; }
    g.res.apply({ credits: m.reward.credits }); g.score.points += m.reward.points; g.score.missionsDone++;
    const d = (id) => g.score.decisions.find((x) => x.id === id);
    if (m.id === 1) g.unlock('first_sol');
    if (m.id === 3 && d('water_plan') && d('water_plan').eng >= 85) g.unlock('water_wise');
    if (m.id === 5 && g.res.v.power >= 40) g.unlock('power_saver');
    if (m.id === 6 && d('rad_plan') && d('rad_plan').eng >= 75) g.unlock('radiation_ready');
    g.player.react('Celebrate', 2.4); g.audio.sfx('complete');
    g.panels.complete(m, cycles, m.final ? () => g.finish(cycles) : () => this.begin(this.index + 1));
  }
}
