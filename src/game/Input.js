export class Input {
  constructor(dom) {
    this.dom = dom; this.keys = new Set(); this.pressed = new Set(); this.enabled = false;
    this.dx = 0; this.dy = 0; this.wheel = 0; this.locked = false; this.dragging = false; this.onLockChange = null;
    window.addEventListener('keydown', (e) => {
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code); this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('mousedown', () => {
      this.dragging = true;
      if (this.enabled && !this.locked) { try { const p = dom.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch {} }
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => { if (this.enabled && (this.locked || this.dragging)) { this.dx += e.movementX; this.dy += e.movementY; } });
    dom.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += e.deltaY; }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === dom; this.onLockChange && this.onLockChange(this.locked); });
  }
  down(c) { return this.keys.has(c); }
  hit(c) { return this.pressed.has(c); }
  endFrame() { this.pressed.clear(); this.dx = this.dy = this.wheel = 0; }
  relock() { if (!this.locked) { try { const p = this.dom.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch {} } }
  releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }
}
