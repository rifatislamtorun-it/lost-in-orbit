import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { ASSETS, CONFIG, OBJECT_MAP, EXPLICIT_NAMES, PLACEHOLDER_LAYOUT as LAY, FLAT_RADIUS } from '../config/game.config.js';
import { exists, loadGLB } from './Loader.js';
import { Tex, Mat, rep } from './Textures.js';
import { buildDecor } from './Decor.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const V3 = THREE.Vector3, DOWN = new V3(0, -1, 0);
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const tokens = (s) => (s || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const M = (c, o = {}) => (o.transparent ? Mat.glass(c, o.opacity ?? 0.4, o.side ? { side: o.side } : {}) : Mat.panel(c, o));
const glow = (c, i = 1) => Mat.glow(c, i);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, s = 20) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
const sph = (r, m, s = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, s, s * 0.6), m);
const WHITE = 0xe8ecf2, METAL = 0x8a93a6, DARK = 0x2b3345, ORANGE = 0xff7a3d;

const hs = (x, z) => { const q = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return q - Math.floor(q); };
const vn = (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return hs(xi, zi) * (1 - u) * (1 - v) + hs(xi + 1, zi) * u * (1 - v) + hs(xi, zi + 1) * (1 - u) * v + hs(xi + 1, zi + 1) * u * v; };
// ---------- analytic terrain for demo mode ----------
export function rawHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = (Math.sin(x * 0.045) * Math.cos(z * 0.038) * 2.2 + Math.sin(x * 0.12 + z * 0.09) * 0.9 + Math.cos(z * 0.07 - x * 0.05) * 1.2) * sm(30, 110, r);
  const cd = Math.hypot(x - LAY.Crater[0], z - LAY.Crater[1]);
  if (cd < 45) { if (cd < 28) h -= 9 * (1 - (cd / 28) ** 2); h += 2.4 * Math.exp(-(((cd - 30) / 4.5) ** 2)); }
  h += sm(135, 230, r) * (26 + 12 * Math.sin(x * 0.035) * Math.cos(z * 0.03) + 8 * Math.sin(x * 0.09 + z * 0.07));
  const vd = Math.hypot(x - LAY.Volcano[0], z - LAY.Volcano[1]);
  if (vd < 42) h += Math.max(0, 15 * (1 - vd / 42)) - (vd < 5 ? 4 * (1 - vd / 5) : 0);
  const md = Math.hypot(x - 128, z - 6); if (md < 22) h -= 5 * (1 - (md / 22) ** 2);                     // mining pit
  const dn = sm(18, 50, r); h += ((vn(x * 0.09, z * 0.09) - 0.5) * 1.6 + (vn(x * 0.35, z * 0.35) - 0.5) * 0.25) * dn + Math.sin((x * 0.8 + z * 0.5) * 0.5) * 0.05 * sm(30, 80, r);   // dunes + ripples
  return h;
}

class Location {
  constructor(key) { this.key = key; this.boxes = []; this.nodes = []; this.lights = []; this.center = new V3(); this.top = 0; this.size = 1; this.beacon = null; }
  finalize() {
    const all = new THREE.Box3(); this.boxes.forEach((b) => all.union(b));
    all.getCenter(this.center); this.top = all.max.y; const s = all.getSize(new V3()); this.size = Math.max(s.x, s.z, 1);
  }
  distanceTo(p) { let d = 1e9; for (const b of this.boxes) d = Math.min(d, b.distanceToPoint(p)); return d; }
  target(p) {   // nearest part of this location to p (for waypoint)
    let best = null, bd = 1e9; const c = new V3();
    for (const b of this.boxes) { b.getCenter(c); const d = c.distanceToSquared(p); if (d < bd) { bd = d; best = new V3(c.x, b.max.y, c.z); } }
    return best || this.center.clone();
  }
}

