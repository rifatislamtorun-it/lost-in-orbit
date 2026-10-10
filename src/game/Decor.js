import * as THREE from 'three';
import { PLACEHOLDER_LAYOUT as LAY, FLAT_RADIUS } from '../config/game.config.js';
import { Tex, Mat, rep } from './Textures.js';

const V3 = THREE.Vector3;
function rngf(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/** Adds roads, lamps, pipelines, vehicles, containers, drones, flags, signs, rocks, mining site, etc. to the demo colony. */
export function buildDecor(w) {
  const root = w.root, H = (x, z) => w.heightAt(x, z), R = rngf(1234), A = (f) => w.anims.push(f);
  const add = (o, x, z, y = null, rotY = 0) => { o.position.set(x, y === null ? H(x, z) : y, z); o.rotation.y = rotY; root.add(o); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  const circ = (x, z, r) => w.circles.push({ x, z, r });
  const box = (a, b, c, m) => new THREE.Mesh(new THREE.BoxGeometry(a, b, c), m);
  const cyl = (rt, rb, h, m, s = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
  const L = (k) => LAY[k], rad = (k) => FLAT_RADIUS[k] || 6;

  // ---------- rocks (instanced, 2 shapes) + pebbles ----------
  { const mat = Mat.rock(0xffffff, 1);
    const mk = (geo, N, smin, smax) => { const im = new THREE.InstancedMesh(geo, mat, N), d = new THREE.Object3D(); let n = 0, tries = 0;
      while (n < N && tries++ < 6000) { const a = R() * 6.283, r = 18 + R() * 195, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (w.flats.some((f) => Math.hypot(x - f.x, z - f.z) < f.r + 3) || Math.hypot(x - L('DustStormZone')[0], z - L('DustStormZone')[1]) < 20 || Math.hypot(x - 128, z - 6) < 24) continue;
        const s = smin + R() * R() * (smax - smin); d.position.set(x, H(x, z) + s * 0.25, z); d.rotation.set(R() * 3, R() * 6, R() * 3); d.scale.set(s * (0.8 + R() * 0.6), s * (0.5 + R() * 0.5), s * (0.8 + R() * 0.6)); d.updateMatrix(); im.setMatrixAt(n++, d.matrix); if (s > 1.6) circ(x, z, s * 0.7); }
      im.count = n; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; root.add(im); };
    mk(new THREE.DodecahedronGeometry(1, 1), 520, 0.35, 3.4); mk(new THREE.IcosahedronGeometry(1, 1), 700, 0.12, 0.45); }

  // ---------- roads ----------
  const lampPts = [];
  const road = (a, b, width = 5, ra = 0, rb = 0) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], Ln = Math.hypot(dx, dz), ux = dx / Ln, uz = dz / Ln, sx = a[0] + ux * ra, sz = a[1] + uz * ra, ex = b[0] - ux * rb, ez = b[1] - uz * rb, len = Math.hypot(ex - sx, ez - sz);
    if (len < 4) return; const N = Math.max(2, Math.ceil(len / 3)), pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const t = i / N, x = sx + (ex - sx) * t, z = sz + (ez - sz) * t, px = -uz * width / 2, pz = ux * width / 2; pos.push(x + px, H(x + px, z + pz) + 0.05, z + pz, x - px, H(x - px, z - pz) + 0.05, z - pz); uv.push(0, (t * len) / 8, 1, (t * len) / 8); if (i < N) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: Tex.road(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); m.receiveShadow = true; root.add(m);
    for (let d = 10; d < len - 4; d += 16) { const x = sx + ux * d, z = sz + uz * d; lampPts.push([x - uz * (width / 2 + 0.9), z + ux * (width / 2 + 0.9), Math.atan2(uz, -ux)]); }
  };
  const HB = L('Habitat'); road(L('LandingZone'), HB, 6, rad('LandingZone') - 4, 22); road(HB, L('Greenhouse'), 5, 22, 9); road(HB, L('ResearchLab'), 5, 22, 8); road(HB, L('OxygenGenerator'), 5, 22, 8); road(HB, L('WaterExtractor'), 5, 22, 7);
  road(HB, L('SolarArray'), 5, 22, 14); road(HB, L('RepairStation'), 5, 24, 8); road(HB, L('Antenna'), 5, 22, 5); road(L('RepairStation'), L('RadiationShelter'), 5, 8, 8); road(L('LandingZone'), L('Rover'), 4, 20, 6);
  road(L('RepairStation'), [128, 6], 5, 8, 18); road(L('LandingZone'), L('Crater'), 4, 20, 26);

  // ---------- lamp posts (instanced) ----------
  { const N = lampPts.length, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 8), Mat.metal(0x6c7587), N), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 12, 8), Mat.glow(0xffe2a8, 2.4), N), d = new THREE.Object3D();
    lampPts.forEach(([x, z], i) => { const y = H(x, z); d.position.set(x, y + 2.3, z); d.updateMatrix(); poles.setMatrixAt(i, d.matrix); d.position.y = y + 4.7; d.updateMatrix(); heads.setMatrixAt(i, d.matrix); });
    poles.castShadow = true; root.add(poles, heads); }

  // ---------- pipelines with supports ----------
  const pipe = (a, b, r = 0.32, h = 0.9) => {
    const pts = [], N = 14; for (let i = 0; i <= N; i++) { const t = i / N, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; pts.push(new V3(x, H(x, z) + h, z)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 10), Mat.metal(0x9aa4b6, { roughness: 0.4 })); m.castShadow = true; root.add(m);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let d = 6; d < len - 4; d += 9) { const t = d / len, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; const s = cyl(0.1, 0.12, h, Mat.metal(0x5a6274), 6); s.position.set(x, H(x, z) + h / 2, z); root.add(s); }
    const band = (t) => { const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; const q = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.06, 6, 14), Mat.paint(0xff7a3d)); q.position.set(x, H(x, z) + h, z); q.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); root.add(q); }; [0.25, 0.5, 0.75].forEach(band);
  };
  pipe([L('WaterExtractor')[0] + 4, L('WaterExtractor')[1] + 6], [-10, -22]); pipe([L('OxygenGenerator')[0] - 5, L('OxygenGenerator')[1] + 5], [14, -16], 0.28); pipe([L('Greenhouse')[0] - 9, L('Greenhouse')[1] + 3], [12, 3], 0.22, 0.7);

  // ---------- cargo containers ----------
  { const rib = Tex.rib(), cols = [0xe0561d, 0x1f5fb8, 0xe8e4da, 0x3b7a52, 0xc9a227, 0x8e9aab, 0xb23a48];
    const cont = (c) => { const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: c, map: rep(rib.map, 4, 1), normalMap: rep(rib.normal, 4, 1), roughness: 0.55, metalness: 0.5 }); const b = box(6, 2.5, 2.4, m); b.position.y = 1.25; g.add(b);
      for (const s of [-1, 1]) { const d = box(0.05, 2.3, 1.1, Mat.metal(0x333a48)); d.position.set(3.03, 1.25, s * 0.6); g.add(d); const bar = cyl(0.03, 0.03, 2.1, Mat.metal(0xb0b6c2), 6); bar.position.set(3.08, 1.25, s * 0.6 + s * 0.4); g.add(bar); } return g; };
    const stack = (cx, cz, cols_, rows) => { rows.forEach((row, i) => { row.forEach((rot, j) => { const c = cont(cols[(i * 3 + j + Math.floor(R() * 3)) % cols.length]); add(c, cx + (j % 2) * 2.6 * Math.cos(rot) + j * 0.1, cz + j * 2.7 + i * 0, null, rot); if (i === 0) circ(cx + (j % 2) * 2.6, cz + j * 2.7, 3.1); }); }); void cols_; };
    const place = (cx, cz, n, rotBase) => { for (let j = 0; j < n; j++) { const c = cont(cols[Math.floor(R() * cols.length)]); const x = cx + j * 7 * Math.cos(rotBase), z = cz + j * 7 * Math.sin(rotBase) * -1; add(c, x, z, null, rotBase + (R() - 0.5) * 0.06); circ(x, z, 3.2); if (R() > 0.5) { const t = cont(cols[Math.floor(R() * cols.length)]); add(t, x, z, H(x, z) + 2.5, rotBase + (R() - 0.5) * 0.1); } } };
    void stack; place(-84, 54, 4, 0); place(52, 28, 3, 0.2); place(-70, 24, 2, 1.57); }

  // ---------- fuel tanks ----------
  { const tank = (x, z, rot) => { const g = new THREE.Group(), m = Mat.paint(0xdfe3ea, { metalness: 0.5, roughness: 0.4 }); const b = cyl(1.5, 1.5, 7, m, 20); b.rotation.z = Math.PI / 2; b.position.y = 2.1; g.add(b); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10, 0, 6.283, 0, 1.571), m); e.rotation.z = -s * Math.PI / 2; e.position.set(s * 3.5, 2.1, 0); g.add(e); const st = box(0.5, 1.3, 2.6, Mat.metal(0x4a5264)); st.position.set(s * 2, 0.65, 0); g.add(st); }
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.8, 20, 1, true), Mat.paint(0xff7a3d)); stripe.rotation.z = Math.PI / 2; stripe.position.y = 2.1; g.add(stripe); const v = cyl(0.15, 0.15, 0.6, Mat.metal(0xc23b2b), 8); v.position.set(0, 3.8, 0); g.add(v); add(g, x, z, null, rot); circ(x - Math.cos(rot) * 2, z + Math.sin(rot) * 2, 2.2); circ(x + Math.cos(rot) * 2, z - Math.sin(rot) * 2, 2.2); };
    tank(L('OxygenGenerator')[0] + 18, L('OxygenGenerator')[1] + 8, 0.3); tank(L('OxygenGenerator')[0] + 18, L('OxygenGenerator')[1] + 15, 0.3); tank(L('RepairStation')[0] + 14, L('RepairStation')[1] - 14, 1.2); }

  // ---------- flags (animated cloth) ----------
  const flags = [];
  { const mkFlag = (x, z, y = null) => { const g = new THREE.Group(), pole = cyl(0.06, 0.08, 9, Mat.metal(0xd7dce6), 8); pole.position.y = 4.5; g.add(pole); const cg = new THREE.PlaneGeometry(3, 1.9, 14, 8), cloth = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: Tex.flag(), side: THREE.DoubleSide, roughness: 0.8 })); cloth.position.set(1.55, 7.9, 0); g.add(cloth); const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), Mat.glow(0xffd23f, 1.5)); top.position.y = 9.1; g.add(top); add(g, x, z, y, 0.4); flags.push({ cg, base: cg.attributes.position.array.slice() }); };
    mkFlag(HB[0] + 15, HB[1] + 24); mkFlag(L('LandingZone')[0] + 19, L('LandingZone')[1] - 8); mkFlag(L('Antenna')[0] - 8, L('Antenna')[1] + 8); mkFlag(L('ResearchLab')[0] - 10, L('ResearchLab')[1] + 10);
    A((t) => flags.forEach((f) => { const p = f.cg.attributes.position; for (let i = 0; i < p.count; i++) { const x = f.base[i * 3], y = f.base[i * 3 + 1], k = (x + 1.5) / 3; p.setZ(i, Math.sin(x * 2.6 - t * 4.2 + y) * 0.22 * k); p.setY(i, y + Math.sin(x * 2 - t * 3) * 0.03 * k); } p.needsUpdate = true; f.cg.computeVertexNormals(); })); }

  // ---------- signs ----------
  { const names = { Habitat: ['HABITAT', 'Crew quarters'], Greenhouse: ['GREENHOUSE', 'Food production'], ResearchLab: ['RESEARCH LAB', 'Science'], WaterExtractor: ['WATER EXTRACTOR', 'Ice → water'], SolarArray: ['SOLAR ARRAY', 'Power'], OxygenGenerator: ['OXYGEN GENERATOR', 'Life support'], RepairStation: ['REPAIR STATION', 'Spare parts'], Antenna: ['COMM ANTENNA', 'Earth link'], LandingZone: ['LANDING ZONE', 'Pad 1'], RadiationShelter: ['RADIATION SHELTER', 'Safe room'], Rover: ['ROVER BAY', 'Exploration'] };
    for (const [k, [t, sub]] of Object.entries(names)) { const [x, z] = L(k), toH = Math.atan2(HB[0] - x, HB[1] - z), off = rad(k) * 0.55 + 4, sx = x + Math.sin(toH + 0.7) * off, sz = z + Math.cos(toH + 0.7) * off; const g = new THREE.Group();
      const p1 = cyl(0.05, 0.05, 2.6, Mat.metal(0x7c8498), 6), p2 = p1.clone(); p1.position.set(-0.9, 1.3, 0); p2.position.set(0.9, 1.3, 0); g.add(p1, p2); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.82), new THREE.MeshStandardMaterial({ map: Tex.sign(t, sub), emissive: 0xffffff, emissiveMap: Tex.sign(t, sub), emissiveIntensity: 0.55, roughness: 0.5 })); pl.position.set(0, 2.2, 0.06); g.add(pl); add(g, sx, sz, null, toH); } }

  // ---------- vehicles ----------
  { const wheel = (r = 0.55) => { const g = new THREE.Group(), t = cyl(r, r, 0.45, Mat.paint(0x1b1d22, { roughness: 0.9 }), 18); t.rotation.z = Math.PI / 2; g.add(t); const h = cyl(r * 0.5, r * 0.5, 0.5, Mat.metal(0xb7bdc9), 10); h.rotation.z = Math.PI / 2; g.add(h); return g; };
    const buggy = (col) => { const g = new THREE.Group(), body = Mat.paint(col, { metalness: 0.5, roughness: 0.35 }); const ch = box(2.6, 0.5, 1.6, body); ch.position.y = 0.9; g.add(ch); const cab = box(1.2, 0.8, 1.4, Mat.glass(0x9fd8ff, 0.5)); cab.position.set(-0.2, 1.5, 0); g.add(cab); const rb = box(0.08, 1, 1.5, Mat.metal(0x333a48)); rb.position.set(-0.9, 1.5, 0); g.add(rb); const bed = box(1, 0.3, 1.5, Mat.paint(0x394152)); bed.position.set(1.4, 1.2, 0); g.add(bed);
      for (const x of [-0.95, 0.95]) for (const z of [-0.95, 0.95]) { const wh = wheel(); wh.position.set(x, 0.55, z); g.add(wh); } const lt = box(0.1, 0.18, 0.5, Mat.glow(0xfff1c8, 2)); lt.position.set(-1.32, 1, 0); g.add(lt); return g; };
    const crawler = () => { const g = new THREE.Group(), b = box(8, 1.6, 4.4, Mat.panel(0xe9e6dc)); b.position.y = 1.9; g.add(b); const tp = box(5.2, 2.2, 3.6, Mat.panel(0xff7a3d)); tp.position.set(-0.8, 3.7, 0); g.add(tp); const win = box(0.1, 1, 3, Mat.glass(0x9fd8ff, 0.55)); win.position.set(1.84, 3.9, 0); g.add(win);
      for (const z of [-2.3, 2.3]) { const tr = box(8.4, 1.4, 0.9, Mat.paint(0x22252c, { roughness: 0.9 })); tr.position.set(0, 0.8, z); g.add(tr); for (let i = -3; i <= 3; i++) { const r = cyl(0.55, 0.55, 0.95, Mat.metal(0x555d6d), 12); r.rotation.x = Math.PI / 2; r.position.set(i * 1.1, 0.8, z); g.add(r); } } return g; };
    let b = buggy(0xff7a3d); add(b, L('RepairStation')[0] - 14, L('RepairStation')[1] + 12, null, 0.9); circ(L('RepairStation')[0] - 14, L('RepairStation')[1] + 12, 1.8);
    b = buggy(0x1f5fb8); add(b, L('LandingZone')[0] + 22, L('LandingZone')[1] + 16, null, -0.5); circ(L('LandingZone')[0] + 22, L('LandingZone')[1] + 16, 1.8);
    const c = crawler(); add(c, L('LandingZone')[0] - 12, L('LandingZone')[1] + 26, null, 0.2); circ(L('LandingZone')[0] - 12, L('LandingZone')[1] + 26, 4.6); }

  // ---------- drones ----------
  { const drone = () => { const g = new THREE.Group(), body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10), Mat.paint(0xeef1f6, { metalness: 0.5, roughness: 0.3 })); body.scale.y = 0.55; g.add(body); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), Mat.glow(0x4fd1ff, 2.5)); eye.position.set(0, -0.12, 0.34); g.add(eye); const rotors = [];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, arm = box(0.7, 0.05, 0.07, Mat.metal(0x39414f)); arm.position.set(Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5); arm.rotation.y = -a; g.add(arm); const rt = cyl(0.42, 0.42, 0.015, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }), 20); rt.position.set(Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85); g.add(rt); const bl = box(0.8, 0.012, 0.06, Mat.paint(0x222)); bl.position.copy(rt.position); g.add(bl); rotors.push(bl); } return { g, rotors }; };
    [[HB[0], HB[1] + 6, 30, 9, 0.35], [L('SolarArray')[0], L('SolarArray')[1], 22, 11, -0.5], [L('Greenhouse')[0], L('Greenhouse')[1], 14, 8, 0.6]].forEach(([cx, cz, r, hgt, sp], i) => { const d = drone(); root.add(d.g); d.g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); const y0 = H(cx, cz);
      A((t) => { const a = t * sp + i * 2; const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; d.g.position.set(x, y0 + hgt + Math.sin(t * 1.7 + i) * 0.6, z); d.g.rotation.y = -a - (sp > 0 ? 0 : Math.PI) + Math.PI; d.g.rotation.z = 0.1 * Math.sign(sp); d.rotors.forEach((b2, k) => (b2.rotation.y = t * 60 * (k % 2 ? 1 : -1))); }); }); }

  // ---------- ice crystals by the water extractor ----------
  { const [wx, wz] = L('WaterExtractor'), mat = new THREE.MeshPhysicalMaterial({ color: 0xcdeeff, emissive: 0x3b86b8, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85, clearcoat: 1 });
    for (let i = 0; i < 16; i++) { const a = R() * 6.283, r = 9 + R() * 9, x = wx + Math.cos(a) * r, z = wz + Math.sin(a) * r, s = 0.5 + R() * 1.2; const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat); c.scale.set(s * 0.5, s * 1.8, s * 0.5); c.rotation.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4); add(c, x, z, H(x, z) + s * 1.1); } }

  // ---------- mesas, arch, mining site, research outpost, towers ----------
  { const rockM = new THREE.MeshStandardMaterial({ color: 0xc58a68, map: rep(Tex.rock().map, 2, 2), roughness: 1 });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283 + R() * 0.4, r = 118 + R() * 36, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - L('Mountain')[0], z - L('Mountain')[1]) < 40 || Math.hypot(x - L('Volcano')[0], z - L('Volcano')[1]) < 44) continue;
      const rt = 4 + R() * 4, rb = rt + 3 + R() * 4, h = 8 + R() * 12, g = new THREE.CylinderGeometry(rt, rb, h, 14, 4), p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = Math.sin(p.getX(k) * 1.3 + p.getY(k)) * Math.cos(p.getZ(k) * 1.1) * 0.7; p.setX(k, p.getX(k) + n * 0.45); p.setZ(k, p.getZ(k) + n * 0.35); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, rockM); add(m, x, z, H(x, z) + h / 2 - 2); circ(x, z, rb * 0.85); }
    const [ax, az] = [-70, -92]; for (const s of [-1, 1]) { const pil = box(3, 11, 3.4, rockM); add(pil, ax + s * 7, az, H(ax, az) + 5.5, 0.1 * s); circ(ax + s * 7, az, 2.4); } const lint = box(18, 3, 3.6, rockM); add(lint, ax, az, H(ax, az) + 12, 0.02);
    // mining site (pit is carved into the terrain at (128, 6))
    const mx = 128, mz = 6; const dump = (x, z, rot) => { const g = new THREE.Group(), y = Mat.paint(0xf2b80d, { metalness: 0.4, roughness: 0.45 }); const bed = box(6, 2, 3.4, y); bed.position.set(-1, 2.6, 0); bed.rotation.z = 0.12; g.add(bed); const cab = box(2, 2.2, 3.2, y); cab.position.set(3, 2.1, 0); g.add(cab); const gl = box(0.08, 1, 2.6, Mat.glass(0x9fd8ff, 0.6)); gl.position.set(4.02, 2.5, 0); g.add(gl);
      for (const x2 of [-2.8, 0, 3]) for (const z2 of [-1.9, 1.9]) { const wh = cyl(0.95, 0.95, 0.9, Mat.paint(0x18191d, { roughness: 0.9 }), 16); wh.rotation.x = Math.PI / 2; wh.position.set(x2, 0.95, z2); g.add(wh); } add(g, x, z, null, rot); circ(x, z, 3.5); };
    dump(mx - 26, mz + 8, 0.8); dump(mx + 10, mz + 26, -0.6);
    { const g = new THREE.Group(), y = Mat.paint(0xf2b80d, { metalness: 0.4 }); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lg = cyl(0.25, 0.4, 20, y, 6); lg.position.set(sx * 2.4, 10, sz * 2.4); lg.rotation.z = -sx * 0.06; lg.rotation.x = sz * 0.06; g.add(lg); } for (let i = 0; i < 6; i++) { const bar = box(5.4 - i * 0.5, 0.2, 0.2, y); bar.position.y = 3 + i * 3.1; g.add(bar); const bar2 = bar.clone(); bar2.rotation.y = Math.PI / 2; g.add(bar2); }
      const jib = box(18, 0.8, 1, y); jib.position.set(5, 21, 0); g.add(jib); const hook = cyl(0.04, 0.04, 8, Mat.metal(0x222), 6); hook.position.set(12, 17, 0); g.add(hook); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), Mat.glow(0xff3030, 2)); lamp.position.set(-4, 21.5, 0); g.add(lamp); A((t) => (lamp.material.emissiveIntensity = Math.sin(t * 3) > 0 ? 2.5 : 0.2)); add(g, mx - 14, mz - 10, null, 0.3); circ(mx - 14, mz - 10, 3.6); }
    for (let i = 0; i < 4; i++) { const pile = new THREE.Mesh(new THREE.ConeGeometry(3 + R() * 2, 3 + R() * 2, 9), Mat.rock(0xb9b0a8, 2)); add(pile, mx + 14 + R() * 12, mz - 16 + i * 6, null, R() * 6); circ(mx + 14 + R() * 12, mz - 16 + i * 6, 2.5); }
    // research outpost near the radiation shelter
    const [rx, rz] = L('RadiationShelter'); for (const [dx, dz, s] of [[14, -12, 3], [18, 6, 2.5], [-6, 14, 3.2]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(s, 20, 12, 0, 6.283, 0, 1.571), Mat.panel(0xf1efe8)); add(d, rx + dx, rz + dz); circ(rx + dx, rz + dz, s + 0.5); const door = box(1, 1.7, 0.2, Mat.glow(0x4fd1ff, 0.7)); door.position.set(0, 0.85, s - 0.02); d.add(door); }
    for (const [dx, dz] of [[-12, -10], [10, 16]]) { const g = new THREE.Group(), base = cyl(0.8, 1.1, 1, Mat.metal(0x6c7587), 10); base.position.y = 0.5; g.add(base); const dish = new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 8, 0, 6.283, 0, 1.0), Mat.paint(0xf2f4f8, { side: THREE.DoubleSide, metalness: 0.6 })); dish.position.y = 3; dish.rotation.x = -0.9; g.add(dish); const arm = cyl(0.1, 0.1, 2, Mat.metal(0x333), 6); arm.position.y = 2; g.add(arm); add(g, rx + dx, rz + dz, null, R() * 6); circ(rx + dx, rz + dz, 1.2); }
    // radio towers with blinking beacons
    for (const [tx, tz] of [[72, 72], [-84, -78], [-30, 92]]) { const g = new THREE.Group(), steel = Mat.metal(0xb0b6c2, { roughness: 0.5 }); for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const lg = cyl(0.07, 0.14, 26, steel, 6); lg.position.set(sx * 0.9, 13, sz * 0.9); lg.rotation.z = -sx * 0.025; lg.rotation.x = sz * 0.025; g.add(lg); } for (let i = 0; i < 9; i++) { const c = box(2.2 - i * 0.12, 0.07, 0.07, steel); c.position.y = 2 + i * 2.7; g.add(c); const c2 = c.clone(); c2.rotation.y = Math.PI / 2; g.add(c2); } const lt = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), Mat.glow(0xff3030, 2)); lt.position.y = 26.4; g.add(lt); A((t) => (lt.material.emissiveIntensity = Math.sin(t * 2.5 + tx) > 0.2 ? 3 : 0.15)); add(g, tx, tz); circ(tx, tz, 1.6); } }

  // ---------- barrels & crates (instanced) ----------
  { const spots = [L('RepairStation'), L('LandingZone'), L('OxygenGenerator'), L('ResearchLab'), L('WaterExtractor'), L('Antenna'), [128, 6]], N = spots.length * 7;
    const barrels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 14), Mat.paint(0xff7a3d, { metalness: 0.5, roughness: 0.4 }), N), crates = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), Mat.panel(0xb0b5a0, { roughness: 0.7 }), N), d = new THREE.Object3D(); let b = 0, c = 0;
    spots.forEach(([sx, sz]) => { for (let i = 0; i < 7; i++) { const a = R() * 6.283, r = 10 + R() * 5, x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r; if (w.flats.some((f) => f.key !== 'x' && Math.hypot(x - f.x, z - f.z) < Math.min(f.r, 6))) continue; if (R() > 0.5) { d.position.set(x, H(x, z) + 0.5, z); d.rotation.set(0, R() * 6, 0); d.scale.setScalar(1); d.updateMatrix(); barrels.setMatrixAt(b++, d.matrix); circ(x, z, 0.55); } else { d.position.set(x, H(x, z) + 0.55, z); d.rotation.set(0, R() * 6, 0); d.scale.setScalar(0.8 + R() * 0.6); d.updateMatrix(); crates.setMatrixAt(c++, d.matrix); circ(x, z, 0.8); } } });
    barrels.count = b; crates.count = c; barrels.castShadow = crates.castShadow = true; root.add(barrels, crates); }

  // ---------- second solar field (instanced) ----------
  { const rows = 3, cols = 8, im = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.14, 3), Mat.solar(), rows * cols), poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.13, 1.8, 6), Mat.metal(0x6c7587), rows * cols), d = new THREE.Object3D(), ox = 66, oz = -102;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = ox + (c - cols / 2) * 6, z = oz + r * 5, i = r * cols + c, y = H(x, z); d.position.set(x, y + 1.9, z); d.rotation.set(-0.55, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); d.position.set(x, y + 0.9, z); d.rotation.set(0, 0, 0); d.updateMatrix(); poles.setMatrixAt(i, d.matrix); }
    im.castShadow = true; root.add(im, poles); circ(ox, oz + 5, 16); }

  // ---------- landing pad lights ----------
  { const [px, pz] = L('LandingZone'), ls = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, x = px + Math.cos(a) * 14.6, z = pz + Math.sin(a) * 14.6, m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), Mat.glow(0xffc83d, 1)); m.position.set(x, H(x, z) + 0.45, z); root.add(m); ls.push(m); } A((t) => ls.forEach((m, i) => (m.material.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 3 - i * 0.6)) * 3))); }

  // ---------- weather mast & wandering dust devils ----------
  { const [lx, lz] = L('ResearchLab'), g = new THREE.Group(), mast = cyl(0.08, 0.1, 9, Mat.metal(0xd7dce6), 6); mast.position.y = 4.5; g.add(mast); const cups = new THREE.Group(); cups.position.y = 9.1; for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283, arm = box(1, 0.05, 0.05, Mat.metal(0x333)); arm.position.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); arm.rotation.y = -a; cups.add(arm); const cup = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6, 0, 6.283, 0, 1.571), Mat.paint(0xff7a3d)); cup.position.set(Math.cos(a) * 1, 0, Math.sin(a) * 1); cups.add(cup); } g.add(cups); add(g, lx + 12, lz + 12); circ(lx + 12, lz + 12, 0.8); A((t, dt) => (cups.rotation.y += dt * 4));
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.5, 14, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xd49a68, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })); root.add(m); A((t) => { const a = t * 0.03 + i * 3.1, r = 105 + Math.sin(t * 0.2 + i) * 20, x = Math.cos(a) * r, z = Math.sin(a) * r; m.position.set(x, H(x, z) + 7, z); m.rotation.y = t * 5; m.rotation.z = Math.sin(t * 0.7) * 0.1; }); } }
}
