import Phaser from 'phaser';
import {
  OUTPOST_LAYOUT,
  ANTENNA_RADIUS,
  SOLAR_RADIUS,
  WINDOW_RADIUS,
  ENGINE_RADIUS,
  CONSOLE_RADIUS,
  LANDER_ANGLE
} from '../game/constants.js';
import { Interactable } from '../entities/Interactable.js';

const DRESSING = [
  { key: 'pebble', x: -318, y: 130, scale: 1.2, rotation: 0.3 },
  { key: 'pebble', x: 214, y: 258, scale: 0.9, rotation: -0.6 },
  { key: 'rock-small', x: -246, y: 236, scale: 0.7, rotation: 0.4 },
  { key: 'pebble', x: 122, y: 250, scale: 1, rotation: 1.2 },
  { key: 'rock-small', x: 326, y: 44, scale: 0.55, rotation: -0.3 },
  { key: 'pebble', x: -80, y: 240, scale: 0.8, rotation: 0.9 }
];

// Where the crack/tape/glow/lamps sit inside the ship's local frame.
const WINDOW_LOCAL = { x: 0, y: -32 };
// Duct tape sits dead-on the cracked glass — same spot as the crack.
const WINDOW_TAPE_LOCAL = { x: 3, y: -28 };
const ENGINE_LAMP_LOCAL = { x: 0, y: -40 };
const CRACK_SCALE = 0.14;
// 140x110 art * 0.24 = ~34x26 px — covers the 31px crack web, nothing more.
const TAPE_SCALE = 0.24;
/**
 * Crash site around the tilted lander: fallen dish, solar array, scattered
 * crates. Ship-attached art (engine, porthole crack, duct tape) rotates with
 * the hull and straightens after the engine repair. Visuals + colliders
 * only; reactions are callbacks owned by GameScene.
 */
export class Outpost {
  constructor(scene, origin, handlers) {
    this.scene = scene;
    this.origin = origin;
    this.handlers = handlers;

    this.tilt = Phaser.Math.DegToRad(LANDER_ANGLE);
    this.antennaState = 'down'; // 'down' → 'up' → 'online'

    this.solids = [];
    this.interactables = [];
    this.shipAnchors = [];
    this.lampTweens = [];

    this.build();
  }

  /** World position of a ship-local offset, rotated by the crash tilt. */
  shipPoint(offset) {
    const cosT = Math.cos(this.tilt);
    const sinT = Math.sin(this.tilt);

    return {
      x: this.origin.x + offset.x * cosT - offset.y * sinT,
      y: this.origin.y + offset.x * sinT + offset.y * cosT
    };
  }

  addSolid(x, y, width, height) {
    const zone = this.scene.add.zone(x, y, width, height);
    this.scene.physics.add.existing(zone, true);
    this.solids.push(zone);
  }

  addShipPart(image, offset, depth) {
    const point = this.shipPoint(offset);

    image.setPosition(point.x, point.y);
    image.setRotation(this.tilt);
    image.setDepth(depth);

    this.shipAnchors.push({ image, offset });
    return image;
  }

  build() {
    this.buildShip();
    this.buildAntenna();
    this.buildSolarArray();
    this.buildCrates();
    this.buildFlag();
    this.dressSite();
  }

  // ── the leaning ship ─────────────────────────────────────────

