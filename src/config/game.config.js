// ============================================================================
//  LOST IN ORBIT — single configuration file (StellarSpark)
//  Replace the GLB files, adjust paths / name patterns here. No gameplay edits needed.
// ============================================================================
const B = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';

export const ASSETS = {
  // Set true ONLY if you supply your own GLB files. By default the game builds the astronaut and colony in code.
  USE_GLB: { player: false, colony: false },
  PLAYER_MODEL: B + 'assets/player/PLAYER_CHARACTER.glb',
  COLONY_MODEL: B + 'assets/colony/MARS_COLONY.glb',
  LOGO: B + 'assets/ui/stellarspark_logo.jpeg',
  MAP: B + 'assets/ui/colony_map.jpeg',
  AVATAR: B + 'assets/player/avatar.png',
  PORTRAIT: B + 'assets/ui/commander_portrait.png',
};

export const CONFIG = {
  colony: {
    autoScale: true,        // normalise the colony so its widest side = targetSize metres
    targetSize: 260,
    scale: 1,               // extra manual multiplier
    // nodes whose normalised name contains one of these are NOT used for collision
    ignoreForCollision: ['sky', 'dust', 'zone', 'trigger', 'nocollide', 'fog', 'particle'],
    glbEffects: true,       // gentle automatic animation (antenna spin, solar sway, pulses)
  },
  player: {
    height: 1.8, walk: 5.2, sprint: 9.5, jump: 7.5, gravity: 22, radius: 0.5, stepHeight: 0.65,
    modelYawOffset: 0,      // radians; set Math.PI if your character faces -Z
  },
  camera: { distance: 7.5, min: 3, max: 16, sensitivity: 1 },
  interact: { reach: 7 },
  graphics: { quality: 'auto' },   // 'high' | 'medium' | 'low' | 'auto'
  events: { minDelay: 45, maxDelay: 80 },   // seconds between random Mission Control alerts
};

// Object-name patterns used to auto-connect GLB objects to gameplay locations (order = priority).
// Short patterns (<4 chars) must match a whole word. Custom property "tag" / "gameId" on a node also works.
export const OBJECT_MAP = {
  Greenhouse: ['greenhouse', 'green_house', 'garden', 'farm', 'biodome'],
  SolarArray: ['solararray', 'solar', 'pvpanel', 'solarpanel'],
  WaterExtractor: ['waterextractor', 'water', 'extractor', 'icedrill'],
  OxygenGenerator: ['oxygengenerator', 'oxygen', 'o2', 'moxie'],
  ResearchLab: ['researchlab', 'lab', 'laboratory', 'research'],
  RepairStation: ['repairstation', 'repair', 'workshop', 'garage'],
  Antenna: ['antenna', 'commdish', 'satellitedish', 'radar'],
  LandingZone: ['landingzone', 'landing', 'launchpad', 'rocket'],
  DustStormZone: ['duststorm', 'storm'],
  RadiationShelter: ['radiationshelter', 'radiation', 'shelter', 'bunker'],
  Rover: ['rover'],
  Crater: ['crater'],
  Volcano: ['volcano', 'volcanic'],
  Mountain: ['mountain'],
  Habitat: ['habitat', 'hab', 'maindome', 'basecore'],
};
// Optional exact-name overrides, e.g. { Habitat: 'My_Main_Dome_01' }
export const EXPLICIT_NAMES = {};

// Animation clip detection (case-insensitive: exact name first, then "contains")
export const ANIMATION_MAP = {
  Idle: ['idle', 'stand', 'breath'], Walk: ['walk'], Run: ['run', 'sprint', 'jog'], Jump: ['jump', 'takeoff'],
  Fall: ['fall'], Interact: ['interact', 'press', 'button'], Wave: ['wave', 'hello', 'greet'],
  Celebrate: ['celebrate', 'victory', 'cheer', 'dance', 'win'], Sad: ['sad', 'disappoint', 'defeat'],
  Repair: ['repair', 'fix', 'wrench'], UseTool: ['usetool', 'tool'], Point: ['point'], Scan: ['scan'],
  Damage: ['damage', 'concern', 'hurt', 'worried'],
};
export const ANIM_FALLBACK = {
  Idle: ['Idle'], Walk: ['Walk', 'Run', 'Idle'], Run: ['Run', 'Walk', 'Idle'], Jump: ['Jump', 'Fall', 'Idle'],
  Fall: ['Fall', 'Jump', 'Idle'], Interact: ['Interact', 'UseTool', 'Repair', 'Point', 'Wave'],
  Wave: ['Wave', 'Point', 'Interact'], Celebrate: ['Celebrate', 'Wave', 'Jump'], Sad: ['Sad', 'Damage'],
  Repair: ['Repair', 'UseTool', 'Interact'], UseTool: ['UseTool', 'Repair', 'Interact'],
  Point: ['Point', 'Wave', 'Interact'], Scan: ['Scan', 'Point', 'Interact'], Damage: ['Damage', 'Sad'],
};

// Demo-mode world layout (x, z in metres) — used only while MARS_COLONY.glb is absent.
export const PLACEHOLDER_LAYOUT = {
  Habitat: [0, 0], Greenhouse: [30, -4], ResearchLab: [-36, -4], WaterExtractor: [-28, -58], SolarArray: [8, -62],
  OxygenGenerator: [48, -48], RepairStation: [62, 12], Antenna: [40, 42], LandingZone: [-58, 42],
  DustStormZone: [8, 102], Crater: [-100, 12], Rover: [-88, -42], RadiationShelter: [96, -26],
  Volcano: [112, 84], Mountain: [135, -100],
};
export const FLAT_RADIUS = {
  Habitat: 26, Greenhouse: 11, ResearchLab: 10, WaterExtractor: 8, SolarArray: 18, OxygenGenerator: 9,
  RepairStation: 10, Antenna: 6, LandingZone: 20, Rover: 6, RadiationShelter: 9,
};
