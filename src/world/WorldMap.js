import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WORLD_SEED,
  LANDER_OFFSET,
  SPAWN_OFFSET,
  CRATER_COUNT,
  ROCK_COUNT,
  PEBBLE_COUNT,
  BOULDER_COUNT,
  BOULDER_LANDER_CLEARANCE,
  BOULDER_SPAWN_CLEARANCE,
  BOULDER_SPACING
} from '../game/constants.js';

// Decorative objects (non-solid) keep a smaller distance from the outpost.
const LANDER_DECOR_CLEARANCE = 220;
const SPAWN_DECOR_CLEARANCE = 110;
const BOULDER_PADDING = 120;

/**
 * Static lunar surface: ground, craters, scatter, boulders and the lander.
 * All art is preloaded SVG; nothing is generated at runtime, so the map can
 * be created, destroyed and recreated safely (no texture key collisions).
 * Layout is deterministic via one seeded RNG stream.
 */
export class WorldMap {
  constructor(scene) {
    this.scene = scene;
    this.width = WORLD_WIDTH;
    this.height = WORLD_HEIGHT;
    this.rng = new Phaser.Math.RandomDataGenerator([WORLD_SEED]);
    this.solids = [];
  }

  create() {
    this.ground = this.scene.add
      .tileSprite(0, 0, this.width, this.height, 'ground-tile')
      .setOrigin(0)
      .setDepth(-20);

    this.createCraters();
    this.createScatter();
    this.createLander();
    this.createBoulders();
  }

  getLanderPoint() {
    return {
      x: this.width / 2 + LANDER_OFFSET.x,
      y: this.height / 2 + LANDER_OFFSET.y
    };
  }

  getSpawnPoint() {
    return {
      x: this.width / 2 + SPAWN_OFFSET.x,
      y: this.height / 2 + SPAWN_OFFSET.y
    };
  }

  randomPoint(padding) {
    return {
      x: this.rng.between(padding, this.width - padding),
      y: this.rng.between(padding, this.height - padding)
    };
  }

  distanceTo(point, x, y) {
    return Phaser.Math.Distance.Between(x, y, point.x, point.y);
  }

  /** Decorative objects stay out of the playable outpost clearing. */
  isDecorSpotFree(x, y, landerClearance = LANDER_DECOR_CLEARANCE, spawnClearance = SPAWN_DECOR_CLEARANCE) {
    const lander = this.getLanderPoint();
    const spawn = this.getSpawnPoint();

    return this.distanceTo(lander, x, y) > landerClearance
      && this.distanceTo(spawn, x, y) > spawnClearance;
  }

  createCraters() {
    for (let i = 0; i < CRATER_COUNT; i++) {
      let point = this.randomPoint(160);
      let attempts = 0;

      while (!this.isDecorSpotFree(point.x, point.y, 320, 250) && attempts < 30) {
        point = this.randomPoint(160);
        attempts += 1;
      }

      this.scene.add
        .image(point.x, point.y, 'crater')
        .setScale(this.rng.realInRange(0.55, 1.5))
        .setRotation(this.rng.realInRange(-0.35, 0.35))
        .setAlpha(this.rng.realInRange(0.75, 1))
        .setDepth(-18);
    }
  }

  createScatter() {
    for (let i = 0; i < ROCK_COUNT; i++) {
      const point = this.randomPoint(60);

      this.scene.add
        .image(point.x, point.y, 'rock-small')
        .setScale(this.rng.realInRange(0.45, 1.15))
        .setRotation(this.rng.realInRange(-0.14, 0.14))
        .setDepth(1);
    }

    for (let i = 0; i < PEBBLE_COUNT; i++) {
      const point = this.randomPoint(40);

      this.scene.add
        .image(point.x, point.y, 'pebble')
        .setScale(this.rng.realInRange(0.7, 1.4))
        .setRotation(this.rng.realInRange(-0.3, 0.3))
        .setAlpha(0.85)
        .setDepth(0);
    }
  }

  createLander() {
    const point = this.getLanderPoint();

    this.lander = this.scene.add
      .image(point.x, point.y, 'lander')
      .setDepth(6);

    // Invisible static body covering the hull and the leg base.
    const zone = this.scene.add.zone(point.x, point.y + 34, 140, 66);
    this.scene.physics.add.existing(zone, true);
    this.solids.push(zone);
  }

  createBoulders() {
    const lander = this.getLanderPoint();
    const spawn = this.getSpawnPoint();
    const placed = [];
    let attempts = 0;

    while (placed.length < BOULDER_COUNT && attempts < BOULDER_COUNT * 40) {
      attempts += 1;
      const point = this.randomPoint(BOULDER_PADDING);

      if (this.distanceTo(lander, point.x, point.y) < BOULDER_LANDER_CLEARANCE) continue;
      if (this.distanceTo(spawn, point.x, point.y) < BOULDER_SPAWN_CLEARANCE) continue;

      const tooClose = placed.some((other) => (
        Phaser.Math.Distance.Between(point.x, point.y, other.x, other.y) < BOULDER_SPACING
      ));
      if (tooClose) continue;

      placed.push(point);

      const scale = this.rng.realInRange(0.5, 1);
      const boulder = this.scene.physics.add.staticImage(point.x, point.y, 'boulder');

      boulder.setScale(scale);
      boulder.refreshBody();
      boulder.setDepth(5);
      this.solids.push(boulder);
    }
  }
}
