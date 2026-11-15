import Phaser from 'phaser';
import { UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';

const TRACK_WIDTH = 116;
const TRACK_HEIGHT = 8;

/**
 * In-world progress bar that takes the place of the [E] tag above the
 * object while a timed world action runs. Blocking by design: emits MODAL
 * open/close so movement freezes exactly like before — but the overlay is
 * a small tag at the object, not a full-screen card.
 *
 * Contract: show({id,label,duration,x,y}) → ACTION_END {id} on completion,
 * so the composition root keeps paging effects off the bus.
 */
export class WorldAction {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.fill = null;
    this.labelText = null;
    this.fillTween = null;
    this.currentId = null;
    this.blink = null;
  }

  get isActive() {
    return this.container !== null;
  }

  show({ id, label, duration, x, y }) {
    if (this.isActive) return;

    this.currentId = id;
    bus.emit(EVENTS.MODAL, { open: true });

    const scene = this.scene;

    this.labelText = scene.add.text(0, -14, label ?? 'WORKING…', {
      fontFamily: UI.font,
      fontSize: '11px',
      color: UI.textBright,
      fontStyle: 'bold',
      letterSpacing: 1
    }).setOrigin(0.5, 0.5);

    const bracketLeft = scene.add.text(0, 0, '[', {
      fontFamily: UI.mono,
      fontSize: '13px',
      color: UI.muted
    }).setOrigin(1, 0.5);

    const bracketRight = scene.add.text(0, 0, ']', {
      fontFamily: UI.mono,
      fontSize: '13px',
      color: UI.muted
    }).setOrigin(0, 0.5);

    const track = scene.add.graphics();
    track.fillStyle(0x18202e, 0.95);
    track.lineStyle(1, UI.border, 0.9);
    track.fillRoundedRect(-TRACK_WIDTH / 2, -TRACK_HEIGHT / 2, TRACK_WIDTH, TRACK_HEIGHT, 4);
    track.strokeRoundedRect(-TRACK_WIDTH / 2, -TRACK_HEIGHT / 2, TRACK_WIDTH, TRACK_HEIGHT, 4);

    this.fill = scene.add
      .rectangle(
        -TRACK_WIDTH / 2 + 1,
        0,
        TRACK_WIDTH - 2,
        TRACK_HEIGHT - 2,
        UI.accentHex,
        0.95
      )
      .setOrigin(0, 0.5)
      .setScale(0, 1);

    bracketLeft.setX(-TRACK_WIDTH / 2 - 3);
    bracketRight.setX(TRACK_WIDTH / 2 + 3);

    this.container = scene.add.container(x, y, [
      this.labelText,
      bracketLeft,
      track,
      this.fill,
      bracketRight
    ]).setDepth(65);

    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 120,
      ease: 'Quad.easeOut'
    });

    this.blink = scene.tweens.add({
      targets: this.labelText,
      alpha: { from: 0.7, to: 1 },
      duration: 480,
      yoyo: true,
      repeat: -1
    });

    const runMs = Math.max(200, duration ?? 1500);

    this.fillTween = scene.tweens.add({
      targets: this.fill,
      scaleX: { from: 0, to: 1 },
      duration: runMs,
      ease: 'Linear',
      onComplete: () => {
        // Capture the id before close() nulls it — the ACTION_END payload
        // tells the composition root which world change to apply.
        const finished = this.currentId;
        this.close();
        bus.emit(EVENTS.ACTION_END, { id: finished });
      }
    });
  }

  close() {
    this.fillTween?.remove();
    this.fillTween = null;
    this.blink?.remove();
    this.blink = null;

    const container = this.container;
    this.container = null;
    this.labelText = null;
    this.fill = null;
    this.currentId = null;

    if (container) {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 120,
        onComplete: () => container.destroy()
      });
    }

    bus.emit(EVENTS.MODAL, { open: false });
  }

  destroy() {
    if (this.isActive) {
      bus.emit(EVENTS.MODAL, { open: false });
    }

    this.fillTween?.remove();
    this.blink?.remove();
    this.container?.destroy();
    this.container = null;
  }
}
