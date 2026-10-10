export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let count = 0, cb = () => {}; const open = new Map(), escStack = [];
export const onModalChange = (f) => (cb = f);
/** Show an overlay. Counted overlays pause gameplay input; {esc:true} lets the Esc key close it. */
export function openModal(id, html, cls = '', opts = {}) {
  let el = document.getElementById(id); if (!el) { el = document.createElement('div'); el.id = id; $('#ui').appendChild(el); }
  el.className = 'overlay ' + cls; el.innerHTML = html; el.hidden = false; const counted = opts.count !== false;
  if (!open.has(id)) { open.set(id, counted); if (counted) count++; }
  if (opts.esc) { const i = escStack.indexOf(id); if (i >= 0) escStack.splice(i, 1); escStack.push(id); }
  if (counted) cb(count); return el;
}
export function closeModal(id) {
  const el = document.getElementById(id); if (el) { el.hidden = true; el.innerHTML = ''; }
  if (open.has(id)) { if (open.get(id)) count--; open.delete(id); }
  const i = escStack.indexOf(id); if (i >= 0) escStack.splice(i, 1); cb(count);
}
export const closeAll = () => [...open.keys()].forEach(closeModal);
export const popEsc = () => { const id = escStack.pop(); if (!id) return false; closeModal(id); return true; };
export const isOpen = (id) => open.has(id);
export const nasaBtn = (src, SOURCES) => (src && SOURCES[src]
  ? `<a class="nasa-btn" href="${SOURCES[src].url}" target="_blank" rel="noopener noreferrer" title="${esc(SOURCES[src].name)}">NASA SOURCE ↗</a>`
  : `<span class="note-tag">GAME NOTE — simplified for play</span>`);
