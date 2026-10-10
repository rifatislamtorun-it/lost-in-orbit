import './style.css';
import { Game } from './game/Game.js';

window.addEventListener('DOMContentLoaded', async () => {
  try { const game = new Game(); window.__game = game; await game.init(); }
  catch (e) { console.error(e); const el = document.getElementById('load-pct'); if (el) el.textContent = 'Something went wrong while loading. Press F12 to see details, then refresh the page.'; }
});
