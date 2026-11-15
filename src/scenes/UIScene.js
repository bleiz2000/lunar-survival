import Phaser from 'phaser';
import { SCENE_UI, SCENE_GAME, GAME_WIDTH, UI } from '../game/constants.js';
import { EVENTS, bus } from '../game/events.js';
import { HUD } from '../ui/HUD.js';
import { InventoryPanel } from '../ui/InventoryPanel.js';
import { DialoguePanel } from '../ui/DialoguePanel.js';
import { DiagnosticsPanel } from '../ui/DiagnosticsPanel.js';
import { TerminalPanel } from '../ui/TerminalPanel.js';
import { DebugOverlay } from '../ui/DebugOverlay.js';

/**
 * Parallel overlay scene: HUD, cargo, radio, diagnostics, terminal.
 * Its camera never zooms or scrolls, so the interface stays stable at
 * any gameplay zoom level.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_UI);
  }

  init(data) {
    this.state = data.state;
    this.initialObjective = data.objective ?? null;
    this.initialInventory = data.inventory ?? [];
  }

  create() {
    this.scene.bringToTop();

    this.hud = new HUD(this, this.state, this.initialObjective);
    this.inventoryPanel = new InventoryPanel(this, this.initialInventory);
    this.dialogue = new DialoguePanel(this);
    this.diagnostics = new DiagnosticsPanel(this);
    this.terminal = new TerminalPanel(this);
    this.debug = new DebugOverlay(this, this.scene.get(SCENE_GAME));

    this.bindInput();
    this.showIntro();

    this.events.once('shutdown', () => this.cleanup());
  }

  bindInput() {
    const keyboard = this.input.keyboard;

    // WorldAction (in-game progress bar) is not a HUD modal, but it still
    // blocks keys while running — track the shared MODAL state for that.
    this.busy = false;
    this.onModalState = ({ open }) => { this.busy = open; };
    bus.on(EVENTS.MODAL, this.onModalState);

    keyboard.addCapture(['TAB']);

    keyboard.on('keydown-TAB', () => {
      if (this.keysLocked()) return;
      this.inventoryPanel.toggle();
    });

    keyboard.on('keydown-I', () => {
      if (this.keysLocked()) return;
      this.inventoryPanel.toggle();
    });

    keyboard.on('keydown-ENTER', () => this.handleAdvance());
    keyboard.on('keydown-SPACE', () => this.handleAdvance());
    keyboard.on('keydown-ESC', () => this.handleEscape());
  }

  /** Open panels or a running world action block hotkeys. */
  keysLocked() {
    return this.modalOpen() || this.busy;
  }

  /** Coolest modal above the stack (one modal at a time by design). */
  modalOpen() {
    return this.dialogue?.isOpen
      || this.diagnostics?.isOpen
      || this.terminal?.isOpen
      || this.inventoryPanel?.isOpen;
  }

  handleAdvance() {
    if (this.dialogue?.isOpen) {
      this.dialogue.advance();
      return;
    }

    if (this.diagnostics?.isOpen) {
      this.diagnostics.close();
      return;
    }

    if (this.terminal?.isOpen) {
      this.terminal.close();
    }
  }

  handleEscape() {
    if (this.dialogue?.isOpen) {
      this.dialogue.close();
      return;
    }

    if (this.diagnostics?.isOpen) {
      this.diagnostics.close();
      return;
    }

    if (this.terminal?.isOpen) {
      this.terminal.close();
      return;
    }

    if (this.inventoryPanel?.isOpen) {
      this.inventoryPanel.close();
      return;
    }

    bus.emit(EVENTS.MENU_REQUEST);
  }

  showIntro() {
    const title = this.add.text(GAME_WIDTH / 2, 236, 'MARE INSULAE', {
      fontFamily: UI.font,
      fontSize: '26px',
      color: UI.textBright,
      letterSpacing: 9
    }).setOrigin(0.5).setDepth(800).setAlpha(0);

    title.setShadow(0, 3, '#0a0e17', 12, false, true);

    const subtitle = this.add.text(GAME_WIDTH / 2, 270, 'DAY 1  ·  EMERGENCY LANDING', {
      fontFamily: UI.mono,
      fontSize: '9px',
      color: '#b9c4d6',
      backgroundColor: '#0b1120b0',
      padding: { x: 8, y: 4 },
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(800).setAlpha(0);

    this.tweens.add({ targets: [title, subtitle], alpha: 1, duration: 520 });

    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: [title, subtitle],
        alpha: 0,
        duration: 620,
        onComplete: () => {
          title.destroy();
          subtitle.destroy();
        }
      });
    });
  }

  cleanup() {
    bus.off(EVENTS.MODAL, this.onModalState);

    this.dialogue?.destroy();
    this.diagnostics?.destroy();
    this.terminal?.destroy();
    this.debug?.destroy();

    this.hud?.destroy();
    this.inventoryPanel?.destroy();

    // Leave no stuck input-freeze if a modal was left dangling.
    bus.emit(EVENTS.MODAL, { open: false });
  }

  update() {
    this.debug.update();
  }
}
