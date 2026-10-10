import { QUIZZES } from '../data/quizzes.js';
import { SOURCES } from '../data/nasaSources.js';
import { openModal, closeModal, nasaBtn, esc, $, $$ } from './ui.js';

export class QuizPanel {
  constructor(game) { this.g = game; }
  show(ids, onDone) {
    let i = 0; const g = this.g, L = 'ABCD';
    const render = () => {
      const q = QUIZZES[ids[i]], kind = { mc: 'QUESTION', tf: 'TRUE OR FALSE', scenario: 'SCENARIO', best: 'CHOOSE THE BEST SOLUTION' }[q.type];
      const el = openModal('quiz', `<div class="card quiz anim-in"><div class="tag">🔬 SCIENCE CHECK · ${kind} · ${i + 1}/${ids.length}</div>
        <h2>${esc(q.q)}</h2><div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}"><b>${L[k]}</b><span>${esc(o)}</span></button>`).join('')}</div>
        <div id="q-fb" class="feedback" hidden></div></div>`);
      $$('.opt', el).forEach((b) => (b.onclick = () => {
        const k = +b.dataset.k, r = g.quiz.answer(ids[i], k); g.audio.sfx(r.correct ? 'correct' : 'wrong');
        $$('.opt', el).forEach((o) => { o.disabled = true; if (+o.dataset.k === q.answer) o.classList.add('right'); });
        if (!r.correct) b.classList.add('wrong'); g.hud.setRes(g.res);
        const fb = $('#q-fb', el); fb.hidden = false; fb.className = 'feedback ' + (r.correct ? 'ok' : 'try');
        fb.innerHTML = `<h3>${r.correct ? '✔ Correct!  +10 Science Points' : '✖ Not quite — here\'s the cool part!  +3 for trying'}</h3><p>${esc(q.why)}</p>
          <div class="row">${nasaBtn(q.src, SOURCES)}<button class="btn" id="q-next">${i + 1 < ids.length ? 'NEXT QUESTION' : 'CONTINUE'}</button></div>`;
        $('#q-next', el).onclick = () => { i++; if (i < ids.length) render(); else { closeModal('quiz'); onDone(); } };
        $('#q-next', el).focus();
      }));
    };
    render();
  }
}
