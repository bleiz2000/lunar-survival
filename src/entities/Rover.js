import Phaser from 'phaser';
import { Interactable } from '../entities/Interactable.js';
import { ROVER_OFFSET, ROVER_RADIUS, UI } from '../game/constants.js';

// Footprint of the chassis in the 156x108 artwork, relative to the
// ground-anchored sprite origin (0.5, 0.86).
const BODY_CENTER = { x: 0, y: -30 };
const SOLID_SIZE = { width: 116, height: 46 };
const BEACON_OFFSET = { x: 41, y: -67 };

// The rover is larger than the other field props, so it keeps a wider clearance
// from boulders, crates and the hull.
const SOLID_PADDING = 66;
const SEARCH_RADII = [0, 48, 96, 144, 192, 240, 288];
const SEARCH_DIRECTIONS = 10;

/**
 * The abandoned survey rover: the first P1 field objective after the
 * prologue. It sits on the north-east route marked by Earth, listing in the
 * regolith with a flat battery. Visuals + one interactable + a chassis
 * collider only — discovery, power-up and feedback are owned by GameScene.
 */
export class Rover {
  constructor(scene, lander, solids, handlers = {}) {
    this.scene = scene;
    this.handlers = handlers;
    this.point = this.findSpot(lander, solids);

    this.solids = [];
    this.interactables = [];
    this.tweens = [];

    this.build();
  }

  // ── placement ──────────────────────────────────────────────

  /** Keep the chassis footprint clear of every static collider. */
  isBlocked(x, y, solids) {
    return solids.some((solid) => {
      const bounds = solid.getBounds?.();
      if (!bounds) return false;

      const dx = Math.max(bounds.left - x, 0, x - bounds.right);
      const dy = Math.max(bounds.top - y, 0, y - bounds.bottom);

      return Math.hypot(dx, dy) < SOLID_PADDING;
    });
  }

  /**
   * Deterministic fallback search around the intended spot, so a seeded
   * boulder can never bury the quest object or make it unreachable.
   */
  findSpot(lander, solids) {
    const base = { x: lander.x + ROVER_OFFSET.x, y: lander.y + ROVER_OFFSET.y };

    for (const radius of SEARCH_RADII) {
      for (let i = 0; i < SEARCH_DIRECTIONS; i++) {
        const angle = (i / SEARCH_DIRECTIONS) * Math.PI * 2;
        const x = base.x + Math.cos(angle) * radius;
        const y = base.y + Math.sin(angle) * radius;

        if (!this.isBlocked(x, y, solids)) return { x, y };
      }
    }

    return base;
  }

  // ── construction ───────────────────────────────────────────

  build() {
    const scene = this.scene;
    const { x, y } = this.point;

    this.sprite = scene.add
      .image(x, y, 'rover-derelict')
      .setOrigin(0.5, 0.86)
      .setDepth(6);

    this.beacon = scene.add
      .circle(x + BEACON_OFFSET.x, y + BEACON_OFFSET.y, 4.5, 0xe0a24e)
      .setStrokeStyle(1.5, 0x141b26, 0.9)
      .setDepth(8);

    // The dead beacon still blinks — a weak call for attention.
    this.blink = scene.tweens.add({
      targets: this.beacon,
      alpha: { from: 0.25, to: 0.9 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.interactable = new Interactable(scene, {
      id: 'survey-rover',
      sprite: this.sprite,
      label: 'SURVEY ROVER',
      radius: ROVER_RADIUS,
      prompt: 'Inspect the rover',
      onInteract: () => this.handlers.onInspect?.()
    });
    this.interactable.setEnabled(false);

    const body = scene.add.zone(
      x + BODY_CENTER.x,
      y + BODY_CENTER.y,
      SOLID_SIZE.width,
      SOLID_SIZE.height
    );
    scene.physics.add.existing(body, true);

    this.solids.push(body);
    this.interactables.push(this.interactable);
  }

  // ── quest hooks ────────────────────────────────────────────

  /** A short scan pulse when the player first inspects the unit. */
  scanPing() {
    const ring = this.scene.add
      .ellipse(this.point.x, this.point.y + BODY_CENTER.y, 150, 58)
      .setStrokeStyle(2, UI.earthHex, 0.9)
      .setDepth(5);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 1.55,
      scaleY: 1.55,
      alpha: 0,
      duration: 680,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  /** Battery bridged: panels light up, the beacon turns teal and steady. */
  powerUp() {
    const scene = this.scene;

    this.sprite.setTexture('rover-powered');

    this.blink?.remove();
    this.blink = null;

    this.beacon
      .setFillStyle(UI.successHex, 1)
      .setStrokeStyle(1.5, 0xd9fff1, 0.9)
      .setAlpha(1);

    this.glow = scene.add
      .image(this.point.x, this.point.y + BODY_CENTER.y, 'light-glow')
      .setTint(UI.successHex)
      .setScale(0.5)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3);

    scene.tweens.add({
      targets: this.glow,
      alpha: 0.26,
      duration: 520,
      ease: 'Quad.easeOut'
    });

    scene.tweens.add({
      targets: this.sprite,
      scaleX: { from: 1.05, to: 1 },
      scaleY: { from: 1.05, to: 1 },
      duration: 380,
      ease: 'Back.easeOut'
    });

    scene.tweens.add({
      targets: this.beacon,
      scale: { from: 1.5, to: 1 },
      duration: 420,
      ease: 'Back.easeOut'
    });

    this.interactable.setHighlight(false);
    this.interactable.setEnabled(false);
  }

  destroy() {
    this.blink?.remove();
    this.blink = null;

    this.interactable?.destroy();
    this.sprite?.destroy();
    this.beacon?.destroy();
    this.glow?.destroy();
    this.solids.forEach((solid) => solid.destroy());
    this.solids = [];
    this.interactables = [];
  }
}
