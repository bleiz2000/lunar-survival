// ── Astronaut ────────────────────────────────────────────────
export const ASTRONAUT_SPEED = 150;        // px per second
export const ASTRONAUT_BODY_SIZE = 22;     // collision body square (px)
export const ASTRONAUT_BODY_OFFSET = { x: 9, y: 26 }; // body offset inside the 40x48 frame

// ── Camera ───────────────────────────────────────────────────
export const CAMERA_ZOOM = 1.2;
export const CAMERA_FOLLOW_LERP = 0.1;     // 0 = instant, 1 = never catches up

// ── World ────────────────────────────────────────────────────
export const WORLD_WIDTH = 2560;
export const WORLD_HEIGHT = 2560;
export const WORLD_SEED = 'lunar-survival-v1';

export const LANDER_OFFSET = { x: -140, y: -140 }; // lander position relative to world center
export const SPAWN_OFFSET = { x: 40, y: 70 };      // astronaut spawn relative to world center

export const LANDER_ANGLE = -7;            // crash tilt (degrees), straightened after the engine repair

export const CRATER_COUNT = 12;
export const ROCK_COUNT = 46;
export const PEBBLE_COUNT = 30;
export const BOULDER_COUNT = 12;

// Keep-out radii used to guarantee a safe, playable landing site.
export const BOULDER_LANDER_CLEARANCE = 420;
export const BOULDER_SPAWN_CLEARANCE = 190;
export const BOULDER_SPACING = 120;

// ── Outpost layout (offsets relative to the lander) ──────────
export const OUTPOST_LAYOUT = {
  // The dish was torn loose in the crash: it lies on the regolith until repaired.
  antenna: { x: 168, y: 214 },
  crates: [
    { x: 306, y: 292 },
    { x: -286, y: 268 },
    { x: 318, y: -96 }
  ],
  solar: [
    { x: -232, y: 26, rotation: -0.16 },
    { x: -226, y: 148, rotation: 0.12 }
  ],
  flag: { x: 232, y: 132 },
  // Attached to the hull, rotated together with the lander.
  engine: { x: -100, y: 30 },
  // Small service panel on the ground at the engine's feet.
  console: { x: -100, y: 118 },
  window: { x: 0, y: -30 },
  // Field cable junction at the foot of the LOWER solar panel.
  arrayConnector: { x: -184, y: 196 }
};

// ── Interaction ──────────────────────────────────────────────
export const INTERACT_KEY = 'E';
export const ANTENNA_RADIUS = 104;
export const SOLAR_RADIUS = 92;
export const WINDOW_RADIUS = 118; // measured against the hull wall: ~107px from the glass at the stop line
export const ENGINE_RADIUS = 88;
export const CONSOLE_RADIUS = 84;
export const ROVER_RADIUS = 104;

// ── Survey rover (first P1 field objective after the prologue) ─
// North-east of the lander, on the bearing Earth logged towards the
// abandoned testing base.
export const ROVER_OFFSET = { x: 520, y: -260 };

// ── Actions (E → progress bar → result) ──────────────────────
export const ACTION_DURATION = {
  antenna: 1700,
  power: 1500,
  window: 1400,
  engine: 1800,
  'engine-diagnostics': 1600,
  'console-terminal': 1200,
  'rover-power': 1800
};

// ── Typewriter speeds (ms per character) ─────────────────────
export const TYPE_SPEED = {
  PANIC: 11,      // shouting, emergencies
  EXCITED: 17,    // animated radio chatter
  REPORT: 30,     // calm, factual report
  CALM: 48,       // quiet reflection
  TIRED: 54       // resigned, slow
};

// ── Cinematic timings ────────────────────────────────────────
export const INTRO = {
  SPACE_HOLD: 3000,      // ms of silence in orbit before the camera pushes in
  FADE_MS: 520,          // space → cabin fade to black
  TIMER_START: 3 * 60 * 60, // 03:00:00
  TIMER_FAST_MS: 2600,
  CRASH_MS: 2200,
  SIGNAL_HOLD: 2800
};

// ── Viewport ─────────────────────────────────────────────────
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_BACKGROUND = '#0b0e14';

// ── Scene keys ───────────────────────────────────────────────
export const SCENE_BOOT = 'Boot';
export const SCENE_PRELOAD = 'Preload';
export const SCENE_MAIN_MENU = 'MainMenu';
export const SCENE_INTRO = 'Intro';
export const SCENE_GAME = 'Game';
export const SCENE_UI = 'UI';

// ── Shared UI style tokens ───────────────────────────────────
export const UI = {
  font: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
  mono: '"Consolas", "SFMono-Regular", "Menlo", monospace',
  panel: 0x0f1626,
  panelAlpha: 0.92,
  panelDeep: 0x0b1120,
  border: 0x3d4e68,
  borderSoft: 0x2a3648,
  text: '#dce5f2',
  textBright: '#f2f6fb',
  muted: '#8fa0b8',
  faint: '#5d6b80',
  accent: '#f2b36a',
  accentHex: 0xf2b36a,
  success: '#8fe3c0',
  successHex: 0x8fe3c0,
  danger: '#f27a6a',
  dangerHex: 0xf27a6a,
  earth: '#7fd7e8',
  earthHex: 0x7fd7e8,
  o2: '#7fd7e8',
  o2Hex: 0x7fd7e8,
  food: '#f4b860',
  foodHex: 0xf4b860,
  water: '#6fa8f2',
  waterHex: 0x6fa8f2,
  power: '#a9e36f',
  powerHex: 0xa9e36f,
  day: '#c9d6ea'
};

// ── Gameplay placeholders ────────────────────────────────────
export const START_DAY = 1;
export const RESCUE_DAY = 25;
export const START_SURVIVAL = { oxygen: 86, food: 74, water: 68, power: 92 };
