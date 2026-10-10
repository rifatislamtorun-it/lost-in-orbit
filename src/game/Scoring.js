export const RANKS = [
  { min: 85, name: 'OUTPOST MASTER', icon: '🏆' }, { min: 70, name: 'MARS COMMANDER', icon: '🚀' },
  { min: 50, name: 'MISSION ENGINEER', icon: '🛠️' }, { min: 0, name: 'SPACE ROOKIE', icon: '🌟' },
];
export const ACHIEVEMENTS = {
  first_sol: { icon: '🌅', title: 'FIRST SOL', desc: 'You completed your first mission on Mars!' },
  power_saver: { icon: '⚡', title: 'POWER SAVER', desc: 'Kept the colony powered through the dust storm.' },
  water_wise: { icon: '💧', title: 'WATER WISE', desc: 'Chose a smart long-term water plan.' },
  radiation_ready: { icon: '🛡️', title: 'RADIATION READY', desc: 'Protected the crew from radiation.' },
  science_explorer: { icon: '🔬', title: 'SCIENCE EXPLORER', desc: 'Answered 5 science questions correctly.' },
  mission_engineer: { icon: '🛠️', title: 'MISSION ENGINEER', desc: 'Survived the final outpost challenge.' },
  mars_commander: { icon: '🚀', title: 'MARS COMMANDER', desc: 'Earned a Mars Commander rank or higher.' },
};

export class Scoring {
  constructor() { this.reset(); }
  reset() {
    this.points = 0; this.science = 0; this.quizTotal = 0; this.quizCorrect = 0; this.quizDone = [];
    this.decisions = []; this.missionsDone = 0; this.discoveries = []; this.achievements = [];
  }
  addDecision(id, title, label, eng) { this.decisions = this.decisions.filter((d) => d.id !== id); this.decisions.push({ id, title, label, eng }); }
  engineering() { return this.decisions.length ? Math.round(this.decisions.reduce((a, d) => a + d.eng, 0) / this.decisions.length) : 0; }
  sciencePct() { return this.quizTotal ? Math.round((100 * this.quizCorrect) / this.quizTotal) : 0; }
  survival(res) { const ks = ['power', 'water', 'oxygen', 'food', 'radiation', 'health']; return Math.round(ks.reduce((a, k) => a + res.pct(k), 0) / ks.length); }
  missionPct() { return Math.round((100 * this.missionsDone) / 8); }
  total(res) { return Math.round(this.engineering() * 0.3 + this.sciencePct() * 0.3 + this.survival(res) * 0.3 + this.missionPct() * 0.1); }
  rank(res) { const t = this.total(res); return RANKS.find((r) => t >= r.min); }
  unlock(id) { if (this.achievements.includes(id)) return null; this.achievements.push(id); return { id, ...ACHIEVEMENTS[id] }; }
  serialize() { return JSON.parse(JSON.stringify(this)); }
  load(d) { if (d) Object.assign(this, JSON.parse(JSON.stringify(d))); }
}