export class World {
  constructor(scene) {
    this.scene = scene; this.root = new THREE.Group(); scene.add(this.root);
    this.locations = new Map(); this.anims = []; this.mixers = []; this.colliders = []; this.circles = []; this.flats = [];
    this.usingGLB = false; this.ray = new THREE.Raycaster(); this.ray.far = 800;
    this.spawn = new V3(); this.radius = 175; this.bounds = new THREE.Box3(new V3(-200, -20, -200), new V3(200, 60, 200));
    this.active = new Set(); this.alerts = new Set(); this.roverTask = null; this._n = new V3();
  }

  async load(onProgress) {
    let gltf = null;
    if (ASSETS.USE_GLB.colony && (await exists(ASSETS.COLONY_MODEL))) gltf = await loadGLB(ASSETS.COLONY_MODEL, onProgress);
    if (gltf) { this.buildFromGLB(gltf); } else { console.info('[World] MARS_COLONY.glb not found — demo placeholder colony'); this.buildPlaceholder(); }
    this.locations.forEach((l) => l.finalize());
    const missing = Object.keys(OBJECT_MAP).filter((k) => !this.locations.has(k));
    if (missing.length && this.usingGLB) console.warn('[World] objects not found in GLB (their missions use a fallback location):', missing.join(', '));
    this.computeSpawn();
    if (!this.locations.size) this.virtualKiosk();
    this.makeBeacons();
  }

