import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GAME_BACKGROUND
} from './game/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: GAME_BACKGROUND,
  parent: 'game',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, MainMenuScene, IntroScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

// Debug handle for manual console inspection in development builds only.
if (import.meta.env.DEV) {
  window.game = game;
}
