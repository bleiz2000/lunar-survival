import Phaser from 'phaser';

/**
 * Shared typewriter driver. One write() per active text object; speed is
 * milliseconds per character, so drama can dial it from 11 ms (panic)
 * down to 54 ms (resigned silence). Pure timing class — knows nothing
 * about panels or narrative content.
 */
export class Typewriter {
  constructor(scene) {
    this.scene = scene;
    this.timer = null;
    this.target = null;
    this.fullText = '';
    this.shown = 0;
    this.onComplete = null;
  }

  start(target, text, speed, onComplete = null) {
    this.stop();

    this.target = target;
    this.fullText = text ?? '';
    this.shown = 0;
    this.onComplete = onComplete;

    target.setText('');

    if (this.fullText.length === 0) {
      this.stop();

      const callback = this.onComplete;
      this.onComplete = null;
      callback?.();

      return this;
    }

    const delay = Math.max(1, speed);

    this.timer = this.scene.time.addEvent({
      delay,
      repeat: this.fullText.length - 1,
      callback: () => {
        this.shown += 1;
        this.target.setText(this.fullText.slice(0, this.shown));

        if (this.shown >= this.fullText.length) {
          this.complete();
        }
      }
    });

    return this;
  }

  get finished() {
    return this.shown >= this.fullText.length;
  }

  get typing() {
    return this.timer !== null && !this.finished;
  }

  /**
   * Fire the completion callback once, exactly once.
   * The last typed character must trigger this or downstream story
   * beats (clocks, follow-up lines, auto-close) would never run.
   */
  complete() {
    this.stop();

    const callback = this.onComplete;
    this.onComplete = null;
    callback?.();
  }

  /** Reveal the whole text instantly and fire the completion callback. */
  skip() {
    if (this.timer === null) return true;

    this.stop();
    this.shown = this.fullText.length;
    this.target?.setText(this.fullText);

    this.complete();
    return true;
  }

  stop() {
    if (this.timer) {
      this.timer.remove();
      this.timer = null;
    }
  }
}
