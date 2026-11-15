import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, TYPE_SPEED } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel } from './Panel.js';
import { UiButton } from './UiButton.js';
import { Typewriter } from './typewriter.js';

const CARD_WIDTH = 720;
const CARD_HEIGHT = 560;

/**
 * End-of-prologue ship terminal: map packet plus a short text log.
 * Assembled from TERMINAL_DATA; closes with TERMINAL_CLOSED.
 */
export class TerminalPanel {
  constructor(scene) {
    this.scene = scene;
    this.typewriter = new Typewriter(scene);

    this.isOpen = false;
    this.container = null;

    this.onTerminal = (payload) => this.show(payload);
    bus.on(EVENTS.TERMINAL, this.onTerminal);
  }

  show(payload) {
    if (this.isOpen) return;

    this.isOpen = true;
    bus.emit(EVENTS.MODAL, { open: true });
    this.build(payload);
  }

  build(payload) {
    const scene = this.scene;

    this.container = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(900);

    const dim = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070d, 0.72)
      .setInteractive();

    const panel = new Panel(scene, 0, 0, CARD_WIDTH, CARD_HEIGHT, {
      fill: UI.panelDeep,
      alpha: 0.98,
      border: UI.border,
      borderAlpha: 1,
      radius: 12,
      accent: UI.successHex
    });

    const title = scene.add.text(-CARD_WIDTH / 2 + 56, -242, payload.title ?? 'SHIP TERMINAL', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.textBright,
      letterSpacing: 3
    });

    const subtitle = scene.add.text(-CARD_WIDTH / 2 + 56, -222, payload.subtitle ?? '', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.success,
      letterSpacing: 1
    });

    const divider = scene.add.rectangle(0, -196, CARD_WIDTH - 112, 1, UI.borderSoft, 0.9);

    const map = scene.add
      .image(0, -66, 'terminal-map')
      .setDisplaySize(415, 240)
      .setAlpha(0.98);

    const chatter = scene.add.text(-CARD_WIDTH / 2 + 72, 72, '', {
      fontFamily: UI.mono,
      fontSize: '11px',
      color: '#8FD4EC',
      letterSpacing: 1,
      lineSpacing: 4
    });

    const footerChip = scene.add.rectangle(-CARD_WIDTH / 2 + 62, 200, 4, 30, UI.successHex);

    const footer = scene.add.text(-CARD_WIDTH / 2 + 80, 188, '', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.textBright,
      fontStyle: 'bold',
      wordWrap: { width: 540 }
    });

    const hint = scene.add.text(0, 256, 'ENTER  CLOSE      ESC  CLOSE', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.faint,
      letterSpacing: 2
    }).setOrigin(0.5);

    const button = new UiButton(scene, CARD_WIDTH / 2 - 112, 222, 'CLOSE', () => this.close(), {
      width: 160,
      height: 36,
      primary: true,
      fontSize: 11
    });

    this.container.add([
      dim, panel, title, subtitle, divider, map,
      chatter, footerChip, footer, hint, button
    ]);

    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut'
    });

    // Terminal chatter first (phosphor green, fast), then the footer card.
    const chatterText = (payload.lines ?? []).join('\n');

    this.typewriter.start(chatter, chatterText, TYPE_SPEED.EXCITED, () => {
      if (!this.isOpen) return;
      this.typewriter.start(footer, payload.footer ?? '', TYPE_SPEED.REPORT);
    });
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.typewriter.stop();

    const container = this.container;
    this.container = null;

    if (container) {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 120,
        onComplete: () => container.destroy()
      });
    }

    bus.emit(EVENTS.MODAL, { open: false });
    bus.emit(EVENTS.TERMINAL_CLOSED);
  }

  destroy() {
    bus.off(EVENTS.TERMINAL, this.onTerminal);
    this.close();

    this.typewriter?.stop();
  }
}
