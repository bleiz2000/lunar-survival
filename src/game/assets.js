/**
 * Asset manifest. Every visual asset is an original SVG created for LUNAR.
 * Keys are what the game code references; `width`/`height` is the raster
 * size Phaser bakes the SVG at (never upscaled, so lines stay crisp).
 */
const BASE = import.meta.env.BASE_URL ?? '/';
const asset = (path) => `${BASE}assets/${path}`;

export const IMAGE_ASSETS = [
  // characters
  { key: 'astronaut-south', file: 'characters/astronaut-south.svg', width: 40, height: 48 },
  { key: 'astronaut-north', file: 'characters/astronaut-north.svg', width: 40, height: 48 },
  { key: 'astronaut-east', file: 'characters/astronaut-east.svg', width: 40, height: 48 },

  // environment
  { key: 'ground-tile', file: 'environment/ground-tile.svg', width: 256, height: 256 },
  { key: 'crater', file: 'environment/crater.svg', width: 192, height: 192 },
  { key: 'boulder', file: 'environment/boulder.svg', width: 96, height: 96 },
  { key: 'rock-small', file: 'environment/rock-small.svg', width: 48, height: 48 },
  { key: 'pebble', file: 'environment/pebble.svg', width: 24, height: 24 },
  { key: 'flag', file: 'environment/flag.svg', width: 40, height: 64 },
  { key: 'earth', file: 'environment/earth.svg', width: 180, height: 180 },
  { key: 'menu-ridge', file: 'environment/menu-ridge.svg', width: 1280, height: 300 },

  // buildings
  { key: 'lander', file: 'buildings/lander.svg', width: 200, height: 200 },
  { key: 'solar-panel', file: 'buildings/solar-panel.svg', width: 120, height: 90 },

  // equipment
  { key: 'crate', file: 'equipment/crate.svg', width: 64, height: 64 },
  { key: 'crate-open', file: 'equipment/crate-open.svg', width: 64, height: 64 },
  { key: 'radio-dish', file: 'equipment/radio-dish.svg', width: 96, height: 96 },
  { key: 'radio-dish-fixed', file: 'equipment/radio-dish-fixed.svg', width: 96, height: 96 },

  // effects
  { key: 'dust-puff', file: 'effects/dust-puff.svg', width: 32, height: 32 },

  // ui icons (white, tinted at runtime)
  { key: 'icon-o2', file: 'ui/icon-o2.svg', width: 32, height: 32 },
  { key: 'icon-food', file: 'ui/icon-food.svg', width: 32, height: 32 },
  { key: 'icon-water', file: 'ui/icon-water.svg', width: 32, height: 32 },
  { key: 'icon-power', file: 'ui/icon-power.svg', width: 32, height: 32 },
  { key: 'icon-day', file: 'ui/icon-day.svg', width: 32, height: 32 },
  { key: 'icon-objective', file: 'ui/icon-objective.svg', width: 32, height: 32 },
  { key: 'icon-chip', file: 'ui/icon-chip.svg', width: 32, height: 32 },
  { key: 'icon-check', file: 'ui/icon-check.svg', width: 32, height: 32 },
  { key: 'icon-warning', file: 'ui/icon-warning.svg', width: 32, height: 32 }
];

export function loadImageAssets(loader) {
  for (const entry of IMAGE_ASSETS) {
    loader.svg(entry.key, asset(entry.file), {
      width: entry.width,
      height: entry.height
    });
  }
}
