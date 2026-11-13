import Phaser from 'phaser';
import { UI } from '../game/constants.js';

/**
 * One thing in the world the player can walk up to and activate.
 * Holds the object's interaction metadata only; the reaction is a callback
 * supplied by whoever created it. UI never talks to this class directly.
 */
export class Interactable {
  constructor(scene, config) {
    this.scene = scene;
    this.id = config.id;
    this.sprite = config.sprite;
    this.label = config.label ?? '';
    this.radius = config.radius ?? 80;
    this.onInteract = config.onInteract ?? null;

    this._prompt = config.prompt ?? 'Interact';
    this.enabled = true;
    this.highlighted = false;
    this.ring = null;
    this.ringTween = null;
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  getPromptText() {
    return typeof this._prompt === 'function' ? this._prompt() : this._prompt;
  }

  setPrompt(prompt) {
    this._prompt = prompt;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.setHighlight(false);
  }

  inRange(astronaut) {
    return Phaser.Math.Distance.Between(this.x, this.y, astronaut.x, astronaut.y) <= this.radius;
  }

  trigger() {
    if (this.enabled) this.onInteract?.(this);
  }

  createRing() {
    const width = this.sprite.displayWidth * 0.92;
    const height = width * 0.4;

    this.ring = this.scene.add
      .ellipse(
        this.x,
        this.y + this.sprite.displayHeight * 0.26,
        width,
        height
      )
      .setFillStyle()
      .setStrokeStyle(2, UI.accentHex, 0.85)
      .setDepth(4);
  }

  setHighlight(on) {
    if (on === this.highlighted) return;
    this.highlighted = on;

    if (on) {
      if (!this.ring) this.createRing();
      this.ring.setVisible(true).setAlpha(0.9).setScale(1);

      this.ringTween = this.scene.tweens.add({
        targets: this.ring,
        alpha: 0.3,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.sprite.setTint(0xfff1d8);
      return;
    }

    this.ringTween?.remove();
    this.ringTween = null;
    this.ring?.setVisible(false);
    this.sprite.clearTint();
  }

  destroy() {
    this.ringTween?.remove();
    this.ring?.destroy();
    this.ring = null;
  }
}
