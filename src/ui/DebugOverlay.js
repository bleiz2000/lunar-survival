import Phaser from 'phaser';
import { UI } from '../game/constants.js';

/**
 * Development readout, drawn inside UIScene so it is immune to the gameplay
 * camera zoom. F3 toggles it; hidden by default in the polished build.
 */
export class DebugOverlay {
  constructor(scene, gameScene) {
    this.scene = scene;
    this.gameScene = gameScene;
    this.enabled = false;

    this.text = scene.add.text(1264, 700, '', {
      fontFamily: UI.mono,
      fontSize: '11px',
      color: '#7ee787',
      backgroundColor: '#04070dcc',
      padding: { x: 8, y: 6 },
      lineSpacing: 3
    }).setOrigin(1, 1).setDepth(1200).setVisible(false);

    this.key = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
    scene.input.keyboard.addCapture('F3');
  }

  toggle() {
    this.enabled = !this.enabled;
    this.text.setVisible(this.enabled);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.key)) this.toggle();
    if (!this.enabled) return;

    const gameScene = this.gameScene;
    const astronaut = gameScene?.astronaut;

    if (!astronaut) {
      this.text.setText('waiting for GameScene…');
      return;
    }

    const velocity = astronaut.sprite.body.velocity;
    const camera = gameScene.cameras.main;

    this.text.setText([
      `FPS   ${Math.round(this.scene.game.loop.actualFps)}`,
      `PLAYER ${astronaut.x.toFixed(0)}, ${astronaut.y.toFixed(0)}`,
      `VEL    ${velocity.x.toFixed(0)}, ${velocity.y.toFixed(0)}`,
      `CAM    ${camera.scrollX.toFixed(0)}, ${camera.scrollY.toFixed(0)}`,
      `ZOOM   ${camera.zoom.toFixed(2)}`,
      `UI     zoom ${this.scene.cameras.main.zoom.toFixed(2)}`
    ].join('\n'));
  }
}
