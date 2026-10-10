import * as THREE from 'three';
import { ASSETS, CONFIG } from '../config/game.config.js';
import { RESOURCES } from '../data/resources.js';
import { LOCATION_INFO } from '../data/nasaSources.js';
import { $, esc } from './ui.js';

export class HUD {
  constructor(game) {
    this.g = game; this.frame = 0; this.rows = {};
    const root = document.createElement('div'); root.id = 'hud'; root.hidden = true;
    root.innerHTML = `
      <div class="hud-brand"><img src="${ASSETS.LOGO}" alt="StellarSpark logo"><div><b>STELLARSPARK</b><span>LOST IN ORBIT</span></div></div>
      <div class="hud-avatar panel"><img src="${ASSETS.AVATAR}" alt="Commander portrait"><div><b>COMMANDER</b><span>Mars Outpost Crew</span><small>H = helmet on/off</small></div></div>
      <div class="hud-res panel" id="hud-res">${Object.entries(RESOURCES).map(([k, r]) => `
        <div class="res" data-k="${k}" tabindex="0" data-tip="${esc(r.tip)}" title="${esc(r.tip)}">
          <span class="ri" aria-hidden="true">${r.icon}</span><span class="rl">${r.label}</span>
          <div class="bar"><i></i></div><span class="rv">0</span><em class="rs"></em></div>`).join('')}
        <div class="hud-score" id="hud-score"></div></div>
      <div class="hud-mission panel" id="hud-mission"></div>
      <div class="hud-controls panel"><span><kbd>W A S D</kbd> Move</span><span><kbd>Mouse</kbd> Camera</span><span><kbd>E</kbd> Interact</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>Space</kbd> Jump</span><span><kbd>Esc</kbd> Menu</span></div>
      <canvas id="minimap" width="140" height="140" aria-label="Colony map"></canvas>
      <div id="prompt" hidden></div>
      <div id="waypoint" hidden><div class="wp-arrow">▲</div><div class="wp-box"><span class="wp-icon">🎯</span><span class="wp-name"></span><span class="wp-dist"></span></div></div>
      <div id="hint" hidden>Click the game view to capture the mouse (or drag to look around)</div>
      <div id="cine-hint" hidden>Press Space to skip</div>
      <div id="toasts" aria-live="polite"></div><div id="achv"></div>
      <button id="hud-pause" class="icon-btn" aria-label="Open menu">☰</button>`;
    $('#ui').appendChild(root); this.root = root;
    root.querySelectorAll('.res').forEach((el) => (this.rows[el.dataset.k] = el));
    this.prompt = $('#prompt'); this.wp = $('#waypoint'); this.mm = $('#minimap').getContext('2d');
    $('#hud-pause').onclick = () => game.pauseMenu.open();
  }
  show(v) { this.root.hidden = !v; }
  setRes(res, deltas = {}) {
    for (const [k, el] of Object.entries(this.rows)) {
      const pct = res.pct(k), st = res.status(k), v = res.v[k];
      el.querySelector('.bar i').style.width = Math.max(0, Math.min(100, pct)) + '%';
      el.className = 'res ' + (st === 'CRITICAL' || st === 'DANGER' ? 'crit' : st === 'LOW' || st === 'WATCH' ? 'low' : 'good');
      el.querySelector('.rv').textContent = k === 'credits' ? Math.round(v) : Math.round(v) + '%'; el.querySelector('.rs').textContent = st;
      const d = deltas[k]; if (d && Math.abs(d) >= 1) {
        const b = document.createElement('b'); b.className = 'delta ' + (d > 0 ? 'up' : 'down'); b.textContent = (d > 0 ? '▲ +' : '▼ ') + Math.round(d); el.appendChild(b); setTimeout(() => b.remove(), 1500);
        el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 600);
      }
    }
    const s = this.g.score; $('#hud-score').innerHTML = `<span>★ ${s.points} pts</span><span>🔬 ${s.science} science</span>`;
  }
  setMission(mm) {
    const el = $('#hud-mission'), m = mm.current, g = this.g;
    if (!mm.steps.length) { el.innerHTML = `<div class="m-top"><b>MISSION ${String(m.id).padStart(2, '0')}</b></div><h3>${esc(m.title)}</h3><p class="m-obj">Mission Control is calling…</p>`; return; }
    const act = mm.activeSteps(), done = mm.steps.filter((s) => s.done).length, total = mm.steps.length;
    el.innerHTML = `<div class="m-top"><b>MISSION ${String(m.id).padStart(2, '0')} / 08</b><span>Reward: +${m.reward.points} pts</span></div>
      <h3>${esc(m.title)}</h3><p class="m-obj"><b>Objective:</b> ${esc(act.length ? act.map((s) => s.label).join(' • ') : m.objective)}</p>
      <div class="m-prog"><span>Progress ${done}/${total}</span><div class="bar"><i style="width:${(done / total) * 100}%"></i></div></div>
      <ul class="m-steps">${mm.steps.map((s) => `<li class="${s.done ? 'done' : act.includes(s) ? 'now' : ''}"><span>${s.done ? '✔' : act.includes(s) ? '➤' : '○'}</span> ${esc(s.label)}</li>`).join('')}</ul>`;
  }
  setPrompt(text, mission) {
    if (!text) { this.prompt.hidden = true; return; }
    this.prompt.hidden = false; this.prompt.className = mission ? 'mission' : ''; this.prompt.textContent = text;
  }
  toast(text, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = text; $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
  }
  achievement(a) {
    const d = document.createElement('div'); d.className = 'achv'; d.innerHTML = `<span class="ai">${a.icon}</span><div><small>ACHIEVEMENT UNLOCKED</small><b>${esc(a.title)}</b><span>${esc(a.desc)}</span></div>`;
    $('#achv').appendChild(d); setTimeout(() => d.classList.add('out'), 4600); setTimeout(() => d.remove(), 5200);
  }
  update() {
    const g = this.g, playing = g.state === 'playing' && !g.cam.cine; this.frame++;
    $('#hint').hidden = !(g.state === 'playing' && !g.input.locked && !g.cam.cine); $('#cine-hint').hidden = !g.cam.cine;
    const wt = playing ? g.interaction.waypointTarget() : null;
    if (!wt || wt.dist < CONFIG.interact.reach) this.wp.hidden = true;
    else {
      this.wp.hidden = false; const info = LOCATION_INFO[wt.loc.key] || {}; this.wp.querySelector('.wp-name').textContent = (info.name || wt.loc.key).toUpperCase();
      this.wp.querySelector('.wp-dist').textContent = Math.round(wt.dist) + ' m'; this.wp.querySelector('.wp-icon').textContent = info.icon || '🎯';
      const v = wt.point.clone().project(g.camera), behind = v.z > 1; let x = v.x, y = v.y; if (behind) { x = -x; y = -y; }
      const W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H / 2; let sx = (x * 0.5 + 0.5) * W, sy = (-y * 0.5 + 0.5) * H, dx = sx - cx, dy = sy - cy;
      if (behind && Math.abs(dx) + Math.abs(dy) < 5) dy = 1;
      const s = Math.min((cx - 110) / (Math.abs(dx) || 1e-3), (cy - 130) / (Math.abs(dy) || 1e-3)), off = behind || s < 1;
      if (off) { sx = cx + dx * s; sy = cy + dy * s; }
      this.wp.style.transform = `translate(${sx}px, ${sy}px)`; const ar = this.wp.querySelector('.wp-arrow'); ar.style.display = off ? 'block' : 'none'; ar.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
    }
    if (this.frame % 3 === 0) this.drawMap();
  }
  drawMap() {
    const g = this.g, c = this.mm, S = 140, sc = 62 / g.world.radius; c.clearRect(0, 0, S, S);
    c.fillStyle = 'rgba(8,14,40,.75)'; c.beginPath(); c.arc(70, 70, 68, 0, 7); c.fill(); c.strokeStyle = 'rgba(79,209,255,.6)'; c.lineWidth = 2; c.stroke();
    for (const loc of g.world.locations.values()) { const act = g.world.active.has(loc.key), alert = g.world.alerts.has(loc.key); c.fillStyle = alert ? '#ff5a5a' : act ? '#ffd23f' : '#4fd1ff'; c.beginPath(); c.arc(70 + loc.center.x * sc, 70 + loc.center.z * sc, act ? 4.5 : 2.5, 0, 7); c.fill(); }
    const p = g.player.group.position, f = g.player.facing, px = 70 + p.x * sc, py = 70 + p.z * sc; c.save(); c.translate(px, py); c.rotate(-f); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 7); c.lineTo(5, -5); c.lineTo(-5, -5); c.closePath(); c.fill(); c.restore();
  }
}