  buildShip() {
    const scene = this.scene;

    const lander = scene.add.image(0, 0, 'lander');
    this.addShipPart(lander, { x: 0, y: 0 }, 6);

    // Solid hull wall in the ship-local frame. Immovable chest big enough
    // to cover the hull + skirt + legs across the crash tilt, so the player
    // bumps into the ship instead of walking through it.
    const hullCenter = this.shipPoint({ x: 0, y: -10 });
    const hullZone = scene.add.zone(hullCenter.x, hullCenter.y, 154, 148);
    scene.physics.add.existing(hullZone, true);
    this.solids.push(hullZone);

    this.engineImage = this.addShipPart(
      scene.add.image(0, 0, 'engine'),
      OUTPOST_LAYOUT.engine,
      6
    );

    // Sparkle that narrates the crash: the crack in the porthole glass.
    this.crackImage = this.addShipPart(
      scene.add.image(0, 0, 'crack').setScale(CRACK_SCALE).setAlpha(0.95),
      WINDOW_LOCAL,
      7
    );

    // The duct-tape patch, hidden until step 2.4 — pinned to the porthole,
    // right on top of the cracked glass (WINDOW_TAPE_LOCAL = crack spot).
    this.tapeImage = this.addShipPart(
      scene.add.image(0, 0, 'tape-patch')
        .setScale(TAPE_SCALE * 0.8)
        .setVisible(false)
        .setAlpha(0),
      WINDOW_TAPE_LOCAL,
      9
    );
    this.tapeImage.setRotation(this.tilt - 0.16);

    // Warm light spills out of the porthole once power is restored.
    this.windowGlow = this.addShipPart(
      scene.add.image(0, 0, 'light-glow')
        .setScale(0.42)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setVisible(false)
        .setAlpha(0),
      WINDOW_LOCAL,
      5
    );

    // Status lamp on the engine head: red pulsing until the duct-tape fix.
    // Anchored like the other ship parts so it rides the straighten tween.
    const lampOffset = {
      x: OUTPOST_LAYOUT.engine.x + ENGINE_LAMP_LOCAL.x,
      y: OUTPOST_LAYOUT.engine.y + ENGINE_LAMP_LOCAL.y
    };
    const lampPoint = this.shipPoint(lampOffset);

    this.engineLamp = scene.add
      .circle(lampPoint.x, lampPoint.y, 7, 0xe25757)
      .setStrokeStyle(2, 0x141b26, 1)
      .setDepth(9);

    this.shipAnchors.push({ image: this.engineLamp, offset: lampOffset });

    this.lampTweens.push(scene.tweens.add({
      targets: this.engineLamp,
      alpha: { from: 0.45, to: 1 },
      scale: { from: 0.9, to: 1.15 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    }));

    // A small duct-tape patch that settles the engine at 50%.
    this.engineTape = this.addShipPart(
      scene.add.image(0, 0, 'tape-patch')
        .setScale(0.12)
        .setVisible(false)
        .setAlpha(0),
      {
        x: OUTPOST_LAYOUT.engine.x - 40,
        y: OUTPOST_LAYOUT.engine.y - 10
      },
      9
    );

    this.buildShipInteractables();
    this.buildServicePanel();
  }

  buildShipInteractables() {
    this.windowInteractable = new Interactable(this.scene, {
      id: 'porthole',
      sprite: this.crackImage,
      label: 'PORTHOLE',
      radius: WINDOW_RADIUS,
      prompt: 'Tape the crack',
      onInteract: () => this.handlers.onWindow?.()
    });

    this.engineInteractable = new Interactable(this.scene, {
      id: 'engine',
      sprite: this.engineImage,
      label: 'ENGINE BAY',
      radius: ENGINE_RADIUS,
      prompt: 'Repair engine',
      onInteract: () => this.handlers.onEngine?.()
    });

    this.interactables.push(
      this.windowInteractable,
      this.engineInteractable
    );
  }

  /**
   * Service panel standing at the bugle of the engine, outside the hull.
   * Hosts the final telemetry readout; the engine itself is where the
   * diagnostics run.
   */
  buildServicePanel() {
    const point = {
      x: this.origin.x + OUTPOST_LAYOUT.console.x,
      y: this.origin.y + OUTPOST_LAYOUT.console.y
    };

    this.consoleImage = this.scene.add
      .image(point.x, point.y, 'console')
      .setScale(0.55)
      .setDepth(7);

    this.consoleInteractable = new Interactable(this.scene, {
      id: 'engine-service-panel',
      sprite: this.consoleImage,
      label: 'SERVICE PANEL',
      radius: CONSOLE_RADIUS,
      prompt: 'Check the readout',
      onInteract: () => this.handlers.onConsole?.()
    });

    this.interactables.push(this.consoleInteractable);
  }

  // ── the fallen dish ───────────────────────────────────────────

  buildAntenna() {
    const scene = this.scene;
    const anchor = OUTPOST_LAYOUT.antenna;
    const point = { x: this.origin.x + anchor.x, y: this.origin.y + anchor.y };

    this.antennaImage = scene.add
      .image(point.x, point.y + 10, 'radio-dish')
      .setOrigin(0.5, 0.8)
      .setRotation(1.42)
      .setDepth(7);

    // Green service lamp: dark until the array is powered.
    this.antennaLamp = scene.add
      .circle(point.x, point.y - 8, 5, 0x7fe3a0)
      .setVisible(false)
      .setDepth(8);

    this.antennaInteractable = new Interactable(this.scene, {
      id: 'antenna',
      sprite: this.antennaImage,
      label: 'COMMS DISH',
      radius: ANTENNA_RADIUS,
      prompt: 'Attach cables',
      onInteract: () => this.handlers.onAntenna?.()
    });

    this.interactables.push(this.antennaInteractable);

    // The dish itself is solid — no walking through the tower.
    this.addSolid(point.x, point.y + 8, 44, 24);
  }

  // ── solar array + powering cable to the comms dish ───────────

  buildSolarArray() {
    const scene = this.scene;

    // Panels with the cable junction between them.
    this.solarPanels = [];

    for (const offset of OUTPOST_LAYOUT.solar) {
      const point = { x: this.origin.x + offset.x, y: this.origin.y + offset.y };

      this.solarPanels.push(
        scene.add
          .image(point.x, point.y, 'solar-panel')
          .setRotation(offset.rotation ?? 0)
          .setDepth(6)
      );

      this.addSolid(point.x, point.y + 20, 84, 28);
    }

    // Where the field cable is plugged: the foot of the LOWER panel —
    // the cable visibly starts there and sags across to the dish.
    this.junction = {
      x: this.origin.x + OUTPOST_LAYOUT.arrayConnector.x,
      y: this.origin.y + OUTPOST_LAYOUT.arrayConnector.y
    };

    // The power run to the dish itself is drawn only when the field is
    // connected, so it starts at the junction and ends at the (now
    // upright) dish port.
    this.cableImage = scene.add
      .graphics()
      .setDepth(2)
      .setVisible(false)
      .setAlpha(0);

    // Hollow marker over the junction so the hookup has a ring target.
    this.powerMarker = scene.add
      .image(this.junction.x, this.junction.y, 'pebble')
      .setAlpha(0)
      .setDepth(2)
      .setScale(0.62);

    // The hook-up is pinned to the LOWER panel (the one the cable runs
    // from — junction sits at its ground-side foot), not to thin air.
    this.powerInteractable = new Interactable(this.scene, {
      id: 'solar-array',
      sprite: this.solarPanels[1],
      label: 'SOLAR ARRAY',
      radius: SOLAR_RADIUS,
      prompt: 'Hook up the array',
      onInteract: () => this.handlers.onPower?.()
    });

    this.interactables.push(this.powerInteractable);
  }

  /** Sagging power run from the array junction to the dish service port. */
  drawCable(from, to) {
    const graphics = this.cableImage;

    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(from.x, from.y),
      new Phaser.Math.Vector2((from.x + to.x) / 2 - 14, Math.max(from.y, to.y) + 58),
      new Phaser.Math.Vector2(to.x, to.y)
    );

    const points = curve.getPoints(36);

    graphics.clear();
    graphics.lineStyle(6.5, 0x2e333b, 1);
    graphics.strokePoints(points, false, false);
    graphics.lineStyle(4, 0x5a616c, 0.9);
    graphics.strokePoints(points, false, false);
    graphics.lineStyle(2, 0xe0a24e, 0.8);
    graphics.strokePoints(points, false, false);
  }

