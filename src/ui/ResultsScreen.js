import { RESOURCES } from '../data/resources.js';
import { ACHIEVEMENTS } from '../game/Scoring.js';
import { openModal, closeModal, esc, $ } from './ui.js';

export class ResultsScreen {
  constructor(game) { this.g = game; }
  show() {
    const g = this.g, s = g.score, r = g.res, rank = s.rank(r), stars = (e) => (e >= 90 ? '★★★' : e >= 65 ? '★★☆' : '★☆☆');
    const el = openModal('results', `<div class="card wide results anim-in"><div class="big-ic pop">${rank.icon}</div><h1>OUTPOST SURVIVED!</h1><h2>Congratulations, Commander!</h2>
      <div class="rank">${rank.name}</div>
      <div class="scores"><div><b>${s.engineering()}</b><span>Engineering</span></div><div><b>${s.sciencePct()}</b><span>Science</span></div><div><b>${s.survival(r)}</b><span>Survival</span></div><div><b>${s.missionPct()}</b><span>Missions</span></div></div>
      <div class="total">TOTAL SCORE <b>${s.total(r)}/100</b> · ${s.points} points</div>
      <div class="two"><div><h3>Resources remaining</h3>${['power', 'water', 'oxygen', 'food', 'radiation', 'health'].map((k) => `<div class="mini"><span>${RESOURCES[k].icon} ${RESOURCES[k].label}</span><div class="bar"><i style="width:${r.pct(k)}%"></i></div><b>${Math.round(r.v[k])}%</b></div>`).join('')}<p>🪙 Credits left: ${Math.round(r.v.credits)}</p></div>
      <div><h3>Engineering decisions</h3><ul class="dec">${s.decisions.map((d) => `<li><span class="stars">${stars(d.eng)}</span> ${esc(d.title)}: ${esc(d.label)}</li>`).join('')}</ul>
      <h3>Quiz performance</h3><p>${s.quizCorrect} of ${s.quizTotal} answered correctly on the first try</p>
      <h3>Achievements</h3><p>${s.achievements.map((a) => ACHIEVEMENTS[a].icon + ' ' + ACHIEVEMENTS[a].title).join(' · ') || '—'}</p></div></div>
      <div class="row"><button class="btn big" id="r-again">PLAY AGAIN</button><button class="btn ghost" id="r-sci">NASA SCIENCE</button><button class="btn ghost" id="r-menu">MAIN MENU</button></div>
      <p class="disc">Educational project created by StellarSpark for NASA Space Apps Challenge 2026. Not an official NASA product.</p></div>`);
    $('#r-again', el).onclick = () => { closeModal('results'); g.newGame(); }; $('#r-menu', el).onclick = () => g.toMenu(); $('#r-sci', el).onclick = () => g.science.open();
  }
}