  // ---------- GLB colony ----------
  buildFromGLB(gltf) {
    this.usingGLB = true; const model = gltf.scene; this.root.add(model);
    model.traverse((o) => { if (o.isLight || o.isCamera) o.visible = false; });
    model.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(model), size = box.getSize(new V3());
    let s = CONFIG.colony.scale; if (CONFIG.colony.autoScale) s *= CONFIG.colony.targetSize / Math.max(size.x, size.z, 1e-3);
    model.scale.multiplyScalar(s); model.updateMatrixWorld(true);
    box.setFromObject(model); const c = box.getCenter(new V3()); model.position.set(-c.x, -box.min.y, -c.z); model.updateMatrixWorld(true);
    this.bounds.setFromObject(model); size = this.bounds.getSize(new V3()); this.radius = Math.max(size.x, size.z) / 2 * 0.96;
    const ign = CONFIG.colony.ignoreForCollision;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const mats = [].concat(o.material || []);
      const glass = mats.some((m) => m.transparent && m.opacity < 0.6);
      if (ign.some((p) => norm(o.name).includes(p)) || glass || o.isSkinnedMesh) return;
      try { o.geometry.computeBoundsTree(); } catch (e) { /* ignore */ }
      this.colliders.push(o);
    });
    if (gltf.animations && gltf.animations.length) { const m = new THREE.AnimationMixer(model); gltf.animations.forEach((a) => m.clipAction(a).play()); this.mixers.push(m); }
    this.detect(model);
    if (CONFIG.colony.glbEffects) this.glbEffects();
  }
  matchKey(node) {
    const raw = node.name || '', ud = node.userData || {};
    for (const k of Object.keys(OBJECT_MAP)) if (EXPLICIT_NAMES[k] && EXPLICIT_NAMES[k] === raw) return k;
    const tag = String(ud.tag || ud.gameTag || ud.gameId || ud.id || ud.tags || '');
    if (tag) { const ts = tag.split(/[,; ]+/).map(norm); for (const k of Object.keys(OBJECT_MAP)) if (ts.includes(norm(k))) return k; }
    const n = norm(raw); if (!n) return null; const tk = tokens(raw);
    for (const k of Object.keys(OBJECT_MAP)) for (const p of OBJECT_MAP[k]) { const pn = norm(p); if (pn.length >= 4 ? n.includes(pn) : tk.includes(pn)) return k; }
    return null;
  }
  detect(model) {
    const queue = [...model.children];
    while (queue.length) {
      const node = queue.shift(); const key = this.matchKey(node);
      if (key) {
        let loc = this.locations.get(key); if (!loc) { loc = new Location(key); this.locations.set(key, loc); }
        if (loc.nodes.length < 12) {
          const b = new THREE.Box3().setFromObject(node);
          if (isFinite(b.min.x) && !b.isEmpty()) { loc.boxes.push(b); loc.nodes.push(node); }
        }
      } else queue.push(...node.children);
    }
    for (const [k, l] of [...this.locations]) if (!l.boxes.length) this.locations.delete(k);
  }
  findPart(node, re) { let f = null; node.traverse((o) => { if (!f && o !== node && re.test(o.name)) f = o; }); return f; }
  glbEffects() {
    for (const [key, loc] of this.locations) for (const node of loc.nodes) {
      const r0 = node.rotation.clone(), s0 = node.scale.clone();
      if (key === 'Antenna') { const p = this.findPart(node, /dish|rotor|spin|radar|head/i); if (p) { const ry = p.rotation.y; this.anims.push((t) => (p.rotation.y = ry + t * 0.4)); } }
      else if (key === 'SolarArray') this.anims.push((t) => (node.rotation.y = r0.y + Math.sin(t * 0.15) * 0.04));
      else if (['WaterExtractor', 'OxygenGenerator', 'Greenhouse', 'ResearchLab'].includes(key)) this.anims.push((t) => node.scale.copy(s0).multiplyScalar(1 + Math.sin(t * 2 + loc.size) * 0.004));
    }
  }

  // ---------- Demo placeholder colony ----------
  heightAt(x, z) {
    let h = rawHeight(x, z);
    for (const f of this.flats) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + 14) { const w = 1 - sm(f.r, f.r + 14, d); h = h * (1 - w) + f.y * w; } }
    if (this.padY !== undefined && Math.hypot(x - LAY.LandingZone[0], z - LAY.LandingZone[1]) < 16.4) h = this.padY;
    return h;
  }
  buildPlaceholder() {
    this.flats = Object.entries(FLAT_RADIUS).map(([k, r]) => ({ key: k, x: LAY[k][0], z: LAY[k][1], r, y: rawHeight(LAY[k][0], LAY[k][1]) }));
    this.padY = this.flats.find((f) => f.key === 'LandingZone').y + 0.2;
    this.radius = 175;
    // terrain (textured PBR, detailed)
    const SEG = 300, SZ = 720, g = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = this.heightAt(x, z); p.setY(i, h);
      const v = 0.8 + 0.3 * vn(x * 0.02, z * 0.02) + 0.12 * (vn(x * 0.11, z * 0.11) - 0.5) - Math.min(0.25, Math.max(0, (h + 6) / 150)) * 0.3; c.setRGB(v, v * 0.97, v * 0.94);
      if (h > 24) c.lerp(new THREE.Color(1.5, 1.4, 1.35), Math.min(1, (h - 24) / 22)); if (h < -2) c.multiplyScalar(0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const mars = Tex.mars(); const terrain = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, map: rep(mars.map, 72, 72), normalMap: rep(mars.normal, 72, 72), normalScale: new THREE.Vector2(1.5, 1.5), roughness: 1, metalness: 0 }));
    terrain.receiveShadow = true; this.root.add(terrain);

    const place = (key, group, collide = []) => {
      const [x, z] = LAY[key]; group.position.set(x, this.heightAt(x, z), z); this.root.add(group);
      group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.updateMatrixWorld(true);
      const loc = new Location(key); loc.nodes.push(group); loc.boxes.push(new THREE.Box3().setFromObject(group)); this.locations.set(key, loc);
      collide.forEach(([dx, dz, r]) => this.circles.push({ x: x + dx, z: z + dz, r }));
      return loc;
    };
    const lightsOf = (loc, arr) => arr.forEach((m) => loc.lights.push({ mesh: m, color: m.material.color.getHex() }));

    // Habitat
    { const g = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(0xdfe9f2, { transparent: true, opacity: 0.93 })); dome.position.y = 1.2; g.add(dome);
      const base = cyl(10.6, 11, 1.4, M(WHITE)); base.position.y = 0.7; g.add(base);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(10.3, 0.35, 8, 40), glow(0x4fd1ff, 0.8)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.4; g.add(ring);
      const mast = cyl(0.25, 0.25, 5, M(METAL)); mast.position.y = 12.5; g.add(mast); const beacon = sph(0.5, glow(0xff4d4d, 1.5)); beacon.position.y = 15.2; g.add(beacon);
      const circles = [[0, 0, 11.5]];
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, w = new THREE.Group(); const tun = cyl(0.9, 0.9, 8, M(METAL)); tun.rotation.z = Math.PI / 2; tun.position.set(14, 1.3, 0); w.add(tun);
        const d = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(i % 2 ? WHITE : 0xd9dee8)); d.position.set(18, 0.6, 0); w.add(d); w.rotation.y = a; g.add(w); circles.push([Math.cos(a) * 18, -Math.sin(a) * 18, 4]); }
      const loc = place('Habitat', g, circles); lightsOf(loc, [beacon]); this.anims.push((t) => (ring.material.emissiveIntensity = 0.6 + Math.sin(t * 2) * 0.3)); }
    // Solar array (tracks the sun)
    { const g = new THREE.Group(), tr = new THREE.Group(); g.add(tr);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const pn = box(5.2, 0.18, 3.2, Mat.solar()); pn.position.set((c - 2) * 6, 2, (r - 1) * 5); pn.rotation.x = -0.5; tr.add(pn);
        const pole = cyl(0.12, 0.15, 2, M(METAL), 8); pole.position.set((c - 2) * 6, 1, (r - 1) * 5); tr.add(pole); }
      place('SolarArray', g); this.anims.push((t) => (tr.rotation.y = Math.sin(t * 0.15) * 0.5)); }
    // Water extractor
    { const g = new THREE.Group(); const b = cyl(4.5, 5, 1.6, M(METAL)); b.position.y = 0.8; g.add(b); const tw = cyl(1.3, 1.9, 16, M(WHITE)); tw.position.y = 9; g.add(tw);
      const rings = [4, 8, 12].map((y) => { const r = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 8, 24), glow(0x4fc3ff, 1)); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); return r; });
      const tank = sph(2.2, M(0xbfe6ff, { transparent: true, opacity: 0.8 })); tank.position.set(4, 2.4, 0); g.add(tank);
      const loc = place('WaterExtractor', g, [[0, 0, 5]]); lightsOf(loc, rings);
      this.anims.push((t) => rings.forEach((r, i) => { const k = 0.5 + 0.5 * Math.sin(t * 3 - i); if (!this.alerts.has('WaterExtractor')) r.material.emissiveIntensity = 0.4 + k * 1.4; r.scale.setScalar(1 + k * 0.08); })); }
    // Oxygen generator
    { const g = new THREE.Group(); [-3.2, 3.2].forEach((x) => { const t = cyl(2.4, 2.4, 7, M(0xf2f4f8)); t.position.set(x, 4, 0); g.add(t); const cap = sph(2.4, M(0xf2f4f8)); cap.position.set(x, 7.5, 0); cap.scale.y = 0.6; g.add(cap); });
      const st = cyl(0.7, 0.9, 11, M(METAL)); st.position.set(0, 6, -3); g.add(st); const bx = box(5, 3, 3, M(DARK)); bx.position.set(0, 1.5, 3); g.add(bx);
      const ls = [-1.4, 0, 1.4].map((x) => { const l = sph(0.4, glow(0x4dff9a, 1.2), 10); l.position.set(x, 2.3, 4.6); g.add(l); return l; });
      const loc = place('OxygenGenerator', g, [[0, 0, 6]]); lightsOf(loc, ls); this.anims.push((t) => ls.forEach((l, i) => { if (!this.alerts.has('OxygenGenerator')) l.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 3 - i * 1.2)) * 1.6; })); }
    // Greenhouse
    { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.SphereGeometry(7.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9ff0b8, { transparent: true, opacity: 0.45 })); d.position.y = 0.6; g.add(d);
      const b = cyl(7.8, 8, 1.2, M(WHITE)); b.position.y = 0.6; g.add(b);
      for (let i = 0; i < 9; i++) { const pl = sph(0.9 + Math.random() * 0.5, glow(0x58d46a, 0.35), 8); const a = Math.random() * 6.28, r = Math.random() * 4.5; pl.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r); g.add(pl); }
      const gl = new THREE.Mesh(new THREE.SphereGeometry(6.3, 16, 10), new THREE.MeshBasicMaterial({ color: 0xff6ad5, transparent: true, opacity: 0.15, depthWrite: false })); gl.position.y = 2; g.add(gl);
      const loc = place('Greenhouse', g, [[0, 0, 8]]); lightsOf(loc, [gl]); this.anims.push((t) => { if (!this.alerts.has('Greenhouse')) gl.material.opacity = 0.12 + (0.5 + 0.5 * Math.sin(t * 2)) * 0.12; }); }
    // Research lab
    { const g = new THREE.Group(); const b = box(10, 3.6, 7.5, M(WHITE)); b.position.y = 1.8; g.add(b); const d = new THREE.Mesh(new THREE.SphereGeometry(3.8, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8fd3ff, { transparent: true, opacity: 0.7 })); d.position.set(-1.5, 3.6, 0); g.add(d);
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), M(METAL)); dish.position.set(3.2, 4.6, 1.5); dish.rotation.x = -0.6; g.add(dish);
      const sign = box(3, 0.5, 0.2, glow(0x4fd1ff, 1)); sign.position.set(0, 3, 3.8); g.add(sign); place('ResearchLab', g, [[0, 0, 7]]); }
    // Repair station
    { const g = new THREE.Group(); const b = box(10, 4, 7, M(0xcfd5de)); b.position.y = 2; g.add(b); const door = box(4, 3, 0.2, M(DARK)); door.position.set(0, 1.5, 3.55); g.add(door);
      [-4, 4].forEach((x) => { const s = box(1, 4.1, 7.1, M(0xffc83d)); s.position.set(x, 2, 0); g.add(s); });
      const arm = new THREE.Group(); const p = cyl(0.3, 0.3, 4, M(METAL), 8); p.position.y = 2; arm.add(p); const a2 = box(5, 0.4, 0.4, M(ORANGE)); a2.position.set(2.5, 4, 0); arm.add(a2); arm.position.set(0, 4, 0); g.add(arm);
      place('RepairStation', g, [[0, 0, 6]]); this.anims.push((t) => (arm.rotation.y = Math.sin(t * 0.6) * 0.8)); }
    // Antenna
    { const g = new THREE.Group(); const b = cyl(1.8, 2.2, 1.4, M(METAL)); b.position.y = 0.7; g.add(b); const mast = cyl(0.4, 0.5, 6, M(WHITE)); mast.position.y = 4; g.add(mast);
      const rot = new THREE.Group(); rot.position.y = 7.5; const dish = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3), M(0xf2f4f8, { side: THREE.DoubleSide })); dish.rotation.x = -Math.PI / 3; rot.add(dish);
      const horn = cyl(0.12, 0.12, 2.6, M(METAL), 6); horn.position.set(0, 1.2, 1.5); horn.rotation.x = Math.PI / 4.2; rot.add(horn); g.add(rot);
      const lt = sph(0.35, glow(0xff4d4d, 1.5), 8); lt.position.set(0, 9.8, 0); g.add(lt); const loc = place('Antenna', g, [[0, 0, 2.4]]); lightsOf(loc, [lt]);
      this.anims.push((t, dt) => { rot.rotation.y += dt * 0.5; if (!this.alerts.has('Antenna')) lt.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 2 : 0.2; }); }
    // Landing zone
    { const g = new THREE.Group(); const pad = cyl(16, 16.5, 0.2, M(0x3a4254)); pad.position.y = -0.1; g.add(pad); const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 0.3, 6, 40), glow(0xffc83d, 0.6)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
      const body = cyl(1.7, 1.9, 10, M(0xf2f4f8)); body.position.y = 5.5; g.add(body); const nose = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4, 16), M(ORANGE)); nose.position.y = 12.5; g.add(nose);
      for (let i = 0; i < 3; i++) { const f = box(0.3, 3, 2.2, M(ORANGE)); const a = (i / 3) * 6.28; f.position.set(Math.cos(a) * 2.1, 2.2, Math.sin(a) * 2.1); f.rotation.y = -a; g.add(f); }
      place('LandingZone', g, [[0, 0, 2.8]]); }
    // Radiation shelter
    { const g = new THREE.Group(); const d = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x6b6760)); d.scale.y = 0.65; g.add(d);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.3, 6, 32), glow(0xc58bff, 0.8)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
      const door = box(2.4, 2.4, 0.6, glow(0xc58bff, 0.5)); door.position.set(0, 1.2, 5.6); g.add(door); const loc = place('RadiationShelter', g, [[0, 0, 6.5]]); lightsOf(loc, [ring]); }
    // Rover (drives during its mission)
    { const g = new THREE.Group(); const body = box(3, 0.9, 2, M(0xf2f4f8)); body.position.y = 1.2; g.add(body); const pn = box(2.4, 0.1, 1.6, M(0x1c3f95)); pn.position.y = 1.7; g.add(pn);
      for (const x of [-1.2, 0, 1.2]) for (const z of [-1.1, 1.1]) { const w = cyl(0.45, 0.45, 0.35, M(DARK), 12); w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
      const mast = cyl(0.08, 0.08, 1.6, M(METAL), 6); mast.position.set(1.2, 2.5, 0); g.add(mast); const cam = box(0.4, 0.3, 0.5, M(DARK)); cam.position.set(1.2, 3.3, 0); g.add(cam);
      const loc = place('Rover', g); this.rover = { group: g, base: g.position.clone(), loc }; }
    // Dust storm zone swirl
    { const g = new THREE.Group(); const cones = [14, 10, 6].map((r, i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.25, 22 - i * 4, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8793a, transparent: true, opacity: 0.22 + i * 0.05, side: THREE.DoubleSide, depthWrite: false })); c.position.y = 11 - i * 2; g.add(c); return c; });
      const [x, z] = LAY.DustStormZone; g.position.set(x, this.heightAt(x, z), z); this.root.add(g); const loc = new Location('DustStormZone'); loc.nodes.push(g); loc.boxes.push(new THREE.Box3(new V3(x - 18, g.position.y, z - 18), new V3(x + 18, g.position.y + 22, z + 18))); this.locations.set('DustStormZone', loc);
      this.anims.push((t) => cones.forEach((c, i) => (c.rotation.y = t * (0.8 + i * 0.5)))); }
    // Terrain-feature locations
    const feat = (key, half, hgt) => { const [x, z] = LAY[key]; const y = this.heightAt(x, z); const l = new Location(key); l.boxes.push(new THREE.Box3(new V3(x - half, y - 12, z - half), new V3(x + half, y + hgt, z + half))); this.locations.set(key, l); return [x, y, z]; };
    feat('Crater', 24, 6); feat('Mountain', 22, 30);
    { const [x, y, z] = feat('Volcano', 16, 18); const lava = sph(2.6, glow(0xff5a1f, 1.4), 12); lava.position.set(x, y + 11.6, z); this.root.add(lava); this.anims.push((t) => (lava.material.emissiveIntensity = 1 + Math.sin(t * 3) * 0.6)); }
    buildDecor(this);
    this.bounds.set(new V3(-200, -20, -200), new V3(200, 60, 200));
  }
  scatterRocks() {
    const N = 450, geo = new THREE.DodecahedronGeometry(1, 0), mesh = new THREE.InstancedMesh(geo, M(0x7a3d26), N), d = new THREE.Object3D(); let n = 0, tries = 0;
    while (n < N && tries++ < 3000) {
      const a = Math.random() * 6.28, r = 20 + Math.random() * 190, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.flats.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 3) || Math.hypot(x - LAY.DustStormZone[0], z - LAY.DustStormZone[1]) < 20) continue;
      const s = 0.3 + Math.random() * Math.random() * 3; d.position.set(x, this.heightAt(x, z) + s * 0.4, z); d.rotation.set(Math.random() * 3, Math.random() * 3, 0); d.scale.set(s, s * 0.7, s); d.updateMatrix(); mesh.setMatrixAt(n++, d.matrix);
    }
    mesh.count = n; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; this.root.add(mesh);
  }
  virtualKiosk() {
    const g = new THREE.Group(); const k = box(1.4, 2.2, 0.8, glow(0x4fd1ff, 0.7)); k.position.y = 1.1; g.add(k); g.position.set(this.spawn.x + 5, this.spawn.y, this.spawn.z + 5); this.root.add(g);
    const l = new Location('Habitat'); l.boxes.push(new THREE.Box3().setFromObject(g)); l.finalize(); this.locations.set('Habitat', l);
  }

  // ---------- spawn / ground / collisions ----------
  computeSpawn() {
    const lz = this.locations.get('LandingZone'), hb = this.locations.get('Habitat'); let x = 0, z = 0;
    if (lz) { x = lz.center.x; z = lz.center.z; const d = hb ? new V3().subVectors(hb.center, lz.center).setY(0).normalize() : new V3(1, 0, 0); const off = Math.min(lz.size / 2 + 3, 20); x += d.x * off; z += d.z * off; }
    else if (hb) { x = hb.center.x + hb.size / 2 + 4; z = hb.center.z; }
    let y = this.groundTop(x, z);
    for (let r = 8; y === null && r <= 80; r += 8) for (let a = 0; a < 8 && y === null; a++) { const xx = x + Math.cos(a) * r, zz = z + Math.sin(a) * r; y = this.groundTop(xx, zz); if (y !== null) { x = xx; z = zz; } }
    if (y === null) { this.addFallbackGround(); y = this.bounds.min.y; }
    this.spawn.set(x, y, z);
  }
  addFallbackGround() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(this.radius * 4, this.radius * 4), M(0xa84a28)); m.rotation.x = -Math.PI / 2; m.position.y = this.bounds.min.y; m.receiveShadow = true; this.root.add(m); m.updateMatrixWorld(true); this.colliders.push(m);
  }
  hitsUp(origin, far) {
    this.ray.set(origin, DOWN); this.ray.far = far;
    const hits = this.ray.intersectObjects(this.colliders, false);
    for (const h of hits) { if (!h.face) continue; this._n.copy(h.face.normal).transformDirection(h.object.matrixWorld); if (this._n.y > 0.3) return h.point.y; }
    return null;
  }
  groundTop(x, z) { return this.usingGLB ? this.hitsUp(new V3(x, this.bounds.max.y + 20, z), this.bounds.max.y - this.bounds.min.y + 80) : this.heightAt(x, z); }
  /** Ground height under (x,z) reachable from height y (steps up to stepHeight). null = nothing below. */
  groundAt(x, z, y) {
    if (!this.usingGLB && !this.colliders.length) return this.heightAt(x, z);
    return this.hitsUp(new V3(x, y + CONFIG.player.stepHeight + 0.1, z), 400);
  }
  /** Returns allowed {x,z} movement. */
  collide(pos, dx, dz, radius) {
    const len = Math.hypot(dx, dz); if (len < 1e-6) return { x: dx, z: dz };
    if (!this.usingGLB) {
      let nx = pos.x + dx, nz = pos.z + dz;
      for (const c of this.circles) { const ex = nx - c.x, ez = nz - c.z, d = Math.hypot(ex, ez), m = c.r + radius; if (d < m) { nx = c.x + (ex / (d || 1)) * m; nz = c.z + (ez / (d || 1)) * m; } }
      if (this.heightAt(nx, nz) - pos.y > 1.2 * len + 0.05 + CONFIG.player.stepHeight) return { x: 0, z: 0 };
      return { x: nx - pos.x, z: nz - pos.z };
    }
    let mx = dx, mz = dz;
    for (const h of [0.45, 1.3]) {
      const dir = new V3(mx, 0, mz).normalize(); this.ray.set(new V3(pos.x, pos.y + h, pos.z), dir); this.ray.far = radius + Math.hypot(mx, mz);
      const hit = this.ray.intersectObjects(this.colliders, false)[0];
      if (hit && hit.face) {
        this._n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
        if (this._n.y < 0.7 && hit.distance < radius + Math.hypot(mx, mz)) { this._n.y = 0; if (this._n.lengthSq() > 1e-6) { this._n.normalize(); const dot = mx * this._n.x + mz * this._n.z; if (dot < 0) { mx -= this._n.x * dot; mz -= this._n.z * dot; } } }
      }
    }
    return { x: mx, z: mz };
  }
  clampBounds(pos) { const r = Math.hypot(pos.x, pos.z); if (r > this.radius) { pos.x *= this.radius / r; pos.z *= this.radius / r; } }
  /** Fraction (0..1] of the way from→to the camera can travel before hitting geometry. */
  cameraClip(from, to) {
    if (!this.usingGLB) return 1;
    const dir = new V3().subVectors(to, from), d = dir.length(); dir.normalize(); this.ray.set(from, dir); this.ray.far = d;
    const h = this.ray.intersectObjects(this.colliders, false)[0]; return h ? Math.max(0.15, (h.distance - 0.4) / d) : 1;
  }

  // ---------- beacons / state ----------
  makeBeacons() {
    for (const loc of this.locations.values()) {
      const base = THREE.MathUtils.clamp(loc.size * 0.1, 0.8, 5); const g = new THREE.Group();
      const dm = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.5, depthWrite: false })); g.add(dm);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })); beam.position.y = -30 + 1; beam.scale.set(base, 1, base); g.add(beam);
      g.position.copy(loc.center); g.position.y = loc.top + base * 2; this.scene.add(g); loc.beacon = { g, dm, beam, base };
    }
  }
  setActive(keys) { this.active = new Set(keys); }
  setAlerts(keys) { this.alerts = new Set(keys); }
  canonical(key) { if (this.locations.has(key)) return key; return this.locations.has('Habitat') ? 'Habitat' : [...this.locations.keys()][0]; }
  driveRover() {
    if (!this.rover) { this.roverTask = null; return; }
    const cr = this.locations.get('Crater'); const dir = cr ? new V3().subVectors(cr.center, this.rover.group.position).setY(0).normalize() : new V3(1, 0, 0);
    this.roverTask = { t: 0, dir, base: this.rover.group.position.clone() };
  }
  update(t, dt) {
    for (const f of this.anims) f(t, dt);
    for (const m of this.mixers) m.update(dt);
    if (this.roverTask && this.rover) {
      const r = this.roverTask; r.t += dt; const k = r.t / 5, g = this.rover.group;
      if (k >= 1) { g.position.copy(r.base); this.roverTask = null; }
      else { const d = Math.sin(Math.PI * k) * 14; g.position.set(r.base.x + r.dir.x * d, 0, r.base.z + r.dir.z * d); g.position.y = this.usingGLB ? r.base.y : this.heightAt(g.position.x, g.position.z); g.rotation.y = Math.atan2(r.dir.x, r.dir.z) + (k > 0.5 ? Math.PI : 0) - Math.PI / 2; }
    }
    for (const loc of this.locations.values()) {
      const b = loc.beacon; if (!b) continue; const active = this.active.has(loc.key), alert = this.alerts.has(loc.key);
      b.dm.scale.setScalar(b.base * (active ? 1.15 : 0.55) * (1 + 0.08 * Math.sin(t * 4))); b.dm.rotation.y = t * 1.5;
      b.g.position.y = loc.top + b.base * 2 + Math.sin(t * 2 + loc.size) * b.base * 0.25;
      const flash = Math.sin(t * 10) > 0;
      b.dm.material.color.setHex(alert ? (flash ? 0xff4040 : 0xffa040) : active ? 0xffd23f : 0x4fd1ff); b.dm.material.opacity = active || alert ? 0.95 : 0.4;
      b.beam.visible = active || alert; b.beam.material.color.setHex(alert ? 0xff5050 : 0xffd23f);
      for (const l of loc.lights) { const m = l.mesh.material; if (m.emissive) { if (alert) { m.emissive.setHex(flash ? 0xff2a2a : 0x330000); m.emissiveIntensity = 1.6; } else m.emissive.setHex(l.color); } else if (alert) { m.color.setHex(0xff3030); m.opacity = flash ? 0.35 : 0.1; } else m.color.setHex(l.color); }
    }
  }
}
