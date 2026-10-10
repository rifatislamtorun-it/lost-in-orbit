import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Tex, Mat, rep } from './Textures.js';

/**
 * Procedural astronaut "Commander", modelled on the supplied reference (front_view / back_side):
 * navy flight-suit jacket with patches, black tee, grey cargo trousers, navy/cream boots, big backpack,
 * wristwatch, curly dark hair in a high bun, and a removable glass helmet (toggle with H).
 * Every limb is a joint pivot so AnimationController can pose it. Feet are at y = 0, character faces +Z, ~1.75 m tall.
 */
export function buildCommander() {
  const root = new THREE.Group(), V2 = THREE.Vector2, fab = Tex.fabric().normal;
  const fabric = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.03, normalMap: fab, normalScale: new V2(0.7, 0.7), ...o });
  const M = {
    navy: fabric(0x172a63), navyD: fabric(0x0e1a40), tee: fabric(0x131419, { roughness: 0.9 }), pants: fabric(0x4b4a4f, { roughness: 0.88, normalScale: new V2(1.1, 1.1) }),
    pantsD: fabric(0x37363b, { roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: 0xb98060, roughness: 0.5, metalness: 0 }), lip: new THREE.MeshStandardMaterial({ color: 0x8d4a43, roughness: 0.4 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x1b120e, roughness: 0.85 }), black: Mat.paint(0x101114, { roughness: 0.55, metalness: 0.1 }), strap: fabric(0x15161a),
    boot: new THREE.MeshStandardMaterial({ color: 0x1f3170, roughness: 0.5, metalness: 0.05 }), sole: new THREE.MeshStandardMaterial({ color: 0xe9dcc6, roughness: 0.7 }), metal: Mat.metal(0xa9b2c2),
    brass: Mat.metal(0x9a7a45, { roughness: 0.45 }), white: Mat.paint(0xeef1f6, { roughness: 0.4, metalness: 0.15 }), orange: Mat.paint(0xff7a3d, { roughness: 0.5 }),
    cyan: Mat.glow(0x4fd1ff, 1.4), eyeW: new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.3 }), iris: new THREE.MeshStandardMaterial({ color: 0x2a170f, roughness: 0.2 }),
    patch: new THREE.MeshStandardMaterial({ map: Tex.emblem(), roughness: 0.7, transparent: true, alphaTest: 0.3 }), glass: Mat.glass(0xcfe9ff, 0.16, { clearcoatRoughness: 0.03, envMapIntensity: 2.2 }),
  };
  const mesh = (g, m, x = 0, y = 0, z = 0, p = null) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); (p || root).add(o); return o; };
  const cap = (r, len, m, p, x = 0, y = 0, z = 0) => mesh(new THREE.CapsuleGeometry(r, len, 8, 20), m, x, y, z, p);
  const ell = (sx, sy, sz, m, p, x = 0, y = 0, z = 0, r = 0.5) => { const o = mesh(new THREE.SphereGeometry(r, 24, 16), m, x, y, z, p); o.scale.set(sx / r / 2, sy / r / 2, sz / r / 2); return o; };
  const rbox = (w, h, d, m, p, x = 0, y = 0, z = 0, rad = 0.012) => mesh(new RoundedBoxGeometry(w, h, d, 3, rad), m, x, y, z, p);
  const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const torus = (R, r, m, p, x, y, z, sx = 1, sz = 1) => { const o = mesh(new THREE.TorusGeometry(R, r, 10, 28), m, x, y, z, p); o.rotation.x = Math.PI / 2; o.scale.set(sx, sz, 1); return o; };

  // ---------------- hips & legs ----------------
  const hips = grp(root, 0, 0.93, 0);
  ell(0.36, 0.2, 0.24, M.pants, hips, 0, -0.02, 0);
  rbox(0.37, 0.05, 0.25, M.black, hips, 0, 0.07, 0);                                   // belt
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12), M.brass, 0, 0.07, 0.127, hips).rotation.x = Math.PI / 2;
  const leg = (side) => {
    const s = side === 'L' ? 1 : -1, hip = grp(hips, s * 0.095, -0.04, 0);
    cap(0.095, 0.27, M.pants, hip, 0, -0.2, 0);                                           // thigh
    const pocket = rbox(0.055, 0.16, 0.12, M.pantsD, hip, s * 0.098, -0.2, 0.01); rbox(0.058, 0.05, 0.125, M.pants, hip, s * 0.098, -0.14, 0.01);
    rbox(0.012, 0.1, 0.02, M.black, hip, s * 0.129, -0.2, 0.03); void pocket;
    const knee = grp(hip, 0, -0.43, 0);
    cap(0.074, 0.27, M.pants, knee, 0, -0.2, 0);                                           // shin
    rbox(0.115, 0.11, 0.045, M.navy, knee, 0, 0.02, 0.075, 0.02);                          // knee pad
    torus(0.078, 0.02, M.black, knee, 0, -0.4, 0, 1, 1);                                    // elastic cuff
    const ankle = grp(knee, 0, -0.42, 0);
    rbox(0.115, 0.1, 0.27, M.boot, ankle, 0, -0.01, 0.045, 0.04); rbox(0.12, 0.035, 0.295, M.sole, ankle, 0, -0.055, 0.045, 0.015);
    rbox(0.1, 0.05, 0.1, M.metal, ankle, 0, 0.02, 0.1, 0.02); rbox(0.075, 0.07, 0.03, M.white, ankle, 0, 0.055, 0.04, 0.012);   // tongue + ankle collar
    return { hip, knee, ankle };
  };
  const legL = leg('L'), legR = leg('R');

  // ---------------- spine / torso ----------------
  const spine = grp(root, 0, 0.99, 0);
  const chest = grp(spine, 0, 0, 0);
  cap(0.145, 0.1, M.tee, chest, 0, 0.06, 0).scale.set(1.2, 1, 0.82);                       // abdomen (tee)
  const jacket = cap(0.165, 0.17, M.navy, chest, 0, 0.23, 0); jacket.scale.set(1.28, 1, 0.86);
  torus(0.19, 0.03, M.navyD, chest, 0, 0.01, 0, 1.12, 0.86);                                 // ribbed hem
  rbox(0.115, 0.36, 0.03, M.tee, chest, 0, 0.23, 0.135, 0.015);                              // open front shows black tee
  for (const s of [-1, 1]) { rbox(0.012, 0.37, 0.02, M.metal, chest, s * 0.062, 0.23, 0.142, 0.005); rbox(0.075, 0.33, 0.04, M.navy, chest, s * 0.105, 0.23, 0.125, 0.02); }   // zipper tapes + front panels
  torus(0.095, 0.034, M.navyD, chest, 0, 0.43, -0.005, 1, 0.95);                              // collar
  for (const s of [-1, 1]) { rbox(0.06, 0.07, 0.03, M.navyD, chest, s * 0.115, 0.14, 0.158, 0.008); }   // chest pockets
  const chestPatch = mesh(new THREE.CircleGeometry(0.036, 24), M.patch, -0.115, 0.3, 0.147, chest);      // wearer's right chest emblem
  rbox(0.07, 0.022, 0.012, M.black, chest, 0.115, 0.3, 0.147, 0.004);                                     // name tape (left chest)
  for (const s of [-1, 1]) rbox(0.045, 0.34, 0.02, M.strap, chest, s * 0.1, 0.24, 0.161, 0.008);         // backpack straps over chest
  for (const s of [-1, 1]) { rbox(0.04, 0.025, 0.016, M.metal, chest, s * 0.1, 0.16, 0.172, 0.004); }

  // backpack
  const pack = grp(chest, 0, 0.23, -0.19);
  rbox(0.34, 0.44, 0.17, Mat.paint(0x142358, { roughness: 0.75, metalness: 0.05, normalMap: fab, normalScale: new V2(0.8, 0.8) }), pack, 0, 0, 0, 0.05);
  rbox(0.29, 0.2, 0.06, M.navy, pack, 0, -0.07, -0.1, 0.03); rbox(0.2, 0.16, 0.05, M.navyD, pack, 0, 0.1, -0.095, 0.02);
  mesh(new THREE.PlaneGeometry(0.1, 0.1), M.patch, 0, 0.1, -0.123, pack).rotation.y = Math.PI;
  rbox(0.07, 0.04, 0.02, M.metal, pack, 0, -0.07, -0.135, 0.008);
  for (const s of [-1, 1]) { rbox(0.035, 0.4, 0.014, M.brass, pack, s * 0.12, 0, -0.1, 0.004); const side = rbox(0.075, 0.22, 0.12, M.navyD, pack, s * 0.2, -0.04, 0, 0.025); void side;
    const tank = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 16), M.white, s * 0.235, 0.05, -0.02, pack); void tank; }
  const handle = mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16, Math.PI), M.brass, 0, 0.225, 0, pack);
  rbox(0.05, 0.03, 0.03, M.cyan, pack, 0, 0.15, -0.13, 0.006); void handle;

  // ---------------- arms ----------------
  const arm = (side) => {
    const s = side === 'L' ? 1 : -1, sh = grp(chest, s * 0.225, 0.36, 0);
    ell(0.13, 0.12, 0.12, M.navy, sh, 0, 0, 0);                                           // shoulder
    cap(0.066, 0.19, M.navy, sh, 0, -0.15, 0);                                            // upper sleeve
    const pt = mesh(new THREE.CircleGeometry(0.04, 24), M.patch, s * 0.068, -0.1, 0, sh); pt.rotation.y = s * Math.PI / 2;   // shoulder patch
    rbox(0.035, 0.09, 0.07, M.navyD, sh, s * 0.062, -0.2, -0.015, 0.012);                  // sleeve utility pocket
    const el = grp(sh, 0, -0.29, 0);
    cap(0.06, 0.07, M.navy, el, 0, -0.04, 0);                                            // rolled sleeve
    torus(0.062, 0.025, M.navyD, el, 0, -0.095, 0, 1, 1);                                   // ribbed cuff
    cap(0.046, 0.12, M.skin, el, 0, -0.17, 0);                                            // forearm
    const wrist = grp(el, 0, -0.27, 0);
    ell(0.085, 0.11, 0.05, M.skin, wrist, 0, -0.045, 0);                                     // hand
    ell(0.03, 0.07, 0.035, M.skin, wrist, s * 0.04, -0.035, 0.015).rotation.z = -s * 0.4;     // thumb
    if (side === 'L') { torus(0.05, 0.014, M.black, el, 0, -0.245, 0, 1, 1); rbox(0.045, 0.014, 0.05, M.black, el, 0, -0.247, 0.045, 0.006); rbox(0.032, 0.004, 0.032, M.cyan, el, 0, -0.254, 0.045, 0.002); }
    return { sh, el, wrist };
  };
  const armL = arm('L'), armR = arm('R');

  // ---------------- neck & head ----------------
  const neck = grp(spine, 0, 0.46, 0);
  mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.09, 16), M.skin, 0, 0.03, 0, neck);
  const head = grp(neck, 0, 0.1, 0.005);
  ell(0.185, 0.225, 0.2, M.skin, head, 0, 0.09, 0);                                     // skull
  ell(0.12, 0.1, 0.12, M.skin, head, 0, 0.035, 0.025);                                    // jaw
  ell(0.034, 0.04, 0.04, M.skin, head, 0, 0.085, 0.1);                                    // nose
  for (const s of [-1, 1]) {
    ell(0.034, 0.022, 0.02, M.eyeW, head, s * 0.04, 0.115, 0.083); ell(0.02, 0.02, 0.012, M.iris, head, s * 0.04, 0.115, 0.093);
    const br = rbox(0.045, 0.01, 0.014, M.hair, head, s * 0.04, 0.143, 0.088, 0.004); br.rotation.z = -s * 0.12;
    ell(0.03, 0.05, 0.03, M.skin, head, s * 0.093, 0.09, -0.005);
  }
  ell(0.05, 0.016, 0.02, M.lip, head, 0, 0.037, 0.093);
  // hair: cap + curls + high bun
  const cap1 = mesh(new THREE.SphereGeometry(0.106, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), M.hair, 0, 0.1, -0.012, head); cap1.scale.set(1.02, 1.03, 1.08); cap1.rotation.x = -0.28;
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 1.7 + Math.PI * 0.15, y = 0.04 + rnd() * 0.17, r = 0.09 + rnd() * 0.025; const c = mesh(new THREE.SphereGeometry(0.02 + rnd() * 0.014, 8, 6), M.hair, Math.cos(a) * r * (a > 1.3 ? 1 : 0.9) * (rnd() > 0.5 ? 1 : -1), y, -Math.abs(Math.sin(a)) * r * 0.9, head); c.scale.y = 1.3; }
  const bun = mesh(new THREE.SphereGeometry(0.058, 16, 12), M.hair, 0, 0.255, -0.045, head);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; mesh(new THREE.SphereGeometry(0.022, 6, 5), M.hair, Math.cos(a) * 0.045, 0.255 + Math.sin(a * 2) * 0.012, -0.045 + Math.sin(a) * 0.045, head); }
  torus(0.052, 0.008, M.orange, head, 0, 0.232, -0.045, 1, 1); void bun;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.014, 6, 5), M.hair, s * (0.075 + i * 0.006), 0.045 - i * 0.025, 0.03 - i * 0.012, head);   // loose side curls

  // helmet (glass bubble) — toggle with H
  const helmet = grp(neck, 0, 0.1, 0.005);
  mesh(new THREE.SphereGeometry(0.185, 36, 24), M.glass, 0, 0.09, 0.0, helmet);
  const ring = torus(0.115, 0.022, M.metal, helmet, 0, -0.035, 0, 1, 1.05); mesh(new THREE.TorusGeometry(0.118, 0.005, 6, 40), M.cyan, 0, -0.012, 0, helmet).rotation.x = Math.PI / 2; void ring;
  rbox(0.05, 0.04, 0.04, M.metal, helmet, 0.17, 0.08, 0, 0.01); rbox(0.05, 0.04, 0.04, M.metal, helmet, -0.17, 0.08, 0, 0.01);
  mesh(new THREE.SphereGeometry(0.014, 8, 6), M.cyan, 0, 0.27, 0.1, helmet);

  // ---------------- finish ----------------
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.material !== M.glass; o.receiveShadow = true; } });
  const rig = {
    root, hips, spine, chest, neck, head, legL, legR, armL, armR, helmet,
    setHelmet(v) { helmet.visible = v; },
  };
  // default pose: arms slightly away from body
  armL.sh.rotation.z = 0.1; armR.sh.rotation.z = -0.1; armL.el.rotation.x = -0.12; armR.el.rotation.x = -0.12;
  return { group: root, rig, height: 1.76 };
}
