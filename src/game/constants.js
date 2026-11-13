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
  radio: { x: 190, y: 42 },
  crates: [
    { x: 300, y: 196 },
    { x: -58, y: 300 },
    { x: 330, y: -118 }
  ],
  solar: [
    { x: -216, y: 34, rotation: -0.16 },
    { x: -210, y: 152, rotation: 0.12 }
  ],
  flag: { x: 64, y: 330 }
};

// ── Interaction ──────────────────────────────────────────────
export const INTERACT_KEY = 'E';
export const CRATE_RADIUS = 76;
export const RADIO_RADIUS = 98;

// ── Viewport ─────────────────────────────────────────────────
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_BACKGROUND = '#0b0e14';

// ── Scene keys ───────────────────────────────────────────────
export const SCENE_BOOT = 'Boot';
export const SCENE_PRELOAD = 'Preload';
export const SCENE_MAIN_MENU = 'MainMenu';
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
export const RADIO_REPAIR_COST = { itemId: 'chip', qty: 3 };
