import { RESOURCES, SYS_LABELS, DOWN_IS_GOOD } from '../data/resources.js';
import { SOURCES } from '../data/nasaSources.js';
import { QuizPanel } from './QuizPanel.js';
import { openModal, closeModal, nasaBtn, esc, $, $$ } from './ui.js';

const sign = (d, f) => (d > 0 ? '▲ +' : '▼ ') + f(d);
export function chips(lines) {
  return lines.filter((l) => Math.abs(l.d) > (l.sys ? 0.001 : 0.4)).map((l) => {
    if (l.sys) { const good = DOWN_IS_GOOD.includes(l.k) ? l.d < 0 : l.d > 0; return `<span class="chip ${good ? 'up' : 'down'}">${SYS_LABELS[l.k]} ${sign(l.d, (d) => Math.round(d * 100) + '%')}</span>`; }
    const good = l.d > 0; return `<span class="chip ${good ? 'up' : 'down'}">${RESOURCES[l.k].label} ${sign(l.d, (d) => Math.round(d))}</span>`;
  }).join('');
}

export class Panels {
  constructor(game) { this.g = game; this.quizPanel = new QuizPanel(game); }
  quiz(ids, done) { this.quizPanel.show(ids, done); }
  pause() { this.g.pauseMenu.open(); }

  briefing(m, start) {
    const el = openModal('brief', `<div class="card brief anim-in"><div class="astro">👩‍🚀</div><div class="tag">MISSION CONTROL · INCOMING MESSAGE</div>
      <h4>MISSION ${String(m.id).padStart(2, '0')}</h4><h1>${esc(m.title)}</h1><p class="quote">“${esc(m.brief)}”</p>
      <div class="obj"><b>OBJECTIVE</b><span>${esc(m.objective)}</span></div><div class="reward">Reward: +${m.reward.points} Mission Points${m.reward.credits ? ` · +${m.reward.credits} credits` : ''}</div>
      <button class="btn big" id="b-start">START MISSION</button></div>`);
    $('#b-start', el).onclick = () => { closeModal('brief'); this.g.audio.sfx('accept'); start(); }; $('#b-start', el).focus();
  }
  info({ title, icon, text, src, button }, done) {
    const el = openModal('info', `<div class="card info anim-in"><div class="big-ic">${icon || '🛰️'}</div><h2>${esc(title)}</h2><p>${esc(text)}</p>
      <div class="row">${nasaBtn(src, SOURCES)}<button class="btn" id="i-ok">${button || 'CONTINUE'}</button></div></div>`, '', { esc: button === 'CLOSE' });
    $('#i-ok', el).onclick = () => { closeModal('info'); done(); }; $('#i-ok', el).focus();
  }

  decision(dec, id, done) {
    const g = this.g, picks = new Set();
    const el = openModal('decision', `<div class="card decision anim-in"><div class="tag">⚖ ENGINEERING TRADE-OFF · credits available: <b>${Math.round(g.res.v.credits)}</b></div>
      <h2>${esc(dec.title)}</h2><p>${esc(dec.situation)}${dec.pick > 1 ? ` <b>(Choose ${dec.pick})</b>` : ''}</p>
      <div class="opts">${dec.options.map((o, k) => { const need = -(o.fx.credits || 0), broke = need > g.res.v.credits;
        return `<button class="opt big" data-k="${k}" ${broke ? 'disabled' : ''}><b>${k + 1}</b><span><strong>${esc(o.label)}</strong><small>${esc(o.cost)}${broke ? ' — not enough credits' : ''}</small></span><i class="tick">✔</i></button>`; }).join('')}</div>
      <div class="row"><button class="btn" id="d-ok" disabled>CONFIRM CHOICE</button></div></div>`);
    const ok = $('#d-ok', el);
    $$('.opt', el).forEach((b) => (b.onclick = () => {
      const k = +b.dataset.k;
      if (dec.pick === 1) { picks.clear(); $$('.opt', el).forEach((o) => o.classList.remove('sel')); }
      if (picks.has(k)) { picks.delete(k); b.classList.remove('sel'); } else if (picks.size < dec.pick) { picks.add(k); b.classList.add('sel'); }
      ok.disabled = picks.size !== dec.pick;
    }));
    ok.onclick = () => {
      const chosen = [...picks].map((k) => dec.options[k]); let lines = [];
      chosen.forEach((o) => (lines = lines.concat(g.res.apply(o.fx))));
      const eng = Math.round(chosen.reduce((a, o) => a + o.eng, 0) / chosen.length); g.score.addDecision(id, dec.title, chosen.map((o) => o.label).join(' + '), eng); g.hud.setRes(g.res);
      g.audio.sfx(eng >= 70 ? 'correct' : 'wrong');
      const stars = eng >= 90 ? '★★★' : eng >= 65 ? '★★☆' : '★☆☆';
      el.innerHTML = `<div class="card decision anim-in"><div class="tag">RESULT</div><h2>${esc(dec.title)}</h2><div class="stars">${stars}<small> Engineering rating: ${eng}/100</small></div>
        ${chosen.map((o) => `<p><strong>${esc(o.label)}:</strong> ${esc(o.feedback)}</p>`).join('')}<div class="chips">${chips(lines)}</div>
        <p class="lesson">💡 Every choice has a cost. Engineers balance power, water, air, food, safety and budget.</p><div class="row"><button class="btn" id="d-next">CONTINUE</button></div></div>`;
      $('#d-next', el).onclick = () => { closeModal('decision'); done(); }; $('#d-next', el).focus();
    };
  }

