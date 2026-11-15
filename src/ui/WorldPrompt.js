import Phaser from 'phaser';
import { INTERACT_KEY, UI } from '../game/constants.js';

/**
 * Floating "[E] action" tag pinned right above the interacted object in
 * world space — it rides the camera with the object instead of sitting in
 * a corner HUD. Rendering only: position and text arrive via show()/hide()
 * from the interaction system.
 */
export class WorldPrompt {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.sprite = null;
    this.pulse = null;
  }

  get isActive() {
    return this.container !== null;
  }

  /** Sprite top edge in world coordinates (any origin). */
  static promptTop(sprite) {
    return sprite.y - (sprite.displayHeight || 40) * (sprite.originY ?? 0.5);
  }

  show({ key, label, prompt, sprite }) {
    this.destroyContainer();

    const scene = this.scene;
    this.sprite = sprite ?? null;

    const keyText = scene.add.text(0, 0, key || INTERACT_KEY, {
      fontFamily: UI.mono,
      fontSize: '11px',
      color: UI.accent,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const badge = scene.add.graphics();
    badge.fillStyle(0x141d2e, 0.92);
    badge.lineStyle(1, UI.accentHex, 0.9);
    badge.fillRoundedRect(0, 0, 24, 24, 6);
    badge.strokeRoundedRect(0, 0, 24, 24, 6);
    badge.setPosition(-24, 0);

    keyText.setPosition(-12, 12);

    const promptText = scene.add.text(0, 4, prompt || 'Interact', {
      fontFamily: UI.font,
      fontSize: '12px',
      color: UI.textBright,
      fontWeight: '600'
    }).setOrigin(0, 0.5);

    const labelText = scene.add.text(0, -12, (label || '').toUpperCase(), {
      fontFamily: UI.mono,
      fontSize: '8px',
      color: UI.muted,
      letterSpacing: 1.6
    }).setOrigin(0, 0.5);

    promptText.setPosition(8, 12);
    labelText.setPosition(8, 0);

    const tagW = 8 + 24 + 10 + promptText.width + 8;
    const tagH = 30;

    const panel = scene.add.graphics();
    panel.fillStyle(0x0f1626, 0.9);
    panel.lineStyle(1, UI.border, 0.85);
    panel.fillRoundedRect(0, -6, tagW, tagH, 8);
    panel.strokeRoundedRect(0, -6, tagW, tagH, 8);

    this.container = scene.add.container(0, 0, [
      panel,
      badge,
      keyText,
      labelText,
      promptText
    ]).setDepth(64);

    this.positionAtSprite();
    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: this.container.y + 6,
      duration: 140,
      ease: 'Quad.easeOut'
    });

    this.pulse = scene.tweens.add({
      targets: keyText,
      alpha: { from: 0.55, to: 1 },
      duration: 640,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  positionAtSprite() {
    if (!this.container || !this.sprite) return;
    this.container.setPosition(
      this.sprite.x,
      WorldPrompt.promptTop(this.sprite) - 22
    );
  }

  /** Keep the tag glued to the object if the artwork moves (ship tilts). */
  update() {
    if (!this.isActive) return;
    if (this.sprite && !this.sprite.active) {
      this.hide();
      return;
    }
    this.positionAtSprite();
  }

  hide() {
    if (!this.isActive) return;

    const container = this.container;
    this.container = null;
    this.sprite = null;

    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 110,
      onComplete: () => container.destroy()
    });
  }

  destroyContainer() {
    this.pulse?.remove();
    this.pulse = null;

    if (this.container) {
      this.scene.tweens.killTweensOf(this.container);
      this.container.destroy();
      this.container = null;
    }

    this.sprite = null;
  }

  destroy() {
    this.destroyContainer();
  }
}
