import Phaser from 'phaser';
import { SCENE_PRELOAD, SCENE_MAIN_MENU, UI } from '../game/constants.js';
import { loadImageAssets } from '../game/assets.js';

/**
 * Loads every SVG asset once, before any gameplay scene runs.
 * This is why no scene ever generates runtime canvas textures
 * (and why scene restarts can no longer collide on texture keys).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_PRELOAD);
  }

  preload() {
    this.buildLoadingScreen();
    loadImageAssets(this.load);

    this.load.on('progress', (value) => {
      this.bar.scaleX = value;
      this.percent.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('loaderror', (file) => {
      console.error(`[Preload] failed to load ${file.key}`, file.src);
    });
  }

  buildLoadingScreen() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0a0e17');

    this.add.text(width / 2, height / 2 - 54, 'LUNAR', {
      fontFamily: UI.font,
      fontSize: '46px',
      color: UI.textBright,
      letterSpacing: 12
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 12, 'SURVIVAL PROTOCOL', {
      fontFamily: UI.font,
      fontSize: '12px',
      color: UI.muted,
      letterSpacing: 6
    }).setOrigin(0.5);

    const trackWidth = 240;
    this.add.rectangle(width / 2, height / 2 + 30, trackWidth, 3, 0x22304a).setOrigin(0.5);

    this.bar = this.add.rectangle(width / 2 - trackWidth / 2, height / 2 + 30, trackWidth, 3, UI.accentHex)
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    this.percent = this.add.text(width / 2, height / 2 + 52, '0%', {
      fontFamily: UI.mono,
      fontSize: '11px',
      color: UI.faint
    }).setOrigin(0.5);
  }

  create() {
    this.scene.start(SCENE_MAIN_MENU);
  }
}
