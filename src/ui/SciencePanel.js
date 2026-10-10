import { SOURCES, TOPICS } from '../data/nasaSources.js';
import { openModal, closeModal, esc, $, $$ } from './ui.js';

export class SciencePanel {
  constructor(game) { this.g = game; }
  open() {
    let tab = 'topics', topic = 0;
    const render = () => {
      const t = TOPICS[topic], s = SOURCES[t.src];
      const body = tab === 'topics'
        ? `<div class="sci-grid"><nav>${TOPICS.map((x, i) => `<button class="${i === topic ? 'on' : ''}" data-i="${i}">${x.icon} ${x.name}</button>`).join('')}</nav>
           <article><h2>${t.icon} ${t.name}</h2><h4>What it is</h4><p>${esc(t.text)}</p><h4>Why it matters in the game</h4><p>${esc(t.why)}</p>
           <a class="nasa-btn" href="${s.url}" target="_blank" rel="noopener noreferrer">NASA SOURCE ↗ ${esc(s.name)}</a></article></div>`
        : `<table class="src"><thead><tr><th>Source</th><th>Why it is used</th><th>NASA URL</th></tr></thead><tbody>${Object.values(SOURCES).map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.why)}</td><td><a href="${x.url}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></td></tr>`).join('')}</tbody></table>`;
      const el = openModal('science', `<div class="card wide anim-in"><div class="head"><h1>NASA SCIENCE</h1><div class="tabs"><button data-t="topics" class="${tab === 'topics' ? 'on' : ''}">Topics</button><button data-t="sources" class="${tab === 'sources' ? 'on' : ''}">Sources</button></div></div>
        ${body}<p class="disc">Educational project created by StellarSpark for NASA Space Apps Challenge 2026. Not an official NASA product.</p><div class="row"><button class="btn" id="s-close">CLOSE</button></div></div>`, '', { esc: true });
      $$('[data-i]', el).forEach((b) => (b.onclick = () => { topic = +b.dataset.i; render(); })); $$('[data-t]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
      $('#s-close', el).onclick = () => closeModal('science');
    };
    render();
  }
}
