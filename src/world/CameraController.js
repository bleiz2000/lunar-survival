import { CAMERA_ZOOM, CAMERA_FOLLOW_LERP } from '../game/constants.js';

/**
 * Makes the camera smoothly follow the astronaut without leaving the world.
 */
export class CameraController {
  constructor(scene, astronaut, worldWidth, worldHeight) {
    this.scene = scene;
    this.astronaut = astronaut;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  start() {
    const camera = this.scene.cameras.main;

    camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    camera.setZoom(CAMERA_ZOOM);
    camera.setRoundPixels(true);
    camera.startFollow(
      this.astronaut.sprite,
      true,
      CAMERA_FOLLOW_LERP,
      CAMERA_FOLLOW_LERP
    );
  }
}
