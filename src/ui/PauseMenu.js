import { RESOURCES } from '../data/resources.js';
import { openModal, closeModal, esc, $ } from './ui.js';

export class PauseMenu {
  constructor(game) { this.g = game; }
  open() {
    const g = this.g, s = g.settings;
    const el = openModal('pause', `<div class="card anim-in"><h1>PAUSED</h1><div class="menu-btns">
      <button class="btn big" id="p-res">RESUME</button><button class="btn" id="p-sci">NASA SCIENCE</button><button class="btn" id="p-how">HOW TO PLAY</button>
      <button class="btn ghost" id="p-restart">RESTART THIS MISSION</button><button class="btn ghost" id="p-menu">SAVE &amp; MAIN MENU</button></div>
      <div class="settings"><label><input type="checkbox" id="p-mute" ${s.muted ? 'checked' : ''}> Mute sound effects</label>
      <label>Mouse sensitivity <input type="range" id="p-sens" min="0.4" max="2.2" step="0.1" value="${s.sensitivity}"></label>
      <label>Graphics <select id="p-q"><option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low (fastest)</option></select></label>
      <label>UI size <input type="range" id="p-ui" min="0.8" max="1.4" step="0.1" value="${s.uiScale}"></label></div>
      <details><summary>What do the meters mean?</summary><ul class="guide">${Object.values(RESOURCES).map((r) => `<li><b>${r.icon} ${r.label}:</b> ${esc(r.tip)}</li>`).join('')}</ul></details></div>`, '', { esc: true });
    $('#p-res', el).onclick = () => closeModal('pause'); $('#p-sci', el).onclick = () => g.science.open(); $('#p-how', el).onclick = () => g.menu.how();
    $('#p-restart', el).onclick = () => g.restartMissionFromPause(); $('#p-menu', el).onclick = () => g.toMenu();
    $('#p-mute', el).onchange = (e) => { s.muted = e.target.checked; g.applySettings(); };
    $('#p-sens', el).oninput = (e) => { s.sensitivity = +e.target.value; g.applySettings(); }; $('#p-q', el).value = s.quality || 'auto'; $('#p-q', el).onchange = (e) => { s.quality = e.target.value; g.applySettings(); g.applyQuality(); };
    $('#p-ui', el).onchange = (e) => { s.uiScale = +e.target.value; g.applySettings(); };
  }
}
