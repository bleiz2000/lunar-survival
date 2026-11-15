import Phaser from 'phaser';
import {
  SCENE_INTRO,
  SCENE_GAME,
  GAME_WIDTH,
  GAME_HEIGHT,
  INTRO,
  TYPE_SPEED,
  UI
} from '../game/constants.js';
import { Typewriter } from '../ui/typewriter.js';

// ── Cockpit geometry (matches the real hole in cabin.svg) ───────
// The frame's inner stroke ends at ~146x113, so the glass is clipped there:
// the painted scene sits on top of the hull and never covers the frame.
const WINDOW = { x: 780, y: 286, rx: 146, ry: 113 };
const PILOT = { x: 336, y: 500, scale: 1.4 };
const CAPTION_Y = 636;

// ── Dialogue (wording is fixed by the storyboard) ───────────────
const LINE_HOME = 'Home, sweet home';
const LINE_MAYDAY = 'Houston, Houston, help...';
const LINE_RADIO = 'Damn, the radio is broken';

// ── Render order ────────────────────────────────────────────────
const D = {
  backdrop: 0,
  cabin: 20,
  view: 21,
  shaft: 22,
  glass: 25,
  pilot: 30,
  dim: 34,
  panel: 35,
  alarm: 41,
  sparks: 44
};

/**
 * The New Game cinematic: orbit → calm cabin → turbulence → crash →
 * mayday → blackout → wake-up at the dead radio → gameplay.
 *
 * Two cameras are used: the main camera carries the whole cockpit (it
 * shakes, tilts and zooms), while a transparent HUD camera carries the
 * subtitles, eyelids and fades, so the text never shakes or zooms.
 * ESC skips straight to gameplay at any moment.
 */
export class IntroScene extends Phaser.Scene {
  constructor() {
    super(SCENE_INTRO);
  }

  create() {
    this.phase = 'boot';
    this.handedOff = false;
    this.shakeOn = false;
    this.alarmOn = false;
    this.turb = { level: 0 };
    this.lidState = { value: 0 };
    this.shot = null;
    this.lamps = [];
    this.lampGlows = [];

    this.mainCam = this.cameras.main;
    this.mainCam.setBackgroundColor(0x04060a);
    this.mainCam.setZoom(1);
    this.mainCam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // HUD camera: fully transparent, renders on top of the cockpit.
    this.uiCam = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.uiCam.setName('hud');

    this.typewriter = new Typewriter(this);

    this.buildHud();

    this.input.keyboard.once('keydown-ESC', () => this.handOff());

    this.time.delayedCall(80, () => this.phaseSpace());
  }

  // ── camera helpers ──────────────────────────────────────────

  /** Cockpit object: rendered by the main camera only. */
  world(object) {
    this.uiCam.ignore(object);
    return object;
  }

  /** Screen-space object: stays stable during shakes and close-ups. */
  hud(object) {
    this.mainCam.ignore(object);
    return object;
  }

  // ── HUD: fades, eyelids, subtitles ──────────────────────────

  buildHud() {
    this.blackout = this.hud(
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
        .setDepth(120)
        .setAlpha(1)
    );

    this.lids = this.hud(this.add.graphics().setDepth(110));

    const hint = this.add
      .text(GAME_WIDTH - 26, GAME_HEIGHT - 20, 'ESC  SKIP', {
        fontFamily: UI.mono,
        fontSize: '10px',
        color: UI.faint,
        letterSpacing: 2
      })
      .setOrigin(1, 0.5)
      .setDepth(105)
      .setAlpha(0.6);
    this.hud(hint);
  }