  // ── scenery, pure decoration ────────────────────────────────

  buildCrates() {
    OUTPOST_LAYOUT.crates.forEach((offset, index) => {
      const point = { x: this.origin.x + offset.x, y: this.origin.y + offset.y };

      this.scene.add
        .image(point.x, point.y, index === 1 ? 'crate-open' : 'crate')
        .setDepth(7);

      this.addSolid(point.x, point.y + 8, 46, 28);
    });
  }

  buildFlag() {
    const point = {
      x: this.origin.x + OUTPOST_LAYOUT.flag.x,
      y: this.origin.y + OUTPOST_LAYOUT.flag.y
    };

    const flag = this.scene.add
      .image(point.x, point.y, 'flag')
      .setOrigin(0.5, 0.88)
      .setDepth(6);

    this.scene.tweens.add({
      targets: flag,
      angle: { from: -1.6, to: 1.6 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  dressSite() {
    for (const item of DRESSING) {
      const point = { x: this.origin.x + item.x, y: this.origin.y + item.y };

      this.scene.add
        .image(point.x, point.y, item.key)
        .setScale(item.scale)
        .setRotation(item.rotation)
        .setDepth(item.key === 'rock-small' ? 1 : 0);
    }
  }

  // ── task reactions ──────────────────────────────────────────

  repairAntenna() {
    if (this.antennaState !== 'down') return;
    this.antennaState = 'up';

    this.antennaImage.setTexture('antenna-upright');

    this.scene.tweens.add({
      targets: this.antennaImage,
      rotation: 0,
      y: this.antennaImage.y - 10,
      duration: 700,
      ease: 'Back.easeOut'
    });
  }

  connectPower() {
    this.antennaState = 'online';

    // Cable stitches junction → dish port, drawn against the dish's
    // current (already upright) position before fading in.
    this.drawCable(this.junction, {
      x: this.antennaImage.x - 14,
      y: this.antennaImage.y - 2
    });
    this.cableImage.setVisible(true);
    this.scene.tweens.add({
      targets: this.cableImage,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut'
    });

    // The porthole lamp wakes up.
    this.windowGlow.setVisible(true).setAlpha(0);

    this.scene.tweens.add({
      targets: this.windowGlow,
      alpha: 0.85,
      duration: 800,
      ease: 'Quad.easeOut'
    });

    // The dish joins the grid.
    this.antennaImage.setTexture('radio-dish-fixed');
    this.antennaLamp.setVisible(true);
  }

  tapeWindow() {
    this.tapeImage.setVisible(true);

    this.scene.tweens.add({
      targets: this.tapeImage,
      alpha: 1,
      scale: TAPE_SCALE,
      duration: 340,
      ease: 'Back.easeOut'
    });

    this.scene.tweens.add({
      targets: this.crackImage,
      alpha: 0.8,
      duration: 300
    });
  }

  repairEngine() {
    this.engineLamp.setFillStyle(0xf2b36a, 1);
    this.lampTweens.forEach((tween) => tween.remove());
    this.lampTweens = [];

    // Small tape patch, appearing once the hull has nearly settled.
    this.engineTape.setVisible(true);
    this.scene.tweens.add({
      targets: this.engineTape,
      alpha: 1,
      scale: { from: 0.08, to: 0.13 },
      duration: 380,
      delay: 320,
      ease: 'Back.easeOut'
    });

    this.straightenShip();
  }

  /** After the engine fix the lander no longer leans on its kickstand. */
  straightenShip() {
    for (const { image, offset } of this.shipAnchors) {
      this.scene.tweens.add({
        targets: image,
        x: this.origin.x + offset.x,
        y: this.origin.y + offset.y,
        rotation: image === this.tapeImage ? -0.16 : 0,
        duration: 900,
        ease: 'Quad.easeInOut'
      });
    }
  }

  update(time) {
    if (this.antennaState === 'online') {
      this.antennaLamp.setAlpha(0.5 + 0.5 * Math.abs(Math.sin(time / 220)));
    }
  }
}
