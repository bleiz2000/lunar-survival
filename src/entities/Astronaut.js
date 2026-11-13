import Phaser from 'phaser';
import {
  ASTRONAUT_SPEED,
  ASTRONAUT_BODY_SIZE,
  ASTRONAUT_BODY_OFFSET
} from '../game/constants.js';

const DIRECTION_TEXTURE = {
  south: 'astronaut-south',
  north: 'astronaut-north',
  east: 'astronaut-east'
};

const SHADOW_OFFSET_Y = 19;
const STEP_INTERVAL = 210;

/**
 * The player character. Owns its sprite, physics body and presentation.
 * Movement *rules* live in systems/MovementSystem.js; this class only holds
 * state and visuals.
 */
export class Astronaut {
  constructor(scene, x, y) {
    this.scene = scene;
    this.facing = 'south';
    this.moving = false;
    this.walkTime = 0;
    this.nextStep = 0;

    this.sprite = scene.physics.add.sprite(x, y, DIRECTION_TEXTURE.south);
    this.sprite.setDepth(10);
    this.sprite.body.setSize(ASTRONAUT_BODY_SIZE, ASTRONAUT_BODY_SIZE);
    this.sprite.body.setOffset(ASTRONAUT_BODY_OFFSET.x, ASTRONAUT_BODY_OFFSET.y);
    this.sprite.body.setCollideWorldBounds(true);

    this.shadow = scene.add
      .ellipse(x, y + SHADOW_OFFSET_Y, 26, 10, 0x0b0e14, 0.18)
      .setDepth(9);

    this.dust = scene.add.particles(0, 0, 'dust-puff', {
      lifespan: { min: 320, max: 520 },
      speed: { min: 8, max: 30 },
      scale: { start: 0.18, end: 0.6 },
      alpha: { start: 0.4, end: 0 },
      tint: 0xd8d2e4,
      quantity: 1,
      frequency: -1,
      emitting: false
    }).setDepth(9);
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  get speed() {
    return ASTRONAUT_SPEED;
  }

  setDirection(facing) {
    if (this.facing === facing) return;

    this.facing = facing;
    const flip = facing === 'west';
    this.sprite.setTexture(flip ? DIRECTION_TEXTURE.east : DIRECTION_TEXTURE[facing]);
    this.sprite.setFlipX(flip);

    // Re-apply the body: swapping textures must never move the collider.
    this.sprite.body.setSize(ASTRONAUT_BODY_SIZE, ASTRONAUT_BODY_SIZE);
    this.sprite.body.setOffset(ASTRONAUT_BODY_OFFSET.x, ASTRONAUT_BODY_OFFSET.y);
  }

  /** Called every frame by MovementSystem with the desired velocity. */
  setMoving(moving, velocityX = 0, velocityY = 0) {
    if (moving) {
      if (Math.abs(velocityX) > Math.abs(velocityY)) {
        this.setDirection(velocityX < 0 ? 'west' : 'east');
      } else if (velocityY !== 0) {
        this.setDirection(velocityY < 0 ? 'north' : 'south');
      }
    }

    if (!moving && this.moving) {
      this.walkTime = 0;
      this.nextStep = 0;
    }

    this.moving = moving;
  }

  update(delta) {
    this.shadow.setPosition(this.sprite.x, this.sprite.y + SHADOW_OFFSET_Y);

    if (!this.moving) {
      this.sprite.setAngle(Phaser.Math.Linear(this.sprite.angle, 0, 0.2));
      return;
    }

    this.walkTime += delta;

    // Gentle sway reads as a walk step without distorting the physics body.
    this.sprite.setAngle(Math.sin(this.walkTime / 120) * 3.5);

    if (this.walkTime >= this.nextStep) {
      this.nextStep = this.walkTime + STEP_INTERVAL;
      this.dust.emitParticleAt(
        this.sprite.x + Phaser.Math.Between(-4, 4),
        this.sprite.y + 16,
        1
      );
    }
  }
}
