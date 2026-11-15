import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, TYPE_SPEED } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel } from './Panel.js';
import { UiButton } from './UiButton.js';
import { Typewriter } from './typewriter.js';

const CARD_WIDTH = 660;
const CARD_HEIGHT = 400;
const SIGNAL_LIVE = 'LIVE';
const AUTO_CLOSE_MS = 1000;

/**
 * Voice + speed in one place: the radio drama reads tone, not words.
 */
const TONES = {
  earth: { name: 'MISSION CONTROL', color: UI.earth, bar: UI.earthHex },
  player: { name: 'COMMANDER', color: UI.accent, bar: UI.accentHex },
  system: { name: 'RADIO', color: UI.muted, bar: 0x6f7f95 }
};

/**
 * Modal radio conversation. Opened through EVENTS.DIALOGUE with a shape
 * from src/data/dialogue.js. ENTER/SPACE advance the typing or the
 * conversation, ESC closes. UI only — the close event carries the
 * dialogue id and quests react to it.
 */
export class DialoguePanel {
  constructor(scene) {
    this.scene = scene;
    this.typewriter = new Typewriter(scene);

    this.isOpen = false;
    this.container = null;
    this.dialogue = null;
    this.lineIndex = 0;
    this.lines = [];
    this.isFinalLine = false;
    this.closeTimer = null;
    this.signalTween = null;

    this.onDialogue = (payload) => this.show(payload);
    bus.on(EVENTS.DIALOGUE, this.onDialogue);
  }

  get signal() {
    return this.dialogue?.signal ?? SIGNAL_LIVE;
  }

  show(dialogue) {
    if (this.isOpen) return;

    this.isOpen = true;
    this.dialogue = dialogue;
    this.lines = dialogue?.lines ?? [];
    this.lineIndex = 0;

    bus.emit(EVENTS.MODAL, { open: true });
    this.build();
    this.renderLine(0);
  }

  build() {
    const scene = this.scene;

    this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(900);

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070d, 0.66)
      .setInteractive();

    const panel = new Panel(scene, 0, 0, CARD_WIDTH, CARD_HEIGHT, {
      fill: UI.panelDeep,
      alpha: 0.98,
      border: UI.border,
      borderAlpha: 1,
      radius: 12
    });

    const iconKey = this.signal === SIGNAL_LIVE ? 'earth' : 'icon-radio-off';
    const headIcon = scene.add.image(-274, -152, iconKey).setDisplaySize(32, 32);

    this.titleText = scene.add.text(-236, -166, this.dialogue?.title ?? 'TRANSMISSION', {
      fontFamily: UI.font,
      fontSize: '13px',
      color: UI.textBright,
      letterSpacing: 2.6
    });

    this.signalLabel = scene.add
      .text(CARD_WIDTH / 2 - 30, -166, this.signal, {
        fontFamily: UI.mono,
        fontSize: '12px',
        color: this.signal === SIGNAL_LIVE ? UI.success : UI.danger,
        letterSpacing: 2
      })
      .setOrigin(1, 0);

    this.signalBars = [-1, 0, 1].map((index) => scene.add
      .rectangle(CARD_WIDTH / 2 - 26 + index * 9, -158, 4, 10 + index * 5, UI.successHex, 0.9)
      .setOrigin(0.5, 0.5));

    this.signalDot = scene.add
      .circle(CARD_WIDTH / 2 - 34, -152, 6, UI.dangerHex)
      .setVisible(false);

    const divider = scene.add.rectangle(0, -126, CARD_WIDTH - 64, 1, UI.borderSoft, 0.9);

    this.speakerBar = scene.add
      .rectangle(-CARD_WIDTH / 2 + 46, -86, 4, 26, UI.earthHex)
      .setOrigin(0.5, 0.5);

    this.speakerChip = scene.add.text(-226, -94, '', {
      fontFamily: UI.mono,
      fontSize: '12px',
      color: UI.earth,
      letterSpacing: 2.4
    });

