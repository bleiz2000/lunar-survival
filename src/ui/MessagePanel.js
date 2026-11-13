import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel } from './Panel.js';
import { UiButton } from './UiButton.js';

const CARD_WIDTH = 680;
const CARD_HEIGHT = 340;
const TYPE_DELAY = 14;

/**
 * Modal "incoming transmission" card with a typewriter reveal.
 * UI only: it reports open/close through the bus, the quest reacts.
 */
export class MessagePanel {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.container = null;
    this.charTimer = null;
    this.fullText = '';
    this.shown = 0;
  }

  show(payload) {
    if (this.isOpen) return;

    this.isOpen = true;
    this.fullText = payload.body ?? '';
    this.shown = 0;

    bus.emit(EVENTS.MODAL, { open: true });
    this.build(payload);
    this.startTyping();

    this.scene.cameras.main.flash(160, 60, 90, 120);
  }

  build(payload) {
    const scene = this.scene;
    const container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(900);

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070d, 0.62)
      .setInteractive();

    const panel = new Panel(scene, 0, 0, CARD_WIDTH, CARD_HEIGHT, {
      fill: UI.panelDeep,
      alpha: 0.98,
      border: UI.border,
      borderAlpha: 1,
      radius: 12
    });

    const earth = scene.add.image(-296, -140, 'earth').setDisplaySize(30, 30);

    const title = scene.add.text(-272, -150, payload.title ?? 'Incoming transmission', {
      fontFamily: UI.font,
      fontSize: '11px',
      color: UI.accent,
      letterSpacing: 2.4
    });

    const sender = scene.add.text(-272, -132, payload.sender ?? 'UNKNOWN', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.muted,
      letterSpacing: 1
    });

    const signals = [-1, 0, 1].map((index) => scene.add
      .rectangle(286 + index * 8, -134, 4, 8 + index * 4, UI.successHex, 0.85)
      .setOrigin(0.5, 0.5));

    const divider = scene.add.rectangle(0, -112, CARD_WIDTH - 60, 1, UI.borderSoft, 0.9);

    this.body = scene.add.text(-300, -90, '', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.text,
      lineSpacing: 7,
      wordWrap: { width: 600 }
    });

    const signature = scene.add.text(300, 92, payload.signature ?? '', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.faint,
      letterSpacing: 1
    }).setOrigin(1, 0);

    const button = new UiButton(scene, 0, 132, 'CONTINUE', () => this.advance(), {
      width: 170,
      height: 38,
      primary: true,
      fontSize: 12
    });

    container.add([dim, panel, earth, title, sender, ...signals, divider, this.body, signature, button]);
    this.container = container;

    // Slow pulse on the signal bars keeps the card alive.
    this.signalTween = scene.tweens.add({
      targets: signals,
      alpha: { from: 0.35, to: 1 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      stagger: 120,
      ease: 'Sine.easeInOut'
    });

    container.setAlpha(0);
    container.setScale(0.985);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Quad.easeOut'
    });
  }

  startTyping() {
    this.body.setText('');

    this.charTimer = this.scene.time.addEvent({
      delay: TYPE_DELAY,
      repeat: Math.max(0, this.fullText.length - 1),
      callback: () => {
        this.shown = Math.min(this.shown + 1, this.fullText.length);
        this.renderTyped();
      }
    });
  }

  renderTyped() {
    this.body.setText(this.fullText.slice(0, this.shown));
  }

  revealAll() {
    this.charTimer?.remove();
    this.charTimer = null;
    this.shown = this.fullText.length;
    this.body.setText(this.fullText);
  }

  /** First input finishes the reveal, the next one closes the card. */
  advance() {
    if (!this.isOpen) return;

    if (this.shown < this.fullText.length) {
      this.revealAll();
      return;
    }

    this.close();
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.charTimer?.remove();
    this.charTimer = null;
    this.signalTween?.remove();

    const container = this.container;
    this.container = null;

    if (container) {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 140,
        onComplete: () => container.destroy()
      });
    }

    bus.emit(EVENTS.MODAL, { open: false });
    bus.emit(EVENTS.TRANSMISSION_CLOSED);
  }
}
