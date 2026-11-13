import Phaser from 'phaser';
import { UI } from '../game/constants.js';

/**
 * Rounded translucent panel used by every piece of UI.
 * Position is the *center* of the panel (container origin).
 */
export class Panel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, height, options = {}) {
    super(scene, x, y);

    const {
      fill = UI.panel,
      alpha = UI.panelAlpha,
      border = UI.border,
      borderAlpha = 0.85,
      radius = 10,
      shadow = true,
      accent = null
    } = options;

    this.panelWidth = width;
    this.panelHeight = height;

    const g = scene.add.graphics();

    if (shadow) {
      g.fillStyle(0x04070d, 0.28);
      g.fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, radius);
    }

    g.fillStyle(fill, alpha);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    g.lineStyle(1, border, borderAlpha);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);

    if (accent !== null) {
      g.fillStyle(accent, 0.9);
      g.fillRoundedRect(-width / 2 + 12, -height / 2 - 1, width - 24, 2, 1);
    }

    this.add(g);
    scene.add.existing(this);
  }
}

/** Panel positioned by its top-left corner instead of its center. */
export function panelAt(scene, left, top, width, height, options) {
  return new Panel(scene, left + width / 2, top + height / 2, width, height, options);
}