    this.body = scene.add.text(-226, -58, '', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.text,
      lineSpacing: 8,
      wordWrap: { width: 452 }
    });

    this.hint = scene.add.text(0, CARD_HEIGHT / 2 - 42, '', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.faint,
      letterSpacing: 2
    }).setOrigin(0.5, 0);

    this.button = new UiButton(scene, 0, CARD_HEIGHT / 2 - 68, 'CONTINUE', () => this.advance(), {
      width: 190,
      height: 40,
      primary: true,
      fontSize: 12
    });

    this.container.add([
      dim, panel, headIcon, this.titleText, this.signalLabel,
      ...this.signalBars, this.signalDot, divider,
      this.speakerBar, this.speakerChip, this.body, this.hint, this.button
    ]);

    if (this.signal === SIGNAL_LIVE) {
      this.signalBars.forEach((bar) => bar.setVisible(true));
      this.signalDot.setVisible(false);

      this.signalTween = scene.tweens.add({
        targets: this.signalBars,
        alpha: { from: 0.35, to: 1 },
        duration: 620,
        yoyo: true,
        repeat: -1,
        stagger: 130,
        ease: 'Sine.easeInOut'
      });
    } else {
      this.signalLabel.setText(this.signal);
      this.signalBars.forEach((bar) => bar.setVisible(false));
      this.signalDot.setVisible(true);

      this.signalTween = scene.tweens.add({
        targets: this.signalDot,
        scale: { from: 0.85, to: 1.25 },
        alpha: { from: 0.6, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.container.setAlpha(0);
    this.container.setScale(0.985);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Quad.easeOut'
    });
  }

  renderLine(index) {
    const line = this.lines[index];
    if (!line) return;

    this.lineIndex = index;
    this.isFinalLine = index === this.lines.length - 1;

    const tone = TONES[line.tone] ?? TONES.system;
    const speaker = line.speaker ?? tone.name;

    this.speakerBar.setFillStyle(tone.bar, 1);
    this.speakerChip.setText(speaker);
    this.speakerChip.setColor(tone.color);

    this.hint.setText(this.isFinalLine ? 'ENTER  CLOSE      ESC  CLOSE' : 'ENTER  CONTINUE');
    this.button.setText(this.isFinalLine ? 'CLOSE' : 'CONTINUE');

    this.typewriter.start(this.body, line.text, line.speed ?? TYPE_SPEED.CALM, () => {
      if (this.isOpen && this.shouldAutoClose()) {
        this.closeTimer = this.scene.time.delayedCall(AUTO_CLOSE_MS, () => this.close());
      }
    });
  }

  /** Silent, single-line transmissions (the failed attempts) close themselves. */
  shouldAutoClose() {
    return this.lines.length === 1 && this.signal !== SIGNAL_LIVE;
  }

  /** ENTER / SPACE / click: finish typing, then advance the conversation. */
  advance() {
    if (!this.isOpen) return;

    if (this.typewriter.typing) {
      this.typewriter.skip();
      return;
    }

    if (this.isFinalLine) {
      this.close();
      return;
    }

    this.renderLine(this.lineIndex + 1);
  }

  close() {
    if (!this.isOpen) return;

    const id = this.dialogue?.id ?? null;

    this.teardown();
    bus.emit(EVENTS.MODAL, { open: false });
    bus.emit(EVENTS.DIALOGUE_CLOSED, { id });
  }

  teardown() {
    this.isOpen = false;

    this.typewriter.stop();
    this.closeTimer?.remove();
    this.closeTimer = null;
    this.signalTween?.remove();
    this.signalTween = null;

    const container = this.container;
    this.container = null;
    this.dialogue = null;
    this.lineIndex = 0;
    this.lines = [];

    if (container) {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 120,
        onComplete: () => container.destroy()
      });
    }
  }

  destroy() {
    bus.off(EVENTS.DIALOGUE, this.onDialogue);
    this.teardown();
  }
}