  repair(step, done) {
    const g = this.g; let hits = 0, misses = 0, pos = 0, dir = 1, speed = 0.9, zone = 0.5, raf = 0, last = performance.now(), alive = true; const W = () => 0.2 + Math.min(0.2, misses * 0.04);
    const el = openModal('repair', `<div class="card repair anim-in"><div class="tag">🔧 REPAIR</div><h2>Fix the ${esc(step.title || 'machine')}</h2>
      <p>Press <kbd>SPACE</kbd> or tap <b>FIX!</b> when the marker is inside the green zone. Repair 3 circuits!</p>
      <div class="rbar"><div id="r-zone"></div><div id="r-mark"></div></div><div class="dots" id="r-dots">○ ○ ○</div><div id="r-msg" class="feedback">&nbsp;</div>
      <button class="btn big" id="r-go">FIX!</button></div>`);
    const zoneEl = $('#r-zone', el), mark = $('#r-mark', el), msg = $('#r-msg', el);
    const place = () => { zone = 0.15 + Math.random() * 0.7; zoneEl.style.left = (zone - W() / 2) * 100 + '%'; zoneEl.style.width = W() * 100 + '%'; }; place();
    const tick = (t) => { if (!alive) return; const dt = (t - last) / 1000; last = t; pos += dir * speed * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } mark.style.left = pos * 100 + '%'; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const stop = () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', key, true); };
    const press = () => {
      if (!alive) return;
      if (Math.abs(pos - zone) <= W() / 2) { hits++; g.audio.sfx('repair'); g.audio.sfx('correct'); speed += 0.25; msg.textContent = '✔ Circuit fixed!'; msg.className = 'feedback ok'; }
      else { misses++; g.audio.sfx('wrong'); msg.textContent = 'Almost! Try again — the green zone just got bigger.'; msg.className = 'feedback try'; }
      $('#r-dots', el).textContent = [0, 1, 2].map((k) => (k < hits ? '●' : '○')).join(' ');
      if (hits >= 3) { stop(); el.querySelector('.card').innerHTML = `<div class="big-ic">✅</div><h2>Repair complete!</h2><p>Great teamwork, Commander. The machine is running better.</p><div class="row"><button class="btn" id="r-ok">CONTINUE</button></div>`; $('#r-ok', el).onclick = () => { closeModal('repair'); done(); }; $('#r-ok', el).focus(); }
      else place();
    };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); press(); } };
    document.addEventListener('keydown', key, true); $('#r-go', el).onclick = (e) => { press(); e.target.blur(); };
  }

  complete(m, cycles, next) {
    const g = this.g, first = cycles[0].before, last = cycles[cycles.length - 1].after;
    const notes = [...new Set(cycles.flatMap((c) => c.notes))]; if (m.onComplete) notes.push(m.onComplete.note);
    const conf = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * 1.2}s;background:hsl(${i * 37},90%,60%)"></i>`).join('');
    const rows = ['power', 'water', 'oxygen', 'food', 'radiation', 'health'].map((k) => { const d = last[k] - first[k]; return `<div class="crow"><span>${RESOURCES[k].icon} ${RESOURCES[k].label}</span><b>${Math.round(first[k])}% → ${Math.round(last[k])}%</b><em class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(d))}</em></div>`; }).join('');
    const el = openModal('complete', `<div class="confetti">${conf}</div><div class="card complete anim-in"><div class="big-ic pop">🎉</div><div class="tag">MISSION ${String(m.id).padStart(2, '0')}</div><h1>${m.final ? 'OUTPOST SURVIVED!' : 'MISSION COMPLETE!'}</h1>
      <p>+${m.reward.points} Mission Points${m.reward.credits ? ` · +${m.reward.credits} credits` : ''}</p>
      <h3>${m.final ? `After ${cycles.length} sols of testing:` : 'Colony status after this sol:'}</h3><div class="ctable">${rows}</div>
      ${notes.length ? `<ul class="notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <button class="btn big" id="c-next">${m.final ? 'SEE FINAL RESULTS' : 'NEXT MISSION'}</button></div>`);
    $('#c-next', el).onclick = () => { closeModal('complete'); next(); }; $('#c-next', el).focus();
  }
  failed(reason, cycles, retry, menu) {
    const el = openModal('failed', `<div class="card failed anim-in"><div class="big-ic">🛠️</div><h1>Mission needs another attempt</h1><p>${esc(reason)}</p>
      <p class="lesson">💡 Tip: fix the problem that shows ▼ on the HUD, and remember machines slow down when power is low.</p>
      <div class="row"><button class="btn big" id="f-retry">TRY AGAIN</button><button class="btn ghost" id="f-menu">MAIN MENU</button></div></div>`);
    $('#f-retry', el).onclick = retry; $('#f-menu', el).onclick = menu; $('#f-retry', el).focus();
  }
  event(ev, apply) {
    const el = openModal('event', `<div class="card event anim-in"><div class="tag warn">⚠ MISSION CONTROL ALERT</div><div class="big-ic">${ev.icon}</div><h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
      <div class="opts">${ev.options.map((o, k) => `<button class="opt big" data-k="${k}"><b>${k + 1}</b><span><strong>${esc(o.label)}</strong><small>${esc(o.cost)}</small></span></button>`).join('')}</div></div>`);
    $$('.opt', el).forEach((b) => (b.onclick = () => {
      const o = ev.options[+b.dataset.k], lines = apply(o); this.g.hud.setRes(this.g.res);
      el.innerHTML = `<div class="card event anim-in"><div class="tag">ALERT RESOLVED</div><h2>${esc(ev.title)}</h2><p>${esc(o.result)}</p><div class="chips">${chips(lines)}</div><div class="row"><button class="btn" id="e-ok">BACK TO WORK</button></div></div>`;
      $('#e-ok', el).onclick = () => closeModal('event'); $('#e-ok', el).focus();
    }));
  }
}
