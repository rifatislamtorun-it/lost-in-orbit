import * as THREE from 'three';
import { CONFIG } from '../config/game.config.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Tex } from './Textures.js';
import { LOCATION_INFO } from '../data/nasaSources.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { CameraRig } from './Camera.js';
import { Interaction } from './Interaction.js';
import { MissionManager } from './Missions.js';
import { Resources } from './Resources.js';
import { Scoring } from './Scoring.js';
import { QuizManager } from './Quiz.js';
import { EventManager } from './Events.js';
import { SaveSystem } from './SaveSystem.js';
import { AudioFX } from './Audio.js';
import { Input } from './Input.js';
import { HUD } from '../ui/HUD.js';
import { MainMenu } from '../ui/MainMenu.js';
import { Panels } from '../ui/MissionPanel.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { ResultsScreen } from '../ui/ResultsScreen.js';
import { SciencePanel } from '../ui/SciencePanel.js';
import { onModalChange, closeAll, popEsc, $ } from '../ui/ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Game {
  constructor() {
    this.canvas = $('#c'); this.settings = SaveSystem.loadSettings(); this.mode = 'loading'; this.modals = 0; this.time = 0; this.storm = { cur: 0, target: 0 };
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(60, 1, 0.3, 1600);
    this.buildSky(); this.buildLights(); this.puffs = new Puffs(this.scene); this.puffT = 0;
    this.audio = new AudioFX(this.settings); this.res = new Resources(); this.score = new Scoring(); this.quiz = new QuizManager(this);
    this.input = new Input(this.canvas); this.clock = new THREE.Clock();
    this.applyQuality(); window.addEventListener('resize', () => this.resize());
    onModalChange((n) => { this.modals = n; if (n > 0) this.input.releaseLock(); });
    this.input.onLockChange = (locked) => { if (!locked && this.state === 'playing') this.pauseMenu.open(); };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.mode === 'game' && !e.repeat) { if (!popEsc() && this.state === 'playing') this.pauseMenu.open(); }
    });
    document.addEventListener('click', (e) => {
      if (!(e.target.closest && e.target.closest('button, a.nasa-btn'))) return; this.audio.sfx('click');
      setTimeout(() => { if (this.mode === 'game' && this.state === 'playing') { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); this.input.relock(); } }, 60);
    });
  }
  get state() { return this.mode !== 'game' ? this.mode : this.modals > 0 ? 'modal' : 'playing'; }

  buildSky() {
    const C = (h) => new THREE.Color(h); this.skyCols = { hor: C(0xeab58a), mid: C(0xc98a6c), zen: C(0x7d6574), storm: C(0xa55f35) };
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { sunDir: { value: new THREE.Vector3(70, 100, 45).normalize() }, storm: { value: 0 }, hor: { value: this.skyCols.hor }, mid: { value: this.skyCols.mid }, zen: { value: this.skyCols.zen }, stormC: { value: this.skyCols.storm } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vD; uniform vec3 sunDir, hor, mid, zen, stormC; uniform float storm;
        void main(){ vec3 d = normalize(vD); float h = clamp(d.y, 0.0, 1.0);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, zen, smoothstep(0.18, 0.95, h));
          float s = max(dot(d, sunDir), 0.0);
          c += vec3(1.0, 0.72, 0.45) * pow(s, 14.0) * 0.55;          // warm glow
          c += vec3(0.25, 0.45, 0.9) * pow(s, 5.0) * 0.12;            // Mars' bluish sunset-style halo
          c += vec3(1.0, 0.95, 0.85) * pow(s, 1200.0) * 40.0;         // sun disc (blooms)
          c = mix(c, stormC, storm * 0.9); if (d.y < 0.0) c = mix(hor, hor * 0.6, clamp(-d.y * 3.0, 0.0, 1.0));
          gl_FragColor = vec4(c, 1.0); }` });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), this.skyMat); this.dome.renderOrder = -1000; this.dome.frustumCulled = false; this.scene.add(this.dome);
    // image-based lighting from the sky → realistic metal / glass reflections
    const pm = new THREE.PMREMGenerator(this.renderer), envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.skyMat));
    this.scene.environment = pm.fromScene(envScene, 0.02, 0.1, 200).texture; this.scene.environmentIntensity = 0.75; pm.dispose();
    this.fogBase = { color: this.skyCols.hor.clone(), storm: this.skyCols.storm.clone(), density: 0.0016 }; this.scene.fog = new THREE.FogExp2(this.fogBase.color.clone(), this.fogBase.density);
  }
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffd9bd, 0x7a3a22, 0.35); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0dd, 3.3); this.sun.position.set(70, 100, 45); this.sun.castShadow = true;
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -70; sc.right = sc.top = 70; sc.near = 1; sc.far = 320; this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.06; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const N = 700, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++) p[i] = (Math.random() - 0.5) * 60; g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: Tex.soft(), color: 0xe0a77a, size: 0.55, transparent: true, opacity: 0.25, depthWrite: false })); this.dust.frustumCulled = false; this.scene.add(this.dust);
  }
  /** Graphics quality: high (MSAA + bloom + 2k shadows), medium, low. 'auto' picks by CPU cores. */
  applyQuality() {
    const pick = this.settings.quality === 'auto' || !this.settings.quality ? ((navigator.hardwareConcurrency || 8) <= 4 ? 'medium' : 'high') : this.settings.quality;
    const Q = { high: { pr: 1.75, shadow: 2048, bloom: true, samples: 4 }, medium: { pr: 1.25, shadow: 1024, bloom: true, samples: 0 }, low: { pr: 1, shadow: 0, bloom: false, samples: 0 } }[pick]; this.Q = Q;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.pr)); this.renderer.shadowMap.enabled = Q.shadow > 0; this.sun.castShadow = Q.shadow > 0;
    if (Q.shadow) { this.sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
    this.buildComposer();
  }
  buildComposer() {
    if (this.composer) { this.composer.dispose && this.composer.dispose(); }
    const w = window.innerWidth, h = window.innerHeight, pr = this.renderer.getPixelRatio(); this.renderer.setSize(w, h, false);
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: this.Q.samples });
    this.composer = new EffectComposer(this.renderer, rt); this.composer.setSize(w * pr, h * pr); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w * pr, h * pr), 0.32, 0.55, 0.92); this.bloom.enabled = this.Q.bloom; this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  setLoad(i, f) {
    const pct = Math.round(Math.min(1, (i + f) / 5) * 100); $('#load-bar').style.width = pct + '%'; $('#load-pct').textContent = pct + '%';
    document.querySelectorAll('#load-steps li').forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('now', k === i); });
  }
  async init() {
    this.world = new World(this.scene); this.player = new Player(this.scene, this.world); this.player.group.visible = false; this.player.onJump = () => this.audio.sfx('jump');
    this.setLoad(0, 0.1); await this.player.load(); this.setLoad(1, 0.1);
    await this.world.load((f) => this.setLoad(1, f * 0.9)); this.setLoad(2, 0);
    this.cam = new CameraRig(this.camera, this.world); this.cam.sens = this.settings.sensitivity;
    this.hud = new HUD(this); this.panels = new Panels(this); this.science = new SciencePanel(this); this.menu = new MainMenu(this); this.results = new ResultsScreen(this);
    this.pauseMenu = new PauseMenu(this); this.interaction = new Interaction(this); this.missions = new MissionManager(this); this.events = new EventManager(this);
    this.res.on((r, d) => this.hud.setRes(r, d)); this.hud.setRes(this.res); this.applySettings(); await sleep(150); this.setLoad(3, 0); await sleep(150); this.setLoad(4, 0.5); await sleep(150); this.setLoad(5, 1);
    await sleep(250); $('#loading').classList.add('hide'); setTimeout(() => ($('#loading').hidden = true), 700);
    this.mode = 'menu'; this.menu.show(); this.clock.start(); this.loop();
  }
  applySettings() {
    document.documentElement.style.fontSize = 16 * this.settings.uiScale + 'px'; if (this.cam) this.cam.sens = this.settings.sensitivity; SaveSystem.saveSettings(this.settings);
  }
  resize() { this.buildComposerSize(); }
  buildComposerSize() { const w = window.innerWidth, h = window.innerHeight, pr = this.renderer.getPixelRatio(); this.renderer.setSize(w, h, false); this.composer.setSize(w * pr, h * pr); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  // ---------- flow ----------
  startGameplay() {
    this.mode = 'game'; closeAll(); this.menu.hide(); this.hud.show(true);
    const w = this.world, hb = w.locations.get('Habitat'); this.player.group.visible = true; this.player.spawn(w.spawn);
    if (hb) { const d = hb.center.clone().sub(w.spawn); this.cam.yaw = Math.atan2(-d.x, -d.z); this.player.faceToward(hb.center); }
    this.cam.init = false; this.cam.cine = null;
  }
  newGame() { SaveSystem.clear(); this.res.reset(); this.score.reset(); this.startGameplay(); this.missions.begin(0); }
  continueGame() {
    const s = SaveSystem.load(); if (!s || s.finished) return this.newGame();
    this.res.reset(); this.res.load(s.res); this.score.reset(); this.score.load(s.score); this.startGameplay(); this.missions.begin(s.mission);
  }
  resetProgress() { SaveSystem.clear(); this.menu.show(); }
  saveSnapshot(index) { this.lastSnap = { v: 1, mission: index, res: this.res.serialize(), score: this.score.serialize() }; SaveSystem.save(this.lastSnap); }
  retryMission() { const s = this.lastSnap; closeAll(); this.res.load(s.res); this.score.load(s.score); this.missions.begin(s.mission); }
  restartMissionFromPause() { closeAll(); this.retryMission(); }
  toMenu() { this.mode = 'menu'; closeAll(); this.hud.show(false); this.player.group.visible = false; this.storm.target = 0; this.world.setActive([]); this.world.setAlerts([]); this.missions.active = false; this.input.releaseLock(); this.menu.show(); }
  finish(cycles) {
    this.unlock('mission_engineer'); const rank = this.score.rank(this.res); if (rank.min >= 70) this.unlock('mars_commander');
    SaveSystem.save({ ...this.lastSnap, finished: true }); this.results.show(cycles);
  }
  unlock(id) { const a = this.score.unlock(id); if (a) { this.hud.achievement(a); this.audio.sfx('achieve'); } }
  setStorm(v) { this.storm.target = v; }

  interact(key) {
    if (this.state !== 'playing') return;
    this.audio.sfx('interact');
    if (!this.missions.interact(key)) this.inspect(key);
  }
  inspect(key) {
    const info = LOCATION_INFO[key]; if (!info) return;
    if (!this.score.discoveries.includes(key)) { this.score.discoveries.push(key); this.score.science += 5; this.score.points += 5; this.hud.toast('🔎 New discovery!  +5 Science Points', 'good'); }
    const loc = this.world.locations.get(key); if (loc) this.player.faceToward(loc.target(this.player.group.position));
    this.player.react(key === 'Rover' ? 'Scan' : 'Interact', 1); if (key === 'Rover') this.world.driveRover();
    this.panels.info({ title: info.name, icon: info.icon, text: info.text, src: info.src, button: 'CLOSE' }, () => {});
  }

  // ---------- loop ----------
  loop = () => {
    requestAnimationFrame(this.loop); const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
    try { this.update(dt); } catch (e) { console.error(e); }
    this.composer.render(); this.input.endFrame();
  };
  update(dt) {
    this.world.update(this.time, dt); this.updateStorm(dt); this.dome.position.copy(this.camera.position); this.puffs.update(dt);
    if (this.mode !== 'game') { this.cam.menuOrbit(this.time); return; }
    const playing = this.state === 'playing'; this.input.enabled = playing;
    if (playing) {
      if (this.input.dx || this.input.dy) this.cam.rotate(this.input.dx, this.input.dy);
      if (this.input.wheel) this.cam.zoom(this.input.wheel);
      if (this.cam.cine && (this.input.hit('Space') || this.input.hit('Enter') || this.input.hit('KeyE'))) this.cam.skipCinematic();
    }
    this.player.update(dt, this.input, this.cam.yaw, playing && !this.cam.cine);
    this.cam.update(dt, this.player.group.position);
    this.interaction.update(); this.events.update(dt); this.hud.update(dt);
    const pp = this.player.group.position; this.puffT -= dt;
    if (this.player.grounded && this.player.speed > 6.5 && this.puffT <= 0) { this.puffT = 0.1; this.puffs.emit(pp, 1, 1); }
    if (this.player.landed > 0) this.puffs.emit(pp, Math.ceil(7 * this.player.landed), 2);
    const p = this.player.group.position; this.sun.target.position.copy(p); this.sun.position.set(p.x + 70, p.y + 100, p.z + 45);
  }
  updateStorm(dt) {
    const s = this.storm; s.cur += (s.target - s.cur) * Math.min(1, dt * 0.35); const k = s.cur, fb = this.fogBase;
    this.scene.fog.density = THREE.MathUtils.lerp(fb.density, 0.021, k); this.scene.fog.color.copy(fb.color).lerp(fb.storm, k); this.skyMat.uniforms.storm.value = k;
    this.sun.intensity = THREE.MathUtils.lerp(3.3, 1.2, k); this.hemi.intensity = THREE.MathUtils.lerp(0.35, 0.5, k); this.scene.environmentIntensity = THREE.MathUtils.lerp(0.75, 0.45, k);
    this.dust.material.opacity = 0.22 + 0.5 * k; this.dust.material.size = 0.5 + 0.35 * k;
    const a = this.dust.geometry.attributes.position, c = this.camera.position, wind = 1.2 + 16 * k;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i) + dt * wind, y = a.getY(i) + Math.sin(this.time + i) * dt * 0.4, z = a.getZ(i) + dt * wind * 0.3;
      if (x - c.x > 30) x -= 60; if (x - c.x < -30) x += 60; if (z - c.z > 30) z -= 60; if (z - c.z < -30) z += 60; if (y - c.y > 15) y -= 30; if (y - c.y < -15) y += 30;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
  }
}

/** Soft dust puffs kicked up by running and landing. */
class Puffs {
  constructor(scene) {
    this.items = []; this.i = 0;
    for (let n = 0; n < 40; n++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.soft(), color: 0xcf9a72, transparent: true, opacity: 0, depthWrite: false })); sp.visible = false; scene.add(sp); this.items.push({ sp, life: 0, max: 1, v: new THREE.Vector3(), s0: 1 }); }
  }
  emit(pos, n = 1, power = 1) {
    for (let k = 0; k < n; k++) { const it = this.items[this.i++ % this.items.length]; it.life = it.max = 0.7 + Math.random() * 0.5; it.s0 = 0.5 + Math.random() * 0.5 * power; it.sp.position.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 0.1, pos.z + (Math.random() - 0.5) * 0.5); it.v.set((Math.random() - 0.5) * power * 1.6, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * power * 1.6); it.sp.visible = true; }
  }
  update(dt) { for (const it of this.items) { if (it.life <= 0) continue; it.life -= dt; const t = 1 - it.life / it.max; it.sp.position.addScaledVector(it.v, dt); it.sp.scale.setScalar(it.s0 * (1 + t * 2.2)); it.sp.material.opacity = Math.max(0, 0.4 * (1 - t)); if (it.life <= 0) it.sp.visible = false; } }
}
