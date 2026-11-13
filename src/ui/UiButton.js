import Phaser from 'phaser';
import { UI } from '../game/constants.js';

/**
 * Menu button with hover / press feedback. Pure presentation:
 * the click handler is supplied by the scene.
 */
export class UiButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, onClick, options = {}) {
    super(scene, x, y);

    const {
      width = 300,
      height = 54,
      primary = false,
      disabled = false,
      fontSize = 17
    } = options;

    this.label = label;
    this.clickHandler = onClick;
    this.isDisabled = disabled;

    this.background = scene.add.rectangle(0, 0, width, height, primary ? 0x1b2434 : 0x131b29, 0.92)
      .setStrokeStyle(1, primary ? UI.accentHex : UI.borderSoft, primary ? 0.75 : 0.9);

    this.marker = scene.add.rectangle(-width / 2 + 2, 0, 3, height - 16, UI.accentHex, 0.9)
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    this.text = scene.add.text(0, 0, label, {
      fontFamily: UI.font,
      fontSize: `${fontSize}px`,
      color: disabled ? UI.faint : (primary ? UI.textBright : UI.text),
      letterSpacing: 3
    }).setOrigin(0.5);

    this.add([this.background, this.marker, this.text]);
    this.setSize(width, height);

    if (disabled) {
      this.setAlpha(0.5);
    } else {
      this.setInteractive({ useHandCursor: true });
      this.bindEvents();
    }

    scene.add.existing(this);
  }

  bindEvents() {
    this.on('pointerover', () => this.setHover(true));
    this.on('pointerout', () => this.setHover(false));
    this.on('pointerdown', () => {
      this.background.setFillStyle(0x24304a, 0.95);
      this.scene.tweens.add({ targets: this.text, y: 1, duration: 60, yoyo: true });
    });
    this.on('pointerup', () => {
      if (this.isDisabled) return;
      this.clickHandler?.(this);
    });
  }

  setHover(hover) {
    if (this.isDisabled) return;

    this.scene.tweens.killTweensOf([this.background, this.marker, this.text]);

    this.scene.tweens.add({
      targets: this.background,
      fillAlpha: hover ? 1 : 0.92,
      duration: 120
    });

    this.background.setFillStyle(hover ? 0x1e2a3d : 0x131b29, 0.92);
    this.background.setStrokeStyle(1, hover ? UI.accentHex : UI.borderSoft, hover ? 1 : 0.9);

    this.text.setColor(hover ? UI.textBright : UI.text);

    this.scene.tweens.add({
      targets: this.marker,
      scaleX: hover ? 1 : 0,
      duration: 140,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: this.text,
      x: hover ? 6 : 0,
      duration: 140,
      ease: 'Quad.easeOut'
    });
  }

  setDisabled(disabled) {
    this.isDisabled = disabled;
    this.setAlpha(disabled ? 0.5 : 1);
    this.text.setColor(disabled ? UI.faint : UI.text);

    if (disabled) {
      this.disableInteractive();
    } else {
      this.setInteractive({ useHandCursor: true });
    }
  }
}
