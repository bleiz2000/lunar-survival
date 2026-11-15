import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, UI, TYPE_SPEED } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { Panel } from './Panel.js';
import { UiButton } from './UiButton.js';
import { Typewriter } from './typewriter.js';

const CARD_WIDTH = 560;
const CARD_HEIGHT = 430;

const STATES = {
  ok: { hex: UI.successHex, label: 'OK' },
  warn: { hex: UI.accentHex, label: 'WARN' },
  bad: { hex: UI.dangerHex, label: 'BAD' }
};

/**
 * Orange "status lamps" console: one row per subsystem with a lamp colour
 * driven by the payload shape built in src/data/dialogue.js.
 * ENTER/ESC/ESC-button close it; quest reacts to DIAGNOSTICS_CLOSED.
 */
export class DiagnosticsPanel {
  constructor(scene) {
    this.scene = scene;
    this.typewriter = new Typewriter(scene);

    this.isOpen = false;
    this.container = null;
    this.lampTweens = [];

    this.onDiagnostics = (payload) => this.show(payload);
    bus.on(EVENTS.DIAGNOSTICS, this.onDiagnostics);
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
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070d, 0.66)
      .setInteractive();

    const panel = new Panel(scene, 0, 0, CARD_WIDTH, CARD_HEIGHT, {
      fill: UI.panelDeep,
      alpha: 0.98,
      border: UI.border,
      borderAlpha: 1,
      radius: 12,
      accent: UI.dangerHex
    });

    this.titleText = scene.add.text(-CARD_WIDTH / 2 + 42, -178, payload.title ?? 'DIAGNOSTICS', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.textBright,
      letterSpacing: 3
    });

    this.subtitleText = scene.add.text(-CARD_WIDTH / 2 + 42, -158, payload.subtitle ?? '', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.muted,
      letterSpacing: 1
    });

    this.statusChip = scene.add
      .text(CARD_WIDTH / 2 - 42, -170, 'SCANNING…', {
        fontFamily: UI.mono,
        fontSize: '11px',
        color: UI.danger,
        letterSpacing: 2
      })
      .setOrigin(1, 0);

    const divider = scene.add.rectangle(0, -132, CARD_WIDTH - 84, 1, UI.borderSoft, 0.9);

    this.rowGroup = scene.add.container(0, 0);
    this.container.add([
      dim, panel, this.titleText, this.subtitleText, this.statusChip, divider, this.rowGroup
    ]);

    const rows = payload.rows ?? [];

    rows.forEach((row, index) => {
      const y = -92 + index * 58;
      const state = STATES[row.state] ?? STATES.ok;

      const body = scene.add.rectangle(-CARD_WIDTH / 2 + 48, y + 6, 236, 44, 0x141c2a, 0.9)
        .setStrokeStyle(1, UI.borderSoft, 0.85);

      const lamp = scene.add.circle(-CARD_WIDTH / 2 + 62, y + 6, 11, state.hex).setStrokeStyle(2, 0x0b0e14, 1);

      const iconKey = row.icon ?? 'icon-engine';
      const icon = scene.add
        .image(-CARD_WIDTH / 2 + 88, y + 6, iconKey)
        .setDisplaySize(24, 24);

      const label = scene.add.text(-CARD_WIDTH / 2 + 110, y - 4, row.label ?? '', {
        fontFamily: UI.mono,
        fontSize: '11px',
        color: UI.textBright,
        letterSpacing: 1.5
      });

      const valueText = scene.add.text(CARD_WIDTH / 2 - 62, y - 4, row.value ?? '', {
        fontFamily: UI.mono,
        fontSize: '11px',
        color: UI.text,
        letterSpacing: 1
      }).setOrigin(1, 0);

      const stateText = scene.add.text(CARD_WIDTH / 2 - 62, y + 14, state.label, {
        fontFamily: UI.mono,
        fontSize: '9px',
        color: state.hex === UI.accentHex ? UI.accent : (state.hex === UI.dangerHex ? UI.danger : UI.success),
        letterSpacing: 1.5
      }).setOrigin(1, 0);

      this.rowGroup.add([body, lamp, icon, label, valueText, stateText]);

      if (row.state === 'bad') {
        this.lampTweens.push(scene.tweens.add({
          targets: lamp,
          alpha: { from: 0.55, to: 1 },
          scale: { from: 0.92, to: 1.12 },
          duration: 560,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        }));
      }
    });

    // The alarm line is always authored at PANIC speed — 11 ms/char — so the
  // engine readout lands hard, exactly like the crash telemetry.
    this.messageChip = scene.add.rectangle(-CARD_WIDTH / 2 + 54, 148, 4, 30, UI.dangerHex);

    this.message = scene.add.text(-CARD_WIDTH / 2 + 72, 132, '', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.danger,
      fontStyle: 'bold',
      lineSpacing: 6,
      wordWrap: { width: 380 }
    });

    const hint = scene.add.text(0, 188, 'ENTER  CLOSE      ESC  CLOSE', {
      fontFamily: UI.mono,
      fontSize: '10px',
      color: UI.faint,
      letterSpacing: 2
    }).setOrigin(0.5);

    const button = new UiButton(scene, CARD_WIDTH / 2 - 96, 174, 'CLOSE', () => this.close(), {
      width: 130,
      height: 36,
      primary: true,
      fontSize: 11
    });

    this.container.add([this.messageChip, this.message, hint, button]);

    this.container.setAlpha(0);
    scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 160,
      ease: 'Quad.easeOut'
    });

    // Lamps survey first, then the alarm speaks.
    this.statusChip.setText('FAULT DETECTED');

    scene.time.delayedCall(240, () => {
      if (!this.isOpen) return;
      this.typewriter.start(this.message, payload.message ?? '', TYPE_SPEED.PANIC);
    });
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.typewriter.stop();
    this.lampTweens.forEach((tween) => tween.remove());
    this.lampTweens = [];

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
    bus.emit(EVENTS.DIAGNOSTICS_CLOSED);
  }

  destroy() {
    bus.off(EVENTS.DIAGNOSTICS, this.onDiagnostics);
    if (this.isOpen) {
      this.close();
    }

    this.typewriter?.stop();
    this.container?.destroy();
    this.container = null;
  }
}
