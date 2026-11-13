import Phaser from 'phaser';
import { SCENE_BOOT, SCENE_PRELOAD } from '../game/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_BOOT);
  }

  create() {
    this.scene.start(SCENE_PRELOAD);
  }
}