  showCaption(text, speed, onDone = null) {
    this.clearCaption(0);

    const scrim = this.add
      .rectangle(GAME_WIDTH / 2, CAPTION_Y + 28, 880, 66, 0x04070d, 0.42)
      .setDepth(99)
      .setAlpha(0);
    this.hud(scrim);

    const label = this.add
      .text(GAME_WIDTH / 2, CAPTION_Y + 26, '', {
        fontFamily: UI.font,
        fontSize: '19px',
        color: UI.text,
        align: 'center',
        wordWrap: { width: 840 },
        letterSpacing: 0.5
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setAlpha(0);
    label.setShadow(0, 2, '#04070d', 10, false, true);
    this.hud(label);

    this.captionScrim = scrim;
    this.captionText = label;

    this.tweens.add({ targets: [scrim, label], alpha: 1, duration: 340, ease: 'Sine.easeOut' });
    this.typewriter.start(label, text, speed, onDone);
  }

  clearCaption(fade = 280) {
    this.typewriter.stop();

    const objects = [this.captionScrim, this.captionText].filter(Boolean);
    this.captionScrim = null;
    this.captionText = null;

    if (objects.length === 0) return;
    if (fade <= 0) {
      objects.forEach((object) => object.destroy());
      return;
    }

    this.tweens.add({
      targets: objects,
      alpha: 0,
      duration: fade,
      ease: 'Sine.easeIn',
      onComplete: () => objects.forEach((object) => object.destroy())
    });
  }

  /**
   * One eyelid frame. p = 0 fully open, p = 1 fully closed.
   * Drawn every frame from a single Graphics object: cheap and soft.
   */
  drawLids(p) {
    const g = this.lids;
    if (!g) return;

    g.clear();
    if (p <= 0.002) return;

    const topEdge = Phaser.Math.Linear(-32, 376, p);
    const botEdge = Phaser.Math.Linear(GAME_HEIGHT + 32, 344, p);
    const curve = 20 * Math.min(1, p * 1.6);
    const steps = 26;

    // Upper eyelid.
    g.fillStyle(0x020407, 1);
    g.beginPath();
    g.moveTo(0, topEdge);
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      g.lineTo(GAME_WIDTH * u, topEdge + Math.sin(Math.PI * u) * curve);
    }
    g.lineTo(GAME_WIDTH, -48);
    g.lineTo(0, -48);
    g.closePath();
    g.fillPath();

    // Lower eyelid.
    g.beginPath();
    g.moveTo(0, botEdge);
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      g.lineTo(GAME_WIDTH * u, botEdge - Math.sin(Math.PI * u) * curve);
    }
    g.lineTo(GAME_WIDTH, GAME_HEIGHT + 48);
    g.lineTo(0, GAME_HEIGHT + 48);
    g.closePath();
    g.fillPath();

    // Soft lash lines keep the shape readable against the dark cabin.
    g.lineStyle(2, 0x1d1119, 0.9);
    g.beginPath();
    g.moveTo(0, topEdge);
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      g.lineTo(GAME_WIDTH * u, topEdge + Math.sin(Math.PI * u) * curve);
    }
    g.strokePath();

