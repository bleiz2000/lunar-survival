import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GAME_BACKGROUND } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: GAME_BACKGROUND,
  parent: 'game',
  scene: [BootScene]
};

new Phaser.Game(config);
