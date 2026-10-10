import { ASSETS } from '../config/game.config.js';
import { SaveSystem } from '../game/SaveSystem.js';
import { openModal, closeModal, $ } from './ui.js';

export class MainMenu {
  constructor(game) { this.g = game; }
  show() {
    const g = this.g, has = SaveSystem.has();
    const el = openModal('menu', `<img class="portrait" src="${ASSETS.PORTRAIT}" alt="The Commander"><div class="menu"><img class="logo" src="${ASSETS.LOGO}" alt="StellarSpark logo"><h1 class="title">LOST IN ORBIT</h1><p class="tagline">Run. Explore. Decide. Survive.</p>
      <div class="menu-btns">${has ? '<button class="btn big" id="m-cont">CONTINUE MISSION</button><button class="btn" id="m-new">NEW MISSION</button>' : '<button class="btn big" id="m-new">START MISSION</button>'}
      <button class="btn ghost" id="m-how">HOW TO PLAY</button><button class="btn ghost" id="m-sci">NASA SCIENCE</button><button class="btn ghost" id="m-cred">CREDITS</button>
      ${has ? '<button class="btn link" id="m-reset">Reset progress</button>' : ''}<button class="btn link" id="m-mute">${g.settings.muted ? '🔇 Sound off' : '🔊 Sound on'}</button></div>
      <p class="foot">Educational project created by StellarSpark for NASA Space Apps Challenge 2026 · Not an official NASA product</p></div>`, 'menu-bg', { count: false });
    const on = (id, f) => { const b = $(id, el); if (b) b.onclick = f; };
    on('#m-new', () => { g.audio.ensure(); g.newGame(); }); on('#m-cont', () => { g.audio.ensure(); g.continueGame(); });
    on('#m-how', () => this.how()); on('#m-sci', () => g.science.open()); on('#m-cred', () => this.credits());
    on('#m-reset', () => { if (confirm('Reset all saved progress?')) g.resetProgress(); });
    on('#m-mute', () => { g.settings.muted = !g.settings.muted; g.applySettings(); this.show(); });
  }
  hide() { closeModal('menu'); }
  how() {
    const el = openModal('how', `<div class="card wide anim-in"><h1>HOW TO PLAY</h1><div class="keys">
      <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move</span></div><div><kbd>Mouse</kbd><span>Look around (click the game to capture it)</span></div>
      <div><kbd>Shift</kbd><span>Sprint</span></div><div><kbd>Space</kbd><span>Jump</span></div><div><kbd>E</kbd><span>Interact</span></div><div><kbd>Esc</kbd><span>Menu</span></div></div>
      <p>Follow the 🎯 marker to your objective. Fix problems, answer science questions and make engineering trade-offs. Power, water, oxygen, food, radiation safety and crew health all depend on each other — and credits are limited!</p>
      <div class="row"><button class="btn" id="h-ok">GOT IT</button></div></div>`, '', { esc: true });
    $('#h-ok', el).onclick = () => closeModal('how');
  }
  credits() {
    const el = openModal('credits', `<div class="card anim-in center"><img class="logo sm" src="${ASSETS.LOGO}" alt="StellarSpark"><h1>LOST IN ORBIT</h1><p>Created by <b>StellarSpark</b></p><p>NASA Space Apps Challenge 2026</p>
      <p class="quote">“Educational game inspired by NASA science and Mars exploration.”</p><p class="disc">This is an independent student project and is not an official NASA product.</p><div class="row"><button class="btn" id="cr-ok">CLOSE</button></div></div>`, '', { esc: true });
    $('#cr-ok', el).onclick = () => closeModal('credits');
  }
}
