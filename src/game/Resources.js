import { RESOURCES, DEFAULT_SYS } from '../data/resources.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Resources {
  constructor() { this.listeners = []; this.reset(); }
  reset() {
    this.v = {}; for (const k in RESOURCES) this.v[k] = RESOURCES[k].start;
    this.sys = { ...DEFAULT_SYS }; this.emit();
  }
  on(fn) { this.listeners.push(fn); }
  emit(deltas) { this.listeners.forEach((f) => f(this, deltas)); }
  status(k) {
    const p = this.pct(k);
    if (k === 'credits') return p < 10 ? 'LOW' : 'OK';
    if (k === 'radiation') return p >= 60 ? 'SAFE' : p >= 30 ? 'WATCH' : 'DANGER';
    return p >= 50 ? 'GOOD' : p >= 25 ? 'LOW' : 'CRITICAL';
  }
  pct(k) { return (this.v[k] / RESOURCES[k].max) * 100; }
  /** Apply {resource: delta, sys: {name: delta}}. Returns list of {k, d, sys} changes. */
  apply(fx = {}) {
    const out = [], deltas = {};
    for (const [k, val] of Object.entries(fx)) {
      if (k === 'sys') {
        for (const [s, d] of Object.entries(val)) {
          this.sys[s] = +clamp(this.sys[s] + d, 0, 2).toFixed(2); out.push({ k: s, d, sys: true });
        }
      } else if (this.v[k] !== undefined) {
        const before = this.v[k]; this.v[k] = clamp(before + val, 0, RESOURCES[k].max);
        deltas[k] = this.v[k] - before; out.push({ k, d: deltas[k] });
      }
    }
    this.emit(deltas); return out;
  }
  /** One mission cycle (about one sol of colony operation). */
  cycle() {
    const s = this.sys, v = this.v, before = { ...v }, notes = [];
    const pf = v.power >= 30 ? 1 : v.power >= 10 ? 0.6 : 0.3;
    if (pf < 1) notes.push('Low power slowed the water, oxygen and food machines.');
    v.power += 34 * s.solar - 32 * s.demand;
    v.water += 16 * s.waterProd * pf - 16 * s.waterUse;
    v.oxygen += 14 * s.o2Prod * pf - 14;
    v.food += 12 * s.foodProd * pf - 12 * s.cons;
    v.radiation += (s.shield - 1) * 8 - s.radLoad;
    if (s.risk > 0 && Math.random() < s.risk) { v.power -= 15; notes.push('A power flicker drained some energy — a risk you chose to take.'); }
    for (const k of ['power', 'water', 'oxygen', 'food', 'radiation']) v[k] = clamp(v[k], 0, 100);
    const problems = ['oxygen', 'water', 'food', 'radiation'].filter((k) => v[k] < 30).length;
    v.health += problems ? -6 * problems : 4;
    if (s.cons < 1) { v.health -= 3; notes.push('Smaller meals are tiring the crew.'); }
    v.health = clamp(v.health, 0, 100);
    for (const k of ['oxygen', 'water', 'food', 'radiation']) if (v[k] < 30) notes.push(`${RESOURCES[k].label} is low!`);
    const after = { ...v }; const deltas = {}; for (const k in after) deltas[k] = after[k] - before[k];
    this.emit(deltas); return { before, after, notes };
  }
  failure() {
    const v = this.v;
    if (v.oxygen <= 0) return 'The colony ran out of oxygen. Oxygen machines need power and repairs — keep an eye on both.';
    if (v.health <= 0) return 'The crew\'s health dropped too low. Low water, food, radiation safety or oxygen all hurt the crew.';
    return null;
  }
  serialize() { return { v: { ...this.v }, sys: { ...this.sys } }; }
  load(d) { if (!d) return; this.v = { ...this.v, ...d.v }; this.sys = { ...DEFAULT_SYS, ...d.sys }; this.emit(); }
}
