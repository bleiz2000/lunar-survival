import Phaser from 'phaser';

/**
 * Translates player input into astronaut velocity.
 * Owns the movement rules; scenes and entities stay free of input logic.
 * Can be disabled (e.g. while a transmission modal is open).
 */
export class MovementSystem {
  constructor(scene, astronaut) {
    this.astronaut = astronaut;
    this.enabled = true;

    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
    this.cursors = scene.input.keyboard.createCursorKeys();
  }

  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;

    if (!enabled) {
      this.astronaut.sprite.body.setVelocity(0, 0);
      this.astronaut.setMoving(false, 0, 0);
    }
  }

  update() {
    if (!this.enabled) return;

    const { keys, cursors } = this;
    const body = this.astronaut.sprite.body;

    let dirX = 0;
    let dirY = 0;

    if (cursors.left.isDown || keys.A.isDown) dirX -= 1;
    if (cursors.right.isDown || keys.D.isDown) dirX += 1;
    if (cursors.up.isDown || keys.W.isDown) dirY -= 1;
    if (cursors.down.isDown || keys.S.isDown) dirY += 1;

    if (dirX === 0 && dirY === 0) {
      body.setVelocity(0, 0);
      this.astronaut.setMoving(false, 0, 0);
      return;
    }

    // Normalize so diagonal movement is not faster.
    const length = Math.hypot(dirX, dirY);
    const speed = this.astronaut.speed;
    const velocityX = (dirX / length) * speed;
    const velocityY = (dirY / length) * speed;

    body.setVelocity(velocityX, velocityY);
    this.astronaut.setMoving(true, velocityX, velocityY);
  }
}
