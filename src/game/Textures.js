import * as THREE from 'three';
// All textures are generated procedurally (no external image files) and cached.
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function lattice(seed) { const r = rng(seed), g = new Float32Array(64 * 64); for (let i = 0; i < g.length; i++) g[i] = r(); return g; }
const sm = (t) => t * t * (3 - 2 * t);
function vnoise(g, x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per, x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
  const a = g[y0 * 64 + x0], b = g[y0 * 64 + x1], c = g[y1 * 64 + x0], d = g[y1 * 64 + x1], u = sm(xf), v = sm(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Tileable fractal height field in 0..1. base*2^(oct-1) must be <= 64. */
function field(N, base, oct, seed) {
  const g = lattice(seed), f = new Float32Array(N * N); let mn = 1e9, mx = -1e9;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let a = 0.5, fr = base, s = 0; for (let o = 0; o < oct; o++) { s += a * vnoise(g, (x / N) * fr, (y / N) * fr, fr); fr *= 2; a *= 0.5; }
    f[y * N + x] = s; if (s < mn) mn = s; if (s > mx) mx = s;
  }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - mn) / (mx - mn || 1); return f;
}
function normalCanvas(h, N, strength) {
  const c = mk(N, N), x = c.getContext('2d'), im = x.createImageData(N, N), W = (i) => ((i % N) + N) % N;
  for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) {
    const dx = (h[y * N + W(xx + 1)] - h[y * N + W(xx - 1)]) * strength, dy = (h[W(y + 1) * N + xx] - h[W(y - 1) * N + xx]) * strength, l = Math.hypot(dx, dy, 1), o = (y * N + xx) * 4;
    im.data[o] = (-dx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
function T(canvas, { srgb = true, repeat = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; return t;
}
const cache = {}; const once = (k, f) => cache[k] || (cache[k] = f());
export const rep = (tex, x, y) => { const t = tex.clone(); t.repeat.set(x, y); t.needsUpdate = true; return t; };

export const Tex = {
  mars: () => once('mars', () => {
    const N = 512, h = field(N, 4, 5, 7), h2 = field(N, 8, 4, 11), c = mk(N, N), x = c.getContext('2d'), im = x.createImageData(N, N), r = rng(5), hh = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const v = h[i], w = h2[i], sh = 0.62 + 0.7 * v, dark = 1 - 0.2 * sm((w - 0.55) / 0.25 < 0 ? 0 : Math.min(1, (w - 0.55) / 0.25)), peb = r() > 0.995 ? 0.7 : 1, o = i * 4;
      im.data[o] = Math.min(255, 188 * sh * dark * peb); im.data[o + 1] = Math.min(255, 100 * sh * dark * peb); im.data[o + 2] = Math.min(255, 62 * sh * dark * peb); im.data[o + 3] = 255; hh[i] = v * 0.7 + w * 0.3;
    }
    x.putImageData(im, 0, 0); return { map: T(c), normal: T(normalCanvas(hh, N, 3.2), { srgb: false }) };
  }),
  rock: () => once('rock', () => {
    const N = 256, h = field(N, 4, 6, 21), c = mk(N, N), x = c.getContext('2d'), im = x.createImageData(N, N);
    for (let i = 0; i < N * N; i++) { const v = h[i], o = i * 4, s = 0.45 + 0.8 * v; im.data[o] = 128 * s; im.data[o + 1] = 74 * s; im.data[o + 2] = 54 * s; im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0); return { map: T(c), normal: T(normalCanvas(h, N, 1.6), { srgb: false }) };
  }),
  panel: () => once('panel', () => {
    const N = 512, c = mk(N, N), x = c.getContext('2d'), r = rng(9), hf = new Float32Array(N * N).fill(0.6), dirt = field(N, 4, 5, 33);
    x.fillStyle = '#e4e8ee'; x.fillRect(0, 0, N, N); const P = 128;
    for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) { const t = 0.94 + r() * 0.06; x.fillStyle = `rgb(${228 * t},${232 * t},${238 * t})`; x.fillRect(px * P, py * P, P, P); }
    const im = x.getImageData(0, 0, N, N);
    for (let i = 0; i < N * N; i++) { const d = 1 - dirt[i] * 0.22; im.data[i * 4] *= d; im.data[i * 4 + 1] *= d * 0.98; im.data[i * 4 + 2] *= d * 0.94; }
    x.putImageData(im, 0, 0);
    x.strokeStyle = 'rgba(70,80,95,.85)'; x.lineWidth = 2.5; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * P, 0); x.lineTo(i * P, N); x.stroke(); x.beginPath(); x.moveTo(0, i * P); x.lineTo(N, i * P); x.stroke(); }
    x.fillStyle = 'rgba(60,70,85,.9)'; for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) for (const [ox, oy] of [[10, 10], [P - 10, 10], [10, P - 10], [P - 10, P - 10]]) { x.beginPath(); x.arc(px * P + ox, py * P + oy, 3, 0, 7); x.fill(); }
    for (let i = 0; i <= 4; i++) for (let k = -3; k <= 3; k++) for (let a = 0; a < N; a++) { const u = ((i * P + k) % N + N) % N; hf[a * N + u] = Math.min(hf[a * N + u], 0.2 + Math.abs(k) * 0.12); hf[u * N + a] = Math.min(hf[u * N + a], 0.2 + Math.abs(k) * 0.12); }
    const t = T(c); t.repeat.set(2, 2); const n = T(normalCanvas(hf, N, 4), { srgb: false }); n.repeat.set(2, 2); return { map: t, normal: n };
  }),
  solar: () => once('solar', () => {
    const c = mk(256, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, '#173c8f'); g.addColorStop(0.5, '#0d2a6b'); g.addColorStop(1, '#14397f');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(150,185,255,.55)'; x.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 256); x.stroke(); } for (let i = 0; i <= 12; i++) { x.beginPath(); x.moveTo(0, i * 21.3); x.lineTo(256, i * 21.3); x.stroke(); }
    x.strokeStyle = 'rgba(220,230,255,.35)'; x.lineWidth = 3; x.strokeRect(0, 0, 256, 256); return T(c, { repeat: false });
  }),
  road: () => once('road', () => {
    const W = 128, H = 256, c = mk(W, H), x = c.getContext('2d'), h = field(256, 8, 4, 41);
    const im = x.createImageData(W, H); for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { const v = h[yy * 256 + xx * 2], o = (yy * W + xx) * 4, e = Math.min(xx, W - xx) / 14, f = 0.7 + 0.5 * v, edge = Math.min(1, e); im.data[o] = 84 * f * (0.7 + 0.3 * edge) + 20 * (1 - edge); im.data[o + 1] = 66 * f * (0.7 + 0.3 * edge) + 8 * (1 - edge); im.data[o + 2] = 58 * f * (0.7 + 0.3 * edge); im.data[o + 3] = 255; }
    x.putImageData(im, 0, 0); x.fillStyle = 'rgba(255,225,150,.75)'; for (let k = 0; k < 4; k++) x.fillRect(W / 2 - 2, k * 64 + 8, 4, 32); return T(c);
  }),
  rib: () => once('rib', () => { const N = 256, h = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] = 0.5 + 0.5 * Math.sin((x / N) * Math.PI * 2 * 12); const d = field(N, 4, 5, 77), c = mk(N, N), g = c.getContext('2d'), im = g.createImageData(N, N); for (let i = 0; i < N * N; i++) { const v = 255 * (0.65 + 0.35 * d[i]); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return { map: T(c), normal: T(normalCanvas(h, N, 2.5), { srgb: false }) }; }),
  fabric: () => once('fabric', () => { const N = 128, h = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] = 0.5 + 0.25 * Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2) + 0.15 * Math.sin((x + y) * 0.4); const t = T(normalCanvas(h, N, 1.6), { srgb: false }); t.repeat.set(10, 10); return { normal: t }; }),
  emblem: () => once('emblem', () => {
    const c = mk(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 10, 128, 128, 120); g.addColorStop(0, '#2a6fdb'); g.addColorStop(1, '#0b2e7a');
    x.fillStyle = g; x.beginPath(); x.arc(128, 128, 120, 0, 7); x.fill(); x.strokeStyle = '#e8f1ff'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
    x.save(); x.translate(128, 128); x.rotate(-0.45); x.strokeStyle = '#fff'; x.lineWidth = 7; x.beginPath(); x.ellipse(0, 0, 88, 30, 0, 0, 7); x.stroke(); x.restore();
    x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, r = i % 2 ? 12 : 44; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.closePath(); x.fill();
    return T(c, { repeat: false });
  }),
  flag: () => once('flag', () => {
    const c = mk(320, 200), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 320, 200); g.addColorStop(0, '#0d2a6b'); g.addColorStop(1, '#050d2e'); x.fillStyle = g; x.fillRect(0, 0, 320, 200);
    x.fillStyle = '#ff7a3d'; x.fillRect(0, 176, 320, 24); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('STELLARSPARK', 160, 150);
    x.strokeStyle = '#8fd3ff'; x.lineWidth = 6; x.beginPath(); x.ellipse(160, 70, 70, 22, -0.4, 0, 7); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, r = i % 2 ? 6 : 26; x.lineTo(160 + Math.cos(a) * r, 70 + Math.sin(a) * r); } x.fill();
    return T(c, { repeat: false });
  }),
  soft: () => once('soft', () => { const c = mk(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return T(c, { repeat: false }); }),
  sign: (text, sub = '') => { const c = mk(512, 192), x = c.getContext('2d'); x.fillStyle = '#0a1a45'; x.fillRect(0, 0, 512, 192); x.strokeStyle = '#4fd1ff'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 180); x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, sub ? 78 : 96); if (sub) { x.fillStyle = '#ffd23f'; x.font = '32px sans-serif'; x.fillText(sub, 256, 142); } return T(c, { repeat: false }); },
};

const V2 = THREE.Vector2;
export const Mat = {
  paint: (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.2, ...o }),
  panel: (c = 0xffffff, o = {}) => { const p = Tex.panel(); return new THREE.MeshStandardMaterial({ color: c, map: p.map, normalMap: p.normal, normalScale: new V2(0.9, 0.9), roughness: 0.5, metalness: 0.4, ...o }); },
  metal: (c = 0x8a93a6, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.9, ...o }),
  glow: (c, i = 1, o = {}) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4, ...o }),
  glass: (c = 0x9fd8ff, op = 0.35, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.05, metalness: 0, transparent: true, opacity: op, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false, ...o }),
  solar: () => new THREE.MeshStandardMaterial({ map: Tex.solar(), color: 0xffffff, roughness: 0.25, metalness: 0.7, emissive: 0x0a1a55, emissiveIntensity: 0.4 }),
  rock: (c = 0xffffff, r = 1) => { const t = Tex.rock(); return new THREE.MeshStandardMaterial({ color: c, map: rep(t.map, r, r), normalMap: rep(t.normal, r, r), roughness: 1, metalness: 0 }); },
};
