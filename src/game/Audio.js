// Tiny WebAudio sound effects (no files, no music). Optional + mutable.
const SFX = {
  click: [[660, .05, 'triangle', .05]], interact: [[520, .08, 'triangle', .07], [780, .1, 'triangle', .07]],
  accept: [[440, .1, 'sine', .08], [660, .1, 'sine', .08], [880, .16, 'sine', .08]],
  complete: [[523, .12, 'triangle', .09], [659, .12, 'triangle', .09], [784, .12, 'triangle', .09], [1046, .3, 'triangle', .09]],
  warn: [[300, .16, 'square', .04], [240, .22, 'square', .04]],
  correct: [[660, .1, 'sine', .09], [990, .2, 'sine', .09]], wrong: [[330, .14, 'sine', .07], [262, .22, 'sine', .07]],
  achieve: [[784, .1, 'triangle', .08], [988, .1, 'triangle', .08], [1175, .1, 'triangle', .08], [1568, .3, 'triangle', .08]],
  jump: [[300, .07, 'sine', .05], [450, .08, 'sine', .05]], repair: [[900, .05, 'square', .03]],
};
export class AudioFX {
  constructor(settings) { this.s = settings; this.ctx = null; }
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return false; } } if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
  sfx(name) {
    if (this.s.muted || !SFX[name] || !this.ensure()) return;
    let t = this.ctx.currentTime;
    for (const [f, d, type, vol] of SFX[name]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + 0.02); t += d * 0.85;
    }
  }
}