    g.beginPath();
    g.moveTo(0, botEdge);
    for (let i = 1; i <= steps; i += 1) {
      const u = i / steps;
      g.lineTo(GAME_WIDTH * u, botEdge - Math.sin(Math.PI * u) * curve);
    }
    g.strokePath();
  }

  tweenLids(to, duration, ease = 'Sine.easeInOut', onComplete = null) {
    this.tweens.add({
      targets: this.lidState,
      value: to,
      duration,
      ease,
      onUpdate: () => this.drawLids(this.lidState.value),
      onComplete: () => {
        this.drawLids(to);
        onComplete?.();
      }
    });
  }

  // ── stage 1 · Spaceship in space ────────────────────────────

  phaseSpace() {
    this.phase = 'space';

    const rng = new Phaser.Math.RandomDataGenerator(['intro-orbit']);
    const shot = this.add.container(0, 0);
    this.world(shot);
    this.shot = shot;

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x05070f, 0x070b17, 0x0b1425, 0x070d1a, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    shot.add(sky);

    const nebula = this.add.graphics();
    nebula.fillStyle(0x2b4a7a, 0.12);
    nebula.fillEllipse(300, 180, 620, 340);
    nebula.fillStyle(0x5a3f7a, 0.08);
    nebula.fillEllipse(1010, 560, 560, 300);
    shot.add(nebula);

    // Three parallax star layers, each drifting a little slower.
    const layers = [
      [56, 1.0, 0.42, 26],
      [42, 1.5, 0.68, 18],
      [24, 2.1, 0.95, 12]
    ];

    layers.forEach(([count, size, alpha, drift], index) => {
      const layer = this.add.container(0, 0);

      for (let i = 0; i < count; i += 1) {
        layer.add(
          this.add.circle(
            rng.between(0, GAME_WIDTH),
            rng.between(0, GAME_HEIGHT),
            size * rng.realInRange(0.65, 1.25),
            0xdfeaff,
            alpha * rng.realInRange(0.55, 1)
          )
        );
      }

      shot.add(layer);
      this.tweens.add({
        targets: layer,
        x: -drift,
        duration: 12000 + index * 2600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Earth, ahead and below the ship.
    const earth = this.add.image(1024, 236, 'earth').setScale(1.5).setAlpha(0.95);
    shot.add(earth);
    shot.add(
      this.add
        .image(1024, 236, 'light-glow')
        .setDisplaySize(360, 360)
        .setTint(0x6fb8e8)
        .setAlpha(0.16)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: earth,
      scale: 1.53,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Ship rig: hull plus a warm engine flare that travels with it.
    const rig = this.add.container(618, 372);
    const ship = this.add.image(0, 0, 'spaceship').setScale(0.92);
    const flareA = this.add
      .image(-30, 70, 'light-glow')
      .setDisplaySize(58, 58)
      .setTint(0x8fd0f7)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    const flareB = this.add
      .image(22, 70, 'light-glow')
      .setDisplaySize(58, 58)
      .setTint(0x8fd0f7)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD);

    rig.add([ship, flareA, flareB]);
    rig.setAngle(6);
    shot.add(rig);

    this.tweens.add({
      targets: rig,
      y: 358,
      angle: 2,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: [flareA, flareB],
      alpha: { from: 0.28, to: 0.7 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Fade in from the opening black.
    this.tweens.add({ targets: this.blackout, alpha: 0, duration: 900, delay: 100, ease: 'Sine.easeOut' });

    this.time.delayedCall(INTRO.SPACE_HOLD, () => this.transition(this.phaseCabin, 700, 250, 900));
  }

  transition(next, outMs, holdMs, inMs) {
    if (this.handedOff) return;

    this.tweens.killTweensOf(this.blackout);
    this.tweens.add({
      targets: this.blackout,
      alpha: 1,
      duration: outMs,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (this.handedOff) return;
        next.call(this);
        this.tweens.add({
          targets: this.blackout,
          alpha: 0,
          duration: inMs,
          delay: holdMs,
          ease: 'Sine.easeOut'
        });
      }
    });
  }

  // ── stage 2 · Calm cabin ────────────────────────────────────

  phaseCabin() {
    this.phase = 'cabin';

    this.destroyShot();

    this.mainCam.setZoom(1);
    this.mainCam.setRotation(0);
    this.mainCam.setScroll(0, 0);
    this.shakeOn = false;
    this.turb.level = 0;

    this.buildCockpit();

    this.time.delayedCall(760, () => {
      if (this.handedOff || this.phase !== 'cabin') return;

      this.showCaption(LINE_HOME, TYPE_SPEED.CALM, () => {
        this.time.delayedCall(1150, () => this.startTurbulence());
      });
    });
  }

  destroyShot() {
    if (!this.shot) return;
    this.tweens.killTweensOf(this.shot.list);
    this.shot.destroy();
    this.shot = null;
  }

  buildCockpit() {
    // Dark hull margin: hides the frame edges when the camera tilts.
    this.world(
      this.add
        .rectangle(-60, -50, GAME_WIDTH + 120, GAME_HEIGHT + 100, 0x05070c)
        .setOrigin(0, 0)
        .setDepth(D.backdrop)
    );

    // The cabin art stops at 1280x720; zoomed-in shots would otherwise show
    // a hard seam into pure black. This continues the wall tone outward.
    const hull = this.add.graphics().setDepth(1);
    hull.fillGradientStyle(0x141d2c, 0x141d2c, 0x0a1019, 0x0a1019, 1);
    hull.fillRect(-420, -360, GAME_WIDTH + 840, GAME_HEIGHT + 720);
    this.world(hull);

    this.buildPorthole();

    this.world(this.add.image(0, 0, 'cabin').setOrigin(0, 0).setDepth(D.cabin));

    // Cool spill from the porthole across the cabin, plus a faint cabin
    // wash so the dark hull keeps some readable detail.
    const shaft = this.add
      .image(780, 470, 'light-glow')
      .setDisplaySize(660, 380)
      .setTint(0x5a9ac2)
      .setAlpha(0.05)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(D.shaft);
    this.world(shaft);

    const ceiling = this.add
      .image(560, 110, 'light-glow')
      .setDisplaySize(760, 330)
      .setTint(0x8fb4d8)
      .setAlpha(0.055)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(D.shaft);
    this.world(ceiling);

    this.buildGlass();
    this.buildPilot();
    this.buildPanel();

    // Wake-up dimming: sits over the cabin, under the panel.
    this.dim = this.world(
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02040a, 1).setOrigin(0, 0).setAlpha(0).setDepth(D.dim)
    );

    // Red emergency wash and haze.
    this.alarmWash = this.world(
      this.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff2a1c, 1)
        .setOrigin(0, 0)
        .setAlpha(0)
        .setDepth(D.alarm + 1)
    );

    this.alarmHaze = this.world(
      this.add
        .image(760, 560, 'light-glow')
        .setDisplaySize(900, 430)
        .setTint(0xff3a24)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(D.alarm)
    );

    // Sparks from the fractured glass.
    this.sparks = this.world(
      this.add.particles(0, 0, 'star', {
        speed: { min: 70, max: 240 },
        angle: { min: 200, max: 340 },
        gravityY: 420,
        lifespan: { min: 380, max: 780 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffd9a0, 0xfff0c0, 0xff9d5c],
        blendMode: 'ADD',
        emitting: false
      }).setDepth(D.sparks)
    );
  }

  // ── porthole: procedural space + lunar surface, one elliptical mask ──

  buildPorthole() {
    const view = this.add.container(WINDOW.x, WINDOW.y).setDepth(D.view);
    this.world(view);
    this.view = view;

    const shape = this.make.graphics({ x: WINDOW.x, y: WINDOW.y, add: false });
    shape.fillStyle(0xffffff, 1);
    shape.fillEllipse(0, 0, WINDOW.rx * 2, WINDOW.ry * 2);
    view.setMask(shape.createGeometryMask());
    this.viewMaskShape = shape;

    this.earthView = this.add.container(0, 0);
    view.add(this.earthView);

    const rng = new Phaser.Math.RandomDataGenerator(['intro-porthole']);

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x04060e, 0x060a14, 0x0a1424, 0x070d1a, 1);
    sky.fillRect(-320, -320, 640, 640);
    sky.fillStyle(0x2b4a7a, 0.2);
    sky.fillEllipse(-96, -84, 340, 240);
    this.earthView.add(sky);

    this.starDrift = this.add.container(0, 0);
    this.earthView.add(this.starDrift);

    for (let i = 0; i < 76; i += 1) {
      this.starDrift.add(
        this.add
          .circle(rng.between(-210, 210), rng.between(-215, 215), rng.realInRange(0.7, 2.1), 0xdfeaff, rng.realInRange(0.45, 1))
          .setBlendMode(Phaser.BlendModes.ADD)
      );
    }

    // A few brighter beacons so the void never reads as flat black.
    for (let i = 0; i < 6; i += 1) {
      this.starDrift.add(
        this.add
          .image(rng.between(-190, 190), rng.between(-200, 190), 'light-glow')
          .setDisplaySize(rng.between(18, 30), rng.between(18, 30))
          .setTint(0xbfe0ff)
          .setAlpha(rng.realInRange(0.12, 0.24))
          .setBlendMode(Phaser.BlendModes.ADD)
      );
    }

    const earth = this.add.container(52, -6);
    earth.add(
      this.add
        .image(0, 0, 'light-glow')
        .setDisplaySize(250, 250)
        .setTint(0x6fb8e8)
        .setAlpha(0.26)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    earth.add(this.add.image(0, 0, 'earth').setScale(0.68));
    earth.add(this.add.circle(0, 0, 62).setStrokeStyle(1.4, 0x9fd8f7, 0.4));
    earth.add(
      this.add
        .circle(0, 0, 68)
        .setStrokeStyle(5, 0x5f9fd6, 0.12)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.earthView.add(earth);
    this.earthGroup = earth;

    // Gentle flight: the starfield and the globe drift out of phase.
    this.tweens.add({
      targets: this.starDrift,
      x: -12,
      y: 4,
      duration: 6400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: earth,
      x: 64,
      y: -14,
      duration: 8200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.buildLunarView();
  }

  buildLunarView() {
    const moon = this.add.container(0, 0).setAlpha(0);
    this.view.add(moon);
    this.moonView = moon;

    const rng = new Phaser.Math.RandomDataGenerator(['intro-moon']);

    const g = this.add.graphics();
    g.fillStyle(0x05070e, 1);
    g.fillRect(-320, -320, 640, 640);

    // Distant ridge.
    g.fillStyle(0x33313f, 1);
    g.beginPath();
    g.moveTo(-320, 50);
    g.lineTo(-210, 36);
    g.lineTo(-96, 48);
    g.lineTo(26, 30);
    g.lineTo(142, 44);
    g.lineTo(252, 26);
    g.lineTo(320, 38);
    g.lineTo(320, 320);
    g.lineTo(-320, 320);
    g.closePath();
    g.fillPath();

    // Near regolith.
    g.fillStyle(0x6b6578, 1);
    g.beginPath();
    g.moveTo(-320, 72);
    g.lineTo(-160, 60);
    g.lineTo(-30, 70);
    g.lineTo(120, 56);
    g.lineTo(250, 66);
    g.lineTo(320, 58);
    g.lineTo(320, 320);
    g.lineTo(-320, 320);
    g.closePath();
    g.fillPath();

    // Horizon rim light.
    g.lineStyle(2, 0xb9b3c9, 0.5);
    g.beginPath();
    g.moveTo(-320, 72);
    g.lineTo(-160, 60);
    g.lineTo(-30, 70);
    g.lineTo(120, 56);
    g.lineTo(250, 66);
    g.lineTo(320, 58);
    g.strokePath();

    // Craters: a dark bowl, a lit rim and a shadow crescent.
    const crater = (x, y, rx, ry) => {
      g.fillStyle(0x4c4759, 0.85);
      g.fillEllipse(x, y, rx * 2, ry * 2);
      g.fillStyle(0x8d8699, 0.5);
      g.fillEllipse(x, y - ry * 0.55, rx * 1.5, ry * 0.9);
      g.fillStyle(0x2e2b3a, 0.55);
      g.fillEllipse(x, y + ry * 0.3, rx * 1.15, ry * 0.7);
    };

    crater(-78, 142, 88, 22);
    crater(112, 178, 58, 15);
    crater(4, 258, 128, 30);
    crater(216, 262, 46, 13);
    crater(-196, 224, 40, 11);

    for (let i = 0; i < 40; i += 1) {
      g.fillStyle(0x8f889c, rng.realInRange(0.15, 0.4));
      g.fillCircle(rng.between(-190, 190), rng.between(84, 190), rng.realInRange(0.7, 2));
    }

    g.fillStyle(0xc8c2d6, 0.05);
    g.fillEllipse(0, 74, 600, 120);

    moon.add(g);

    // A thin scatter of stars above the horizon.
    for (let i = 0; i < 26; i += 1) {
      moon.add(
        this.add
          .circle(rng.between(-200, 200), rng.between(-190, 34), rng.realInRange(0.5, 1.5), 0xe6eeff, rng.realInRange(0.3, 0.85))
          .setBlendMode(Phaser.BlendModes.ADD)
      );
    }

    // Earth, small and far away.
    moon.add(this.add.image(-118, -84, 'earth').setScale(0.34).setAlpha(0.9));
    moon.add(
      this.add
        .image(150, -128, 'light-glow')
        .setDisplaySize(140, 140)
        .setTint(0xffe6b8)
        .setAlpha(0.25)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
  }

  // ── glass: reflections and the fracture ─────────────────────

  buildGlass() {
    const glass = this.add.container(WINDOW.x, WINDOW.y).setDepth(D.glass);
    this.world(glass);
    this.glass = glass;

    const shape = this.make.graphics({ x: WINDOW.x, y: WINDOW.y, add: false });
    shape.fillStyle(0xffffff, 1);
    shape.fillEllipse(0, 0, WINDOW.rx * 2, WINDOW.ry * 2);
    glass.setMask(shape.createGeometryMask());
    this.glassMaskShape = shape;

    const shade = this.add.graphics();
    shade.lineStyle(28, 0x03070d, 0.42);
    shade.strokeEllipse(0, 0, (WINDOW.rx - 9) * 2, (WINDOW.ry - 9) * 2);
    shade.lineStyle(1.2, 0x9ec6e6, 0.12);
    shade.strokeEllipse(0, 0, (WINDOW.rx - 24) * 2, (WINDOW.ry - 24) * 2);
    glass.add(shade);

    const glareA = this.add
      .ellipse(-58, -56, 150, 34, 0xbfe6ff, 0.045)
      .setAngle(-28)
      .setBlendMode(Phaser.BlendModes.ADD);
    const glareB = this.add
      .ellipse(-38, -42, 78, 13, 0xffffff, 0.05)
      .setAngle(-28)
      .setBlendMode(Phaser.BlendModes.ADD);
    glass.add([glareA, glareB]);

    this.tweens.add({
      targets: [glareA, glareB],
      alpha: { from: 0.035, to: 0.095 },
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.crackFlash = this.add
      .circle(8, -4, 48, 0xdfefff, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    glass.add(this.crackFlash);

    const crack = this.add.container(0, 0).setAlpha(0);
    glass.add(crack);
    this.crack = crack;

    crack.add(this.add.circle(8, -2, 4, 0xffffff, 0.9).setBlendMode(Phaser.BlendModes.ADD));
    crack.add(this.add.image(10, 0, 'crack').setScale(1.08));
    crack.add(this.add.image(66, 62, 'crack').setScale(0.5).setAngle(22).setAlpha(0.8));
    crack.add(this.add.image(-64, 54, 'crack').setScale(0.44).setAngle(-34).setAlpha(0.7));
  }

  // ── the pilot ───────────────────────────────────────────────

  buildPilot() {
    this.pilot = this.world(
      this.add
        .image(PILOT.x, PILOT.y, 'astronaut-seated')
        .setScale(PILOT.scale)
        .setDepth(D.pilot)
    );

    this.tweens.add({
      targets: this.pilot,
      y: PILOT.y - 2,
      duration: 2700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ── the new control panel ───────────────────────────────────

  buildPanel() {
    const panel = this.add.container(0, 0).setDepth(D.panel);
    this.world(panel);
    this.panel = panel;

    const add = (child) => {
      panel.add(child);
      return child;
    };

    const g = add(this.add.graphics());

    // Screen labels share one small tilted mono style.
    const label = (x, y, text, color = '#6d88a6', size = '8px') =>
      add(
        this.add
          .text(x, y, text, { fontFamily: UI.mono, fontSize: size, color, letterSpacing: 2 })
          .setOrigin(0, 0.5)
          .setRotation(-0.052)
      );

    // Angled dashboard slab in front of the pilot.
    g.fillGradientStyle(0x1c283a, 0x16202f, 0x0b121d, 0x0d1622, 1);
    g.beginPath();
    g.moveTo(404, 524);
    g.lineTo(1128, 486);
    // The front face bleeds past the frame: zoomed-in shots (the wake-up on
    // the radio) must never expose bare backdrop under the dash.
    g.lineTo(1264, 980);
    g.lineTo(268, 980);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x3a4d68, 0.85);
    g.strokePath();

    // Raised rim.
    g.fillGradientStyle(0x2a3c55, 0x233349, 0x1a2739, 0x16202f, 1);
    g.beginPath();
    g.moveTo(404, 524);
    g.lineTo(1128, 486);
    g.lineTo(1128, 504);
    g.lineTo(404, 542);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, 0x4a6285, 0.5);
    g.strokePath();

    // Screen A · flight telemetry.
    g.fillStyle(0x071320, 1);
    g.beginPath();
    g.moveTo(432, 566);
    g.lineTo(652, 550);
    g.lineTo(664, 648);
    g.lineTo(444, 664);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x2b445e, 1);
    g.strokePath();

    g.lineStyle(1, 0x16324a, 0.75);
    for (let i = 1; i < 4; i += 1) {
      g.lineBetween(438, 566 + i * 19, 658, 554 + i * 19);
    }

    const wave = [
      [456, 620], [472, 620], [484, 604], [496, 636], [510, 614], [528, 624],
      [544, 606], [558, 630], [576, 612], [598, 618], [620, 604], [640, 610]
    ];
    g.lineStyle(2, 0x5fd6bb, 0.55);
    g.beginPath();
    g.moveTo(wave[0][0], wave[0][1]);
    for (let i = 1; i < wave.length; i += 1) {
      g.lineTo(wave[i][0], wave[i][1] - 6);
    }
    g.strokePath();

    // Screen B · systems.
    g.fillStyle(0x071320, 1);
    g.beginPath();
    g.moveTo(678, 546);
    g.lineTo(812, 536);
    g.lineTo(822, 628);
    g.lineTo(688, 640);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x2b445e, 1);
    g.strokePath();

    g.lineStyle(6, 0x7fd7e8, 0.5);
    g.lineBetween(698, 566, 806, 558);
    g.lineStyle(6, 0xf4b860, 0.45);
    g.lineBetween(700, 590, 780, 585);
    g.lineStyle(6, 0x8fe3c0, 0.45);
    g.lineBetween(702, 614, 792, 607);

    // Radio bay.
    g.fillStyle(0x0a121d, 1);
    g.beginPath();
    g.moveTo(838, 542);
    g.lineTo(996, 530);
    g.lineTo(1006, 620);
    g.lineTo(846, 632);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x33465e, 1);
    g.strokePath();
    g.fillStyle(0x050b12, 1);
    g.fillEllipse(926, 586, 92, 68);

    // Idle comms: a live carrier before the crash, silenced on impact.
    const idle = add(this.add.graphics());
    idle.lineStyle(1.6, 0x5fd6bb, 0.45);
    idle.beginPath();
    idle.moveTo(890, 588);
    idle.lineTo(898, 588);
    idle.lineTo(903, 578);
    idle.lineTo(909, 598);
    idle.lineTo(915, 584);
    idle.lineTo(923, 592);
    idle.lineTo(932, 584);
    idle.lineTo(940, 590);
    idle.lineTo(950, 586);
    idle.strokePath();
    idle.fillStyle(0x8fe3c0, 0.85);
    idle.fillCircle(856, 604, 3);
    idle.fillStyle(0x7fd7e8, 0.45);
    idle.fillCircle(866, 604, 2.2);
    this.radioIdle = idle;

    this.tweens.add({
      targets: idle,
      alpha: { from: 0.45, to: 1 },
      duration: 940,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Small status block on the empty right wing of the panel.
    label(1018, 552, 'SYSTEMS', '#6d88a6', '7px');
    const statusLamp = (x, y, color, alpha) => {
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, 3.2);
      g.lineStyle(1, 0x0a121d, 0.9);
      g.strokeCircle(x, y, 3.2);
    };
    statusLamp(1030, 574, 0x8fe3c0, 0.85);
    statusLamp(1060, 572, 0xf4b860, 0.8);
    statusLamp(1090, 570, 0x7fd7e8, 0.5);

    // Emergency button: the red lamp the pilot wakes up to.
    g.fillStyle(0x2b3d54, 1);
    g.fillCircle(1064, 636, 33);
    g.fillStyle(0x5c1f18, 1);
    g.fillCircle(1064, 636, 27);
    g.fillStyle(0xc03a2a, 1);
    g.fillCircle(1064, 636, 21);
    g.fillStyle(0xf2705a, 0.55);
    g.fillCircle(1057, 629, 8);

    // Rivets along the rim.
    g.fillStyle(0x536a88, 0.6);
    [440, 720, 1000, 1104].forEach((x) => {
      g.fillCircle(x, 524 - (x - 404) * 0.0525 + 9, 2.2);
    });

    // ── screen labels ──
    label(446, 582, 'FLIGHT');
    label(692, 560, 'SYS');
    this.commsLabel = label(854, 552, 'COMMS');

    // ── warning lamps ──
    const lampAt = (x, y, delayIndex) => {
      const glow = add(
        this.add
          .image(x, y, 'light-glow')
          .setDisplaySize(52, 52)
          .setTint(0xff3a24)
          .setAlpha(0)
          .setBlendMode(Phaser.BlendModes.ADD)
      );
      const lamp = add(this.add.circle(x, y, 5.5, 0xff4b34, 1).setAlpha(0));

      this.lamps.push(lamp);
      this.lampGlows.push(glow);
      return delayIndex;
    };

    // Base rings.
    g.fillStyle(0x3a1a16, 1);
    [[600, 526], [640, 524], [680, 522]].forEach(([x, y]) => g.fillCircle(x, y, 8));
    g.lineStyle(1.5, 0x5a2a22, 0.8);
    [[600, 526], [640, 524], [680, 522]].forEach(([x, y]) => g.strokeCircle(x, y, 8));

    lampAt(600, 526, 0);
    lampAt(640, 524, 1);
    lampAt(680, 522, 2);

    label(556, 516, 'ALARM', '#7c5f63', '7px');

    // ── radio-off state (revealed on waking) ──
    this.radioGlow = add(
      this.add
        .image(926, 584, 'light-glow')
        .setDisplaySize(150, 120)
        .setTint(0xff3a24)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
    );

    const radioScale = 58 / 64;
    this.radioIcon = add(
      this.add.image(926, 584, 'icon-radio-off').setScale(radioScale * 0.86).setAlpha(0)
    );

    this.radioStatus = add(
      this.add
        .text(942, 552, 'NO SIGNAL', {
          fontFamily: UI.mono,
          fontSize: '7px',
          color: UI.danger,
          letterSpacing: 2
        })
        .setOrigin(1, 0.5)
        .setRotation(-0.052)
        .setAlpha(0)
    );

    // ── button glow ──
    this.buttonGlow = add(
      this.add
        .image(1064, 636, 'light-glow')
        .setDisplaySize(150, 150)
        .setTint(0xff3a24)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
    );

    label(1064, 682, 'MAYDAY', '#8a4a44', '7px').setOrigin(0.5, 0.5).setRotation(0);

    // Cool dashboard sheen.
    add(
      this.add
        .image(770, 640, 'light-glow')
        .setDisplaySize(700, 520)
        .setTint(0x2c5a75)
        .setAlpha(0.07)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
  }

  // ── alarm state ─────────────────────────────────────────────

  setAlarm() {
    if (this.alarmOn) return;
    this.alarmOn = true;

    this.lamps.forEach((lamp, i) => {
      this.tweens.add({
        targets: lamp,
        alpha: 1,
        duration: 110,
        delay: i * 110,
        ease: 'Quad.easeOut'
      });
    });

    this.tweens.add({
      targets: this.lampGlows,
      alpha: { from: 0.18, to: 0.7 },
      duration: 720,
      delay: 340,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.alarmWash,
      alpha: { from: 0.035, to: 0.1 },
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.alarmHaze,
      alpha: { from: 0.08, to: 0.22 },
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.buttonGlow,
      alpha: { from: 0.22, to: 0.62 },
      duration: 880,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // ── stage 3 · Turbulence ────────────────────────────────────

  startTurbulence() {
    if (this.handedOff || this.phase !== 'cabin') return;
    this.phase = 'turbulence';

    this.shakeOn = true;
    this.turb.level = 0.06;

    this.tweens.add({
      targets: this.turb,
      level: 1,
      duration: 4200,
      ease: 'Sine.easeIn',
      onComplete: () => this.time.delayedCall(720, () => this.crashSequence())
    });

    this.time.delayedCall(900, () => this.clearCaption(320));
    this.time.delayedCall(1550, () => this.setAlarm());
  }

  crashSequence() {
    if (this.handedOff) return;
    this.phase = 'crash';

    this.tweens.killTweensOf(this.turb);
    this.turb.level = 2.4;

    this.sparks.explode(30, 792, 296);
    this.mainCam.flash(150, 255, 205, 180, false);

    this.time.delayedCall(240, () => {
      this.turb.level = 1.25;
      this.sparks.explode(14, 780, 280);
    });

    this.time.delayedCall(520, () => {
      this.revealCrack();
      this.mainCam.flash(110, 255, 255, 255, false);
    });

    this.time.delayedCall(1120, () => this.cutToImpact());
  }

  revealCrack() {
    this.crack.setAlpha(0).setScale(0.88);

    this.tweens.add({
      targets: this.crack,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Quad.easeOut'
    });

    this.crackFlash.setAlpha(0.85);
    this.tweens.add({
      targets: this.crackFlash,
      alpha: 0,
      duration: 560,
      ease: 'Quad.easeOut'
    });
  }

  /** Hard black, then the dust settles on the lunar surface. */
  cutToImpact() {
    if (this.handedOff) return;

    this.shakeOn = false;
    this.mainCam.setScroll(0, 0);
    this.tweens.killTweensOf(this.turb);
    this.turb.level = 0;

    this.tweens.killTweensOf(this.blackout);
    this.tweens.add({
      targets: this.blackout,
      alpha: 1,
      duration: 110,
      ease: 'Linear',
      onComplete: () => this.prepareImpact()
    });
  }

  prepareImpact() {
    if (this.handedOff) return;

    // While the screen is black: lunar surface, tilted horizon, dead ship.
    this.earthView.setVisible(false);
    this.moonView.setAlpha(1);
    this.view.setRotation(-0.24);
    this.mainCam.setRotation(-0.022);
    this.crack.setAlpha(1).setScale(1);
    this.dim.setAlpha(0.12);
    this.setAlarm();

    this.time.delayedCall(220, () => {
      this.tweens.add({
        targets: this.blackout,
        alpha: 0.45,
        duration: 320,
        ease: 'Sine.easeOut',
        onComplete: () => {
          // The fracture appears out of the dark.
          this.crack.setAlpha(0).setScale(0.82);
          this.revealCrack();

          this.shakeOn = true;
          this.turb.level = 0.5;
          this.sparks.explode(18, 800, 292);

          this.tweens.add({
            targets: this.turb,
            level: 0.06,
            duration: 1600,
            ease: 'Sine.easeOut'
          });

          this.time.delayedCall(1700, () => {
            this.shakeOn = false;
            this.mainCam.setScroll(0, 0);
            this.turb.level = 0;
          });
        }
      });
    });

    this.time.delayedCall(1180, () => {
      this.tweens.add({ targets: this.blackout, alpha: 0, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: this.dim, alpha: 0.06, duration: 900, ease: 'Sine.easeOut' });
    });

    this.time.delayedCall(2100, () => this.maydayLine());
  }

  maydayLine() {
    if (this.handedOff) return;
    this.phase = 'mayday';

    this.showCaption(LINE_MAYDAY, TYPE_SPEED.TIRED, () => {
      this.time.delayedCall(1500, () => this.closeEyes());
    });
  }

  // ── stage 4 · Blackout and waking up ────────────────────────

  closeEyes() {
    if (this.handedOff) return;
    this.phase = 'blink';

    this.clearCaption(340);
    this.tweens.killTweensOf(this.turb);
    this.turb.level = 0;
    this.shakeOn = false;
    this.mainCam.setScroll(0, 0);

    this.tweenLids(1, 1000, 'Sine.easeInOut', () => {
      this.time.delayedCall(700, () => this.prepareWake());
    });
  }

  prepareWake() {
    if (this.handedOff) return;

    // Camera looks at the dead radio, still under closed eyelids. Kept high
    // enough that the dash still fills the bottom of the frame.
    this.mainCam.setZoom(1.34);
    this.mainCam.centerOn(920, 566);

    this.dim.setAlpha(0.3);
    this.tweens.add({ targets: this.dim, alpha: 0.22, duration: 1200, ease: 'Sine.easeOut' });

    // The screen header hands over to the fault readout.
    this.tweens.add({ targets: this.commsLabel, alpha: 0, duration: 180, delay: 260 });

    // The radio is dead; the mayday lamp is still burning.
    this.tweens.add({
      targets: this.radioIcon,
      alpha: 1,
      scale: 58 / 64,
      duration: 240,
      delay: 320,
      ease: 'Quad.easeOut'
    });

    this.tweens.add({
      targets: this.radioGlow,
      alpha: { from: 0, to: 0.55 },
      duration: 520,
      delay: 430,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.tweens.add({
      targets: this.radioStatus,
      alpha: 1,
      duration: 260,
      delay: 520
    });

    this.time.delayedCall(900, () => this.openEyes());
  }

  openEyes() {
    if (this.handedOff) return;

    // Slow, heavy awakening: half-lidded, a sticky blink, then open.
    this.tweenLids(0.44, 780, 'Sine.easeOut', () => {
      this.tweenLids(0.2, 200, 'Sine.easeInOut', () => {
        this.tweenLids(0.44, 240, 'Sine.easeInOut', () => {
          this.tweenLids(0, 1050, 'Sine.easeInOut', () => this.radioLine());
        });
      });
    });
  }

  radioLine() {
    if (this.handedOff) return;
    this.phase = 'wake';

    this.mainCam.zoomTo(1.3, 2200, 'Sine.easeOut');

    this.showCaption(LINE_RADIO, TYPE_SPEED.TIRED, () => {
      this.time.delayedCall(1250, () => this.realize());
    });
  }

  /** The last beat: pull back, see the tilted lunar horizon, cut to gameplay. */
  realize() {
    if (this.handedOff) return;
    this.phase = 'out';

    this.mainCam.pan(GAME_WIDTH / 2, 400, 2000, 'Sine.easeInOut');
    this.mainCam.zoomTo(1, 2000, 'Sine.easeInOut');

    this.tweens.add({
      targets: this.dim,
      alpha: 0.04,
      duration: 1800,
      ease: 'Sine.easeOut'
    });

    this.tweens.add({
      targets: this.buttonGlow,
      alpha: 0.9,
      duration: 500,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(2100, () => {
      this.clearCaption(500);
      this.tweens.killTweensOf(this.blackout);
      this.tweens.add({
        targets: this.blackout,
        alpha: 1,
        duration: 950,
        ease: 'Sine.easeIn',
        onComplete: () => this.handOff()
      });
    });
  }

  // ── shared camera turbulence ────────────────────────────────

  update() {
    if (!this.shakeOn) return;

    const cam = this.mainCam;
    const level = this.turb.level;

    if (level <= 0.004) {
      cam.setScroll(0, 0);
      return;
    }

    const t = this.time.now;
    const amp = 1.5 + Math.min(level, 2.4) * 12;
    const freq = 0.008 + Math.min(level, 1.4) * 0.019;

    const ox = Math.sin(t * freq) * amp + Math.sin(t * freq * 2.63 + 1.7) * amp * 0.34;
    const oy = Math.sin(t * freq * 0.87 + 2.4) * amp * 0.9 + Math.sin(t * freq * 3.11 + 0.6) * amp * 0.26;

    cam.setScroll(ox, oy);
  }

  // ── exit ────────────────────────────────────────────────────

  handOff() {
    if (this.handedOff) return;
    this.handedOff = true;

    this.typewriter.stop();
    this.tweens.killAll();
    this.time.removeAllEvents();

    this.viewMaskShape?.destroy();
    this.glassMaskShape?.destroy();

    this.scene.start(SCENE_GAME);
  }
}
